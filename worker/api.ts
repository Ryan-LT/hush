import { Hono, type Context } from 'hono'
import { deleteCookie } from 'hono/cookie'
import { HTTPException } from 'hono/http-exception'
import type { MeResponse } from '../src/shared/types'
import { parseOverride, parseSettings, ValidationError } from '../src/shared/validate'
import { requireUser } from './auth'
import { decrypt, randomId } from './crypto'
import { appliedOf, calendarsOf, eventsOf, getAccounts, getActivity, getOverrides, getUser, logActivity, settingsOf, toAccount, type AccountRow, type UserRow } from './db'
import { revokeGoogleToken } from './google'
import { clearSlack, DEMO_TOKEN, slack, SlackError } from './slack'
import { CALENDAR_TTL_MS, evaluate, loadInput, MAX_SELECTED_CALENDARS, refreshAccount } from './sync'
import type { AppEnv } from './types'

export const api = new Hono<AppEnv>()

const MAX_OVERRIDES = 50

api.use('*', requireUser)

// Cookies are SameSite=Lax; also reject cross-origin writes outright
api.use('*', async (c, next) => {
  const origin = c.req.header('Origin')
  if (c.req.method !== 'GET' && origin) {
    const host = c.req.header('X-Forwarded-Host') ?? c.req.header('Host')
    if (origin !== new URL(c.env.APP_URL).origin && new URL(origin).host !== host) return c.json({ error: 'forbidden' }, 403)
  }
  await next()
})

async function currentUser(c: Context<AppEnv>): Promise<UserRow> {
  const user = await getUser(c.env.DB, c.get('userId'))
  if (!user) throw new HTTPException(401, { message: 'unauthorized' })
  return user
}

/** Re-evaluate and push now (after the user changed something). */
async function syncNow(env: Env, userId: string) {
  const user = await getUser(env.DB, userId)
  if (!user || user.paused) return
  const now = Date.now()
  await evaluate(env, user, await loadInput(env, user, now), now, { force: true })
}

async function snapshot(env: Env, userId: string, opts: { refreshStale?: boolean } = {}): Promise<MeResponse> {
  const now = Date.now()
  let user = await getUser(env.DB, userId)
  if (!user) throw new HTTPException(401, { message: 'unauthorized' })
  let accounts = await getAccounts(env.DB, userId)

  if (opts.refreshStale) {
    const stale = accounts.filter((a) => a.error !== 'reconnect_required' && (!a.fetched_at || a.fetched_at < now - CALENDAR_TTL_MS))
    if (stale.length) {
      const tz = settingsOf(user).timezone
      const changed = (await Promise.all(stale.map((a) => refreshAccount(env, a, now, tz)))).some(Boolean)
      if (changed) await syncNow(env, userId)
      ;[user, accounts] = await Promise.all([getUser(env.DB, userId).then((u) => u ?? user!), getAccounts(env.DB, userId)])
    }
  }

  return {
    user: { id: user.id, name: user.name, avatarUrl: user.avatar_url, teamName: user.team_name, demo: user.slack_team_id === 'TDEMO' },
    settings: settingsOf(user),
    overrides: await getOverrides(env.DB, userId, now),
    events: eventsOf(accounts),
    accounts: accounts.map(toAccount),
    activity: await getActivity(env.DB, userId),
    autopilot: !user.paused,
    resumeAt: user.paused ? user.resume_at : null,
    sync: { lastSyncAt: user.last_sync_at, lastError: user.last_error, applied: appliedOf(user)?.state ?? null },
    features: { googleCalendar: Boolean(env.GOOGLE_CLIENT_ID) },
  }
}

async function body(c: Context<AppEnv>) {
  try {
    return await c.req.json()
  } catch {
    throw new ValidationError('Request body must be JSON')
  }
}

api.get('/me', async (c) => c.json(await snapshot(c.env, c.get('userId'), { refreshStale: true })))

