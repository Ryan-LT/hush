import type { SlackState } from '../src/shared/types'

export const SLACK_USER_SCOPES = ['users.profile:read', 'users.profile:write', 'users:read', 'users:write', 'dnd:read', 'dnd:write']

/** Token stored for the local demo user; Slack calls are simulated. */
export const DEMO_TOKEN = 'demo'

/** Most fetch() calls a single push makes. */
export const PUSH_COST = 3

export class SlackError extends Error {
  constructor(readonly code: string) {
    super(`Slack API error: ${code}`)
  }
}

const AUTH_ERRORS = new Set([
  'invalid_auth',
  'not_authed',
  'token_revoked',
  'token_expired',
  'account_inactive',
  'missing_scope',
  'user_removed_from_team',
  'team_disabled',
])
const TRANSIENT_ERRORS = new Set(['ratelimited', 'internal_error', 'fatal_error', 'service_unavailable', 'request_timeout', 'network_error'])

export const isAuthError = (code: string) => AUTH_ERRORS.has(code)
export const isTransient = (code: string) => TRANSIENT_ERRORS.has(code) || code.startsWith('http_5')

export async function slack<T = Record<string, unknown>>(method: string, params: Record<string, string | number>, token?: string): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded' }
  if (token) headers.Authorization = `Bearer ${token}`
  const body = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]))
  let res: Response
  try {
    res = await fetch(`https://slack.com/api/${method}`, { method: 'POST', headers, body })
  } catch {
    throw new SlackError('network_error')
  }
  if (res.status === 429) throw new SlackError('ratelimited')
  if (res.status >= 500) throw new SlackError(`http_${res.status}`)
  const data = (await res.json()) as { ok: boolean; error?: string }
  if (!data.ok) throw new SlackError(data.error ?? `http_${res.status}`)
  return data as T
}

/** What Hush last pushed to Slack. */
export interface Applied {
  state: SlackState
  /** When the Slack state next changes, as known at push time */
  until: number | null
  /** When the DND snooze we set runs out */
  dndUntil: number | null
  at: number
  /** Set after a failed push: Slack may not match `state`, so the next push sends every call */
  stale?: boolean
}

const endSnooze = (token: string) =>
  slack('dnd.endSnooze', {}, token).catch((e) => {
    if (!(e instanceof SlackError && e.code === 'snooze_not_active')) throw e
  })

/**
 * Push a state to Slack. Presence and DND calls are skipped when they match what we last pushed,
 * unless `full` is set (forced syncs) or the last push may not have landed.
 */
export async function pushState(
  token: string,
  next: SlackState,
  prev: Applied | null,
  until: number | null,
  now: number,
  opts: { full?: boolean; text?: string } = {},
): Promise<Applied> {
  const all = opts.full || !prev || Boolean(prev.stale)
  const text = opts.text ?? next.text
  const hasStatus = Boolean(text || next.emoji)
  // Slack snoozes are capped at a day here; the cron tops them up before they lapse
  const snoozeMinutes = next.dnd ? Math.min(Math.max(Math.ceil(((until ?? Infinity) - now) / 60_000), 1), 1440) : 0

  if (token !== DEMO_TOKEN) {
    await slack(
      'users.profile.set',
      {
        profile: JSON.stringify({
          status_text: text,
          status_emoji: next.emoji,
          // Let Slack clear the status itself if we ever miss the next change
          status_expiration: hasStatus && until ? Math.floor(until / 1000) : 0,
        }),
      },
      token,
    )
    if (all || prev!.state.presence !== next.presence) await slack('users.setPresence', { presence: next.presence }, token)
    if (next.dnd) await slack('dnd.setSnooze', { num_minutes: snoozeMinutes }, token)
    else if (all || prev!.state.dnd) await endSnooze(token)
  }

  return { state: next, until, dndUntil: next.dnd ? now + snoozeMinutes * 60_000 : null, at: now }
}

/** Undo what Hush set (status, away, DND) when autopilot is paused or the account is deleted. Best effort. */
export async function clearSlack(token: string, applied: Applied | null) {
  if (!applied || token === DEMO_TOKEN) return
  const { state } = applied
  await Promise.allSettled([
    state.text || state.emoji ? slack('users.profile.set', { profile: JSON.stringify({ status_text: '', status_emoji: '', status_expiration: 0 }) }, token) : null,
    state.presence === 'away' ? slack('users.setPresence', { presence: 'auto' }, token) : null,
    state.dnd ? endSnooze(token) : null,
  ])
}
