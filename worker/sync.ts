import { nextChange, resolveAt, sameState, statusText } from '../src/shared/engine'
import { DAY_MS, HOUR_MS, MINUTE_MS } from '../src/shared/time'
import type { EngineInput } from '../src/shared/types'
import { decrypt, encrypt } from './crypto'
import { appliedOf, calendarsOf, eventsOf, getAccounts, getOverrides, logActivity, settingsOf, type AccountRow, type UserRow } from './db'
import { demoEvents } from '../src/shared/demo'
import { GoogleError, listEvents, refreshAccessToken } from './google'
import { isAuthError, isTransient, pushState, PUSH_COST, SlackError, type Applied } from './slack'

const DND_REFRESH_MS = 15 * MINUTE_MS
/** Even with nothing scheduled, look at every user this often as a safety net. */
const MAX_IDLE_MS = 6 * HOUR_MS
export const CALENDAR_TTL_MS = 10 * MINUTE_MS
const EVENT_WINDOW = { back: DAY_MS, ahead: 8 * DAY_MS }

/** Caps fetch() calls per invocation (Workers Free allows 50 subrequests). */
export class Budget {
  constructor(public left: number) {}
  take(n: number) {
    if (this.left < n) return false
    this.left -= n
    return true
  }
}

export async function loadInput(env: Env, user: UserRow, now: number): Promise<EngineInput> {
  const [overrides, accounts] = await Promise.all([getOverrides(env.DB, user.id, now), getAccounts(env.DB, user.id)])
  return { settings: settingsOf(user), overrides, events: eventsOf(accounts) }
}

function dndNeedsTopUp(applied: Applied, now: number) {
  return (
    applied.state.dnd &&
    applied.dndUntil !== null &&
    (applied.until === null || applied.dndUntil < applied.until) &&
    applied.dndUntil - now < DND_REFRESH_MS
  )
}

function nextCheckAt(applied: Applied, now: number) {
  let t = Math.min(applied.until ?? Infinity, now + MAX_IDLE_MS)
  if (applied.state.dnd && applied.dndUntil !== null && (applied.until === null || applied.dndUntil < applied.until)) {
    t = Math.min(t, applied.dndUntil - DND_REFRESH_MS)
  }
  return Math.max(t, now + MINUTE_MS / 2)
}

/**
 * Work out what the user's Slack state should be and push it if it differs from what we last set
 * (or the next change moved, which changes the status expiry). Returns the error code, if any.
 */
export async function evaluate(env: Env, user: UserRow, input: EngineInput, now: number, opts: { force?: boolean; budget?: Budget } = {}) {
  const resolved = resolveAt(input, now)
  const desired = resolved.state
  const { until } = nextChange(input, now, 'state')
  const text = statusText(desired, until, input.settings.timezone, now)
  const trigger = opts.force ? 'manual' : 'auto'
  const applied = appliedOf(user)
  const due = opts.force || !applied || !sameState(applied.state, desired) || applied.until !== until || dndNeedsTopUp(applied, now)

  if (!due) {
    await env.DB.prepare('UPDATE users SET next_check_at = ? WHERE id = ?').bind(nextCheckAt(applied, now), user.id).run()
    return null
  }
  if (opts.budget && !opts.budget.take(PUSH_COST)) return 'over_budget'

  try {
    const token = await decrypt(user.token_enc, env.TOKEN_KEY)
    const next = await pushState(token, desired, applied, until, now, { full: opts.force, text })
    await env.DB.prepare('UPDATE users SET applied_json = ?, last_sync_at = ?, last_error = NULL, next_check_at = ? WHERE id = ?')
      .bind(JSON.stringify(next), now, nextCheckAt(next, now), user.id)
      .run()
    // Log real changes; a forced sync that sends the same status again isn't news
    if (!applied || !sameState(applied.state, desired) || applied.until !== until) {
      await logActivity(env.DB, user.id, now, { kind: 'push', trigger, label: resolved.label, emoji: desired.emoji, text })
    }
    return null
  } catch (e) {
    const code = e instanceof SlackError ? e.code : 'internal_error'
    if (!(e instanceof SlackError)) console.error('push failed', user.id, e)
    await logActivity(env.DB, user.id, now, { kind: 'error', trigger, label: resolved.label, emoji: desired.emoji, text, detail: code }).catch(() => {})
    if (isAuthError(code)) {
      await env.DB.prepare("UPDATE users SET paused = 1, last_error = 'slack_disconnected', next_check_at = NULL WHERE id = ?").bind(user.id).run()
    } else if (isTransient(code)) {
      await env.DB.prepare('UPDATE users SET last_error = ?, next_check_at = ? WHERE id = ?').bind(code, now + 2 * MINUTE_MS, user.id).run()
    } else {
      // A permanent error (e.g. an emoji the workspace doesn't have): record it and stop retrying until something changes
      const failed: Applied = { state: desired, until, dndUntil: null, at: now, stale: true }
      await env.DB.prepare('UPDATE users SET applied_json = ?, last_error = ?, next_check_at = ? WHERE id = ?')
        .bind(JSON.stringify(failed), code, nextCheckAt(failed, now), user.id)
        .run()
    }
    return code
  }
}

async function accessToken(env: Env, account: AccountRow, now: number) {
  if (account.access_token_enc && account.access_expires_at && account.access_expires_at > now + MINUTE_MS) {
    return decrypt(account.access_token_enc, env.TOKEN_KEY)
  }
  const fresh = await refreshAccessToken(env, await decrypt(account.refresh_token_enc, env.TOKEN_KEY))
  const expiresAt = now + fresh.expires_in * 1000
  await env.DB.prepare('UPDATE calendar_accounts SET access_token_enc = ?, access_expires_at = ? WHERE id = ?')
    .bind(await encrypt(fresh.access_token, env.TOKEN_KEY), expiresAt, account.id)
    .run()
  return fresh.access_token
}

