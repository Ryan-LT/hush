import { Hono, type Context } from 'hono'
import { deleteCookie, getSignedCookie, setSignedCookie } from 'hono/cookie'
import { createMiddleware } from 'hono/factory'
import { defaultSettings } from '../src/shared/defaults'
import { DAY_MS, isValidTimeZone } from '../src/shared/time'
import type { CalendarInfo } from '../src/shared/types'
import { encrypt, randomId } from './crypto'
import { getUser, settingsOf, type AccountRow } from './db'
import { emailFromIdToken, exchangeCode, googleAuthUrl, listCalendars } from './google'
import { DEMO_TOKEN, slack, SLACK_USER_SCOPES } from './slack'
import { evaluate, loadInput, refreshAccount } from './sync'
import type { AppEnv } from './types'

const SESSION_COOKIE = 'hush_session'
const STATE_COOKIE = 'hush_oauth'
const SESSION_DAYS = 30

const secure = (c: Context<AppEnv>) => c.env.APP_URL.startsWith('https://')

async function startSession(c: Context<AppEnv>, userId: string) {
  await setSignedCookie(c, SESSION_COOKIE, `${userId}|${Date.now()}`, c.env.SESSION_SECRET, {
    path: '/',
    httpOnly: true,
    secure: secure(c),
    sameSite: 'Lax',
    maxAge: SESSION_DAYS * 86_400,
  })
}

async function sessionUser(c: Context<AppEnv>) {
  const value = await getSignedCookie(c, c.env.SESSION_SECRET, SESSION_COOKIE)
  const [userId, issued] = value ? value.split('|') : []
  const issuedAt = Number(issued)
  if (!userId || !(Date.now() - issuedAt < SESSION_DAYS * DAY_MS)) return null
  // Reject sessions from before the last sign-out, or for an account that was deleted and re-created
  const row = await c.env.DB.prepare('SELECT created_at, sessions_valid_after FROM users WHERE id = ?')
    .bind(userId)
    .first<{ created_at: number; sessions_valid_after: number }>()
  if (!row || issuedAt < row.created_at || issuedAt < row.sessions_valid_after) return null
  return userId
}

export const requireUser = createMiddleware<AppEnv>(async (c, next) => {
  const userId = await sessionUser(c)
  if (!userId) return c.json({ error: 'unauthorized' }, 401)
  c.set('userId', userId)
  await next()
})

async function newOAuthState(c: Context<AppEnv>) {
  const state = randomId()
  await setSignedCookie(c, STATE_COOKIE, state, c.env.SESSION_SECRET, { path: '/auth', httpOnly: true, secure: secure(c), sameSite: 'Lax', maxAge: 600 })
  return state
}

async function checkOAuthState(c: Context<AppEnv>) {
  const expected = await getSignedCookie(c, c.env.SESSION_SECRET, STATE_COOKIE)
  deleteCookie(c, STATE_COOKIE, { path: '/auth' })
  const state = c.req.query('state')
  return Boolean(expected && state && state === expected)
}

interface SlackProfile {
  teamId: string
  teamName: string
  userId: string
  name: string
  avatarUrl: string
  timezone: string
  token: string
}