api.put('/settings', async (c) => {
  const settings = parseSettings(await body(c))
  const user = await currentUser(c)
  const timezoneChanged = settingsOf(user).timezone !== settings.timezone
  await c.env.DB.prepare('UPDATE users SET settings_json = ?, updated_at = ? WHERE id = ?').bind(JSON.stringify(settings), Date.now(), user.id).run()
  if (timezoneChanged) {
    // Demo events are generated in the user's time zone
    for (const a of await getAccounts(c.env.DB, user.id)) if (a.provider === 'demo') await refreshAccount(c.env, a, Date.now(), settings.timezone)
  }
  await syncNow(c.env, user.id)
  return c.json(await snapshot(c.env, user.id))
})

api.post('/overrides', async (c) => {
  const now = Date.now()
  const input = parseOverride(await body(c), now)
  const user = await currentUser(c)
  const open = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM overrides WHERE user_id = ? AND (end_at IS NULL OR end_at > ?)').bind(user.id, now).first<{ n: number }>()
  if ((open?.n ?? 0) >= MAX_OVERRIDES) throw new ValidationError(`You can have at most ${MAX_OVERRIDES} active or scheduled overrides`)
  await c.env.DB.prepare('INSERT INTO overrides (id, user_id, label, state_json, start_at, end_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(randomId(), user.id, input.label, JSON.stringify(input.state), input.start, input.end, now)
    .run()
  await syncNow(c.env, user.id)
  return c.json(await snapshot(c.env, user.id))
})

api.delete('/overrides/:id', async (c) => {
  const user = await currentUser(c)
  await c.env.DB.prepare('DELETE FROM overrides WHERE id = ? AND user_id = ?').bind(c.req.param('id'), user.id).run()
  await syncNow(c.env, user.id)
  return c.json(await snapshot(c.env, user.id))
})

const MAX_PAUSE_MS = 30 * 86_400_000

/** Turn autopilot on, or pause it — optionally until a time, after which the cron resumes it. */
api.post('/autopilot', async (c) => {
  const { enabled, until } = (await body(c)) as { enabled?: unknown; until?: unknown }
  if (typeof enabled !== 'boolean') throw new ValidationError('enabled must be true or false')
  const now = Date.now()
  const resumeAt = until === undefined || until === null ? null : Number(until)
  if (resumeAt !== null && (!Number.isFinite(resumeAt) || resumeAt <= now || resumeAt > now + MAX_PAUSE_MS)) throw new ValidationError('Pick a resume time within the next 30 days')
  const user = await currentUser(c)
  if (enabled) {
    await c.env.DB.prepare('UPDATE users SET paused = 0, resume_at = NULL, last_error = NULL, next_check_at = NULL WHERE id = ?').bind(user.id).run()
    if (user.paused) await logActivity(c.env.DB, user.id, now, { kind: 'resume', trigger: 'manual', label: 'Autopilot on' })
    await syncNow(c.env, user.id)
  } else {
    // Hand Slack back in a neutral state: clear our status, presence and DND
    if (!user.paused) await clearSlack(await decrypt(user.token_enc, c.env.TOKEN_KEY), appliedOf(user))
    await c.env.DB.prepare('UPDATE users SET paused = 1, resume_at = ?, applied_json = NULL, next_check_at = NULL WHERE id = ?').bind(resumeAt, user.id).run()
    await logActivity(c.env.DB, user.id, now, { kind: 'pause', trigger: 'manual', label: 'Autopilot paused', ...(resumeAt && { detail: String(resumeAt) }) })
  }
  return c.json(await snapshot(c.env, user.id))
})

const EMOJI_TTL_MS = 6 * 3_600_000

/** The workspace's custom emoji (needs the optional emoji:read scope). Cached per workspace. */
api.get('/emoji', async (c) => {
  const user = await currentUser(c)
  const now = Date.now()
  const cached = await c.env.DB.prepare('SELECT emoji_json, fetched_at FROM team_emoji WHERE team_id = ?').bind(user.slack_team_id).first<{ emoji_json: string; fetched_at: number }>()
  if (cached && cached.fetched_at > now - EMOJI_TTL_MS) return c.json({ available: true, emoji: JSON.parse(cached.emoji_json) })
  const token = await decrypt(user.token_enc, c.env.TOKEN_KEY)
  if (token === DEMO_TOKEN) return c.json({ available: false, emoji: {} })
  try {
    const data = await slack<{ emoji: Record<string, string> }>('emoji.list', {}, token)
    await c.env.DB.prepare(
      'INSERT INTO team_emoji (team_id, emoji_json, fetched_at) VALUES (?, ?, ?) ON CONFLICT (team_id) DO UPDATE SET emoji_json = excluded.emoji_json, fetched_at = excluded.fetched_at',
    )
      .bind(user.slack_team_id, JSON.stringify(data.emoji), now)
      .run()
    return c.json({ available: true, emoji: data.emoji })
  } catch (e) {
    // Without emoji:read Slack says missing_scope; that's not an error for the user, just "not connected"
    if (e instanceof SlackError && e.code === 'missing_scope') return c.json({ available: false, emoji: cached ? JSON.parse(cached.emoji_json) : {} })
    throw e
  }
})

api.post('/sync', async (c) => {
  const user = await currentUser(c)
  await syncNow(c.env, user.id)
  return c.json(await snapshot(c.env, user.id))
})

async function account(c: Context<AppEnv>, user: UserRow) {
  const row = await c.env.DB.prepare('SELECT * FROM calendar_accounts WHERE id = ? AND user_id = ?').bind(c.req.param('id'), user.id).first<AccountRow>()
  if (!row) throw new HTTPException(404, { message: 'not_found' })
  return row
}

api.patch('/accounts/:id', async (c) => {
  const { selected } = (await body(c)) as { selected?: unknown }
  if (!Array.isArray(selected) || selected.some((s) => typeof s !== 'string')) throw new ValidationError('selected must be a list of calendar ids')
  if (selected.length > MAX_SELECTED_CALENDARS) throw new ValidationError(`Pick at most ${MAX_SELECTED_CALENDARS} calendars per account`)
  const user = await currentUser(c)
  const row = await account(c, user)
  const calendars = calendarsOf(row).map((cal) => ({ ...cal, selected: selected.includes(cal.id) }))
  await c.env.DB.prepare('UPDATE calendar_accounts SET calendars_json = ? WHERE id = ?').bind(JSON.stringify(calendars), row.id).run()
  await refreshAccount(c.env, { ...row, calendars_json: JSON.stringify(calendars) }, Date.now(), settingsOf(user).timezone)
  await syncNow(c.env, user.id)
  return c.json(await snapshot(c.env, user.id))
})

api.post('/accounts/:id/refresh', async (c) => {
  const user = await currentUser(c)
  const row = await account(c, user)
  if (await refreshAccount(c.env, row, Date.now(), settingsOf(user).timezone)) await syncNow(c.env, user.id)
  return c.json(await snapshot(c.env, user.id))
})

api.delete('/accounts/:id', async (c) => {
  const user = await currentUser(c)
  const row = await account(c, user)
  if (row.provider === 'google') await revokeGoogleToken(await decrypt(row.refresh_token_enc, c.env.TOKEN_KEY))
  await c.env.DB.prepare('DELETE FROM calendar_accounts WHERE id = ?').bind(row.id).run()
  await syncNow(c.env, user.id)
  return c.json(await snapshot(c.env, user.id))
})

/** Delete everything we hold and revoke our access to Slack and Google. */
api.delete('/me', async (c) => {
  const user = await currentUser(c)
  const token = await decrypt(user.token_enc, c.env.TOKEN_KEY)
  if (!user.paused) await clearSlack(token, appliedOf(user))
  if (token !== DEMO_TOKEN) await slack('auth.revoke', {}, token).catch(() => {})
  for (const a of await getAccounts(c.env.DB, user.id)) {
    if (a.provider === 'google') await revokeGoogleToken(await decrypt(a.refresh_token_enc, c.env.TOKEN_KEY))
  }
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM overrides WHERE user_id = ?').bind(user.id),
    c.env.DB.prepare('DELETE FROM activity WHERE user_id = ?').bind(user.id),
    c.env.DB.prepare('DELETE FROM calendar_accounts WHERE user_id = ?').bind(user.id),
    c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(user.id),
  ])
  deleteCookie(c, 'hush_session', { path: '/' })
  return c.body(null, 204)
})