/** Most calendars one account may sync (each costs a fetch per refresh). */
export const MAX_SELECTED_CALENDARS = 10

/** fetch() calls a refresh can make: one per selected calendar plus a possible token refresh. */
export const refreshCost = (account: AccountRow) =>
  account.provider === 'demo' ? 0 : calendarsOf(account).filter((c) => c.selected).length + 1

/** Re-download upcoming events. Returns true when they changed. */
export async function refreshAccount(env: Env, account: AccountRow, now: number, timezone: string) {
  try {
    let events
    if (account.provider === 'demo') {
      events = demoEvents(timezone, now)
    } else {
      const token = await accessToken(env, account, now)
      const selected = calendarsOf(account).filter((c) => c.selected).slice(0, MAX_SELECTED_CALENDARS)
      const lists = await Promise.all(selected.map((c) => listEvents(token, c.id, now - EVENT_WINDOW.back, now + EVENT_WINDOW.ahead)))
      events = lists.flat().sort((a, b) => a.start - b.start)
    }
    const json = JSON.stringify(events)
    await env.DB.prepare('UPDATE calendar_accounts SET events_json = ?, fetched_at = ?, error = NULL WHERE id = ?').bind(json, now, account.id).run()
    return json !== account.events_json
  } catch (e) {
    const code = e instanceof GoogleError ? e.code : 'fetch_failed'
    if (!(e instanceof GoogleError)) console.error('calendar refresh failed', account.id, e)
    if (code === 'reconnect_required') {
      // Access is gone: stop retrying and stop acting on events we can no longer verify
      await env.DB.prepare("UPDATE calendar_accounts SET error = ?, fetched_at = ?, events_json = '[]', access_token_enc = NULL WHERE id = ?")
        .bind(code, now, account.id)
        .run()
      return account.events_json !== '[]'
    }
    // A rejected access token is dropped so the next refresh mints a new one
    await env.DB.prepare(`UPDATE calendar_accounts SET error = ?, fetched_at = ?${code === 'token_rejected' ? ', access_token_enc = NULL' : ''} WHERE id = ?`)
      .bind(code, now, account.id)
      .run()
    return false
  }
}

/** Evaluate every active user whose next check is due, oldest first. */
async function processDue(env: Env, now: number, budget: Budget) {
  const limit = Math.max(1, Math.floor(budget.left / PUSH_COST) * 2)
  const { results } = await env.DB.prepare(
    'SELECT * FROM users WHERE paused = 0 AND (next_check_at IS NULL OR next_check_at <= ?) ORDER BY next_check_at LIMIT ?',
  )
    .bind(now, limit)
    .all<UserRow>()
  if (!results.length) return
  // Move them back first, so one user that keeps failing (or runs out of CPU) can't block the queue
  await env.DB.prepare(`UPDATE users SET next_check_at = ? WHERE id IN (${results.map(() => '?').join(',')})`)
    .bind(now + MINUTE_MS, ...results.map((u) => u.id))
    .run()
  for (const user of results) {
    if (budget.left < PUSH_COST) break
    try {
      await evaluate(env, user, await loadInput(env, user, now), now, { budget })
    } catch (e) {
      console.error('evaluate failed', user.id, e)
    }
  }
}

/** Refresh stale calendars; users whose events changed are re-checked straight away. */
async function refreshCalendars(env: Env, now: number, budget: Budget) {
  const { results } = await env.DB.prepare(
    `SELECT a.*, u.settings_json AS user_settings FROM calendar_accounts a JOIN users u ON u.id = a.user_id
     WHERE u.paused = 0 AND (a.error IS NULL OR a.error != 'reconnect_required') AND (a.fetched_at IS NULL OR a.fetched_at < ?)
     ORDER BY a.fetched_at LIMIT 25`,
  )
    .bind(now - CALENDAR_TTL_MS)
    .all<AccountRow & { user_settings: string }>()
  for (const account of results) {
    if (!budget.take(refreshCost(account))) continue
    const { timezone } = JSON.parse(account.user_settings) as { timezone: string }
    if (await refreshAccount(env, account, now, timezone)) {
      await env.DB.prepare('UPDATE users SET next_check_at = ? WHERE id = ?').bind(now, account.user_id).run()
    }
  }
}

/** Turn autopilot back on for timed pauses that have ended. */
async function resumeDue(env: Env, now: number) {
  const due = "paused = 1 AND resume_at IS NOT NULL AND resume_at <= ? AND (last_error IS NULL OR last_error != 'slack_disconnected')"
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO activity (user_id, at, kind, trigger, label) SELECT id, ?, 'resume', 'auto', 'Autopilot resumed' FROM users WHERE ${due}`).bind(now, now),
    env.DB.prepare(`UPDATE users SET paused = 0, resume_at = NULL, next_check_at = NULL WHERE ${due}`).bind(now),
  ])
}

export async function runCron(env: Env, now: number) {
  const budget = new Budget(Number(env.FETCH_BUDGET) || 45)
  await resumeDue(env, now)
  await processDue(env, now, budget)
  await refreshCalendars(env, now, budget)
  await processDue(env, now, budget)
  if (new Date(now).getUTCMinutes() === 0) {
    await env.DB.batch([
      env.DB.prepare('DELETE FROM overrides WHERE end_at IS NOT NULL AND end_at < ?').bind(now - DAY_MS),
      env.DB.prepare('DELETE FROM activity WHERE at < ?').bind(now - 14 * DAY_MS),
    ])
  }
}