/** Create the user, or refresh their token and profile if they already exist. */
async function upsertUser(env: Env, p: SlackProfile) {
  const id = `${p.teamId}:${p.userId}`
  const now = Date.now()
  const tokenEnc = await encrypt(p.token, env.TOKEN_KEY)
  const existing = await getUser(env.DB, id)
  if (!existing) {
    const settings = defaultSettings(isValidTimeZone(p.timezone) ? p.timezone : 'UTC')
    await env.DB.prepare(
      `INSERT INTO users (id, slack_team_id, slack_user_id, team_name, name, avatar_url, token_enc, settings_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(id, p.teamId, p.userId, p.teamName, p.name, p.avatarUrl, tokenEnc, JSON.stringify(settings), now, now)
      .run()
  } else {
    // Reconnecting after Slack revoked access turns autopilot back on with a fresh push
    const reconnect = existing.last_error === 'slack_disconnected'
    await env.DB.prepare(
      `UPDATE users SET team_name = ?, name = ?, avatar_url = ?, token_enc = ?, updated_at = ?
       ${reconnect ? ', paused = 0, last_error = NULL, applied_json = NULL, next_check_at = NULL' : ''} WHERE id = ?`,
    )
      .bind(p.teamName, p.name, p.avatarUrl, tokenEnc, now, id)
      .run()
  }
  return id
}

export const auth = new Hono<AppEnv>()

/** Deployment check: is each piece configured? Reports booleans only, never values. */
auth.get('/health', async (c) => {
  const db = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM users').first<{ n: number }>().then(() => true, () => false)
  return c.json({
    db,
    sessionSecret: Boolean(c.env.SESSION_SECRET),
    tokenKey: Boolean(c.env.TOKEN_KEY),
    slack: Boolean(c.env.SLACK_CLIENT_ID && c.env.SLACK_CLIENT_SECRET),
    google: Boolean(c.env.GOOGLE_CLIENT_ID && c.env.GOOGLE_CLIENT_SECRET),
    appUrl: c.env.APP_URL,
  })
})

auth.get('/config', (c) => c.json({ demo: c.env.DEV_LOGIN === '1' && !secure(c), googleCalendar: Boolean(c.env.GOOGLE_CLIENT_ID) }))

auth.get('/slack', async (c) => {
  const url = new URL('https://slack.com/oauth/v2/authorize')
  // ?emoji=1 also asks to read the workspace's custom emoji for the picker (optional scope)
  const scopes = c.req.query('emoji') ? [...SLACK_USER_SCOPES, 'emoji:read'] : SLACK_USER_SCOPES
  url.search = new URLSearchParams({
    client_id: c.env.SLACK_CLIENT_ID,
    user_scope: scopes.join(','),
    redirect_uri: `${c.env.APP_URL}/auth/slack/callback`,
    state: await newOAuthState(c),
  }).toString()
  return c.redirect(url.toString())
})

auth.get('/slack/callback', async (c) => {
  if (c.req.query('error')) return c.redirect(`/?error=${encodeURIComponent(c.req.query('error')!)}`)
  if (!(await checkOAuthState(c))) return c.redirect('/?error=invalid_state')

  type OAuth = { team: { id: string; name: string }; authed_user: { id: string; access_token: string } }
  type Info = { user: { tz?: string; real_name?: string; profile: { display_name?: string; real_name?: string; image_192?: string } } }
  const oauth = await slack<OAuth>('oauth.v2.access', {
    client_id: c.env.SLACK_CLIENT_ID,
    client_secret: c.env.SLACK_CLIENT_SECRET,
    code: c.req.query('code') ?? '',
    redirect_uri: `${c.env.APP_URL}/auth/slack/callback`,
  })
  const token = oauth.authed_user.access_token
  const { user } = await slack<Info>('users.info', { user: oauth.authed_user.id }, token)
  const id = await upsertUser(c.env, {
    teamId: oauth.team.id,
    teamName: oauth.team.name,
    userId: oauth.authed_user.id,
    name: user.profile.display_name || user.profile.real_name || user.real_name || 'You',
    avatarUrl: user.profile.image_192 ?? '',
    timezone: user.tz ?? 'UTC',
    token,
  })
  await startSession(c, id)
  return c.redirect('/app')
})

/** Local sandbox: a fake Slack user whose pushes are simulated, with a demo calendar. */
auth.get('/demo', async (c) => {
  // One shared sandbox identity: local development only
  if (c.env.DEV_LOGIN !== '1' || secure(c)) return c.notFound()
  const tz = c.req.query('tz') ?? 'UTC'
  const id = await upsertUser(c.env, {
    teamId: 'TDEMO',
    teamName: 'Acme Inc.',
    userId: 'UDEMO',
    name: 'Alex Rivera',
    avatarUrl: '',
    timezone: tz,
    token: DEMO_TOKEN,
  })
  const now = Date.now()
  await c.env.DB.prepare(
    `INSERT INTO calendar_accounts (id, user_id, provider, email, refresh_token_enc, calendars_json, created_at)
     VALUES (?, ?, 'demo', 'alex@acme.dev', '', ?, ?) ON CONFLICT (user_id, provider, email) DO NOTHING`,
  )
    .bind(randomId(), id, JSON.stringify([{ id: 'primary', name: 'Work', color: '#3b82f6', primary: true, selected: true } satisfies CalendarInfo]), now)
    .run()
  await startSession(c, id)
  return c.redirect('/app')
})

/** Signs out every device, since sessions are stateless cookies. */
auth.post('/logout', async (c) => {
  const userId = await sessionUser(c)
  if (userId) await c.env.DB.prepare('UPDATE users SET sessions_valid_after = ? WHERE id = ?').bind(Date.now(), userId).run()
  deleteCookie(c, SESSION_COOKIE, { path: '/' })
  return c.body(null, 204)
})

auth.get('/google', requireUser, async (c) => {
  if (!c.env.GOOGLE_CLIENT_ID) return c.redirect('/app?error=google_not_configured')
  if (c.get('userId').startsWith('TDEMO:')) return c.redirect('/app?error=demo_no_google')
  return c.redirect(googleAuthUrl(c.env, await newOAuthState(c)))
})

auth.get('/google/callback', requireUser, async (c) => {
  if (c.req.query('error')) return c.redirect(`/app?error=${encodeURIComponent(c.req.query('error')!)}`)
  if (!(await checkOAuthState(c))) return c.redirect('/app?error=invalid_state')
  const tokens = await exchangeCode(c.env, c.req.query('code') ?? '')
  if (!tokens.refresh_token) return c.redirect('/app?error=google_no_refresh_token')

  const userId = c.get('userId')
  const user = await getUser(c.env.DB, userId)
  if (!user) return c.redirect('/')
  const now = Date.now()
  const email = tokens.id_token ? emailFromIdToken(tokens.id_token) : 'Google account'
  const calendars = await listCalendars(tokens.access_token)
  await c.env.DB.prepare(
    `INSERT INTO calendar_accounts (id, user_id, provider, email, refresh_token_enc, access_token_enc, access_expires_at, calendars_json, created_at)
     VALUES (?, ?, 'google', ?, ?, ?, ?, ?, ?)
     ON CONFLICT (user_id, provider, email) DO UPDATE SET refresh_token_enc = excluded.refresh_token_enc,
       access_token_enc = excluded.access_token_enc, access_expires_at = excluded.access_expires_at, error = NULL`,
  )
    .bind(
      randomId(),
      userId,
      email,
      await encrypt(tokens.refresh_token, c.env.TOKEN_KEY),
      await encrypt(tokens.access_token, c.env.TOKEN_KEY),
      now + tokens.expires_in * 1000,
      JSON.stringify(calendars),
      now,
    )
    .run()

  const account = await c.env.DB.prepare('SELECT * FROM calendar_accounts WHERE user_id = ? AND provider = ? AND email = ?')
    .bind(userId, 'google', email)
    .first<AccountRow>()
  if (account) await refreshAccount(c.env, account, now, settingsOf(user).timezone)
  if (!user.paused) await evaluate(c.env, user, await loadInput(c.env, user, now), now, { force: true })
  return c.redirect('/app?connected=google')
})
