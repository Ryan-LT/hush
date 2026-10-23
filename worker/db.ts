import type { ActivityItem, CalendarAccount, CalendarInfo, CalEvent, Override, Settings } from '../src/shared/types'
import type { Applied } from './slack'

export interface UserRow {
  id: string
  slack_team_id: string
  slack_user_id: string
  team_name: string
  name: string
  avatar_url: string
  token_enc: string
  settings_json: string
  applied_json: string | null
  paused: number
  next_check_at: number | null
  last_sync_at: number | null
  last_error: string | null
  sessions_valid_after: number
  resume_at: number | null
  created_at: number
  updated_at: number
}

export interface OverrideRow {
  id: string
  user_id: string
  label: string
  state_json: string
  start_at: number
  end_at: number | null
  created_at: number
}

export interface AccountRow {
  id: string
  user_id: string
  provider: 'google' | 'demo'
  email: string
  refresh_token_enc: string
  access_token_enc: string | null
  access_expires_at: number | null
  calendars_json: string
  events_json: string
  fetched_at: number | null
  error: string | null
  created_at: number
}

export const getUser = (db: D1Database, id: string) => db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<UserRow>()

export const settingsOf = (user: UserRow) => JSON.parse(user.settings_json) as Settings
export const appliedOf = (user: UserRow) => (user.applied_json ? (JSON.parse(user.applied_json) as Applied) : null)

export async function getOverrides(db: D1Database, userId: string, now: number): Promise<Override[]> {
  const { results } = await db
    .prepare('SELECT * FROM overrides WHERE user_id = ? AND (end_at IS NULL OR end_at > ?) ORDER BY start_at')
    .bind(userId, now)
    .all<OverrideRow>()
  return results.map((r) => ({ id: r.id, label: r.label, start: r.start_at, end: r.end_at, state: JSON.parse(r.state_json) }))
}

export async function getAccounts(db: D1Database, userId: string): Promise<AccountRow[]> {
  const { results } = await db.prepare('SELECT * FROM calendar_accounts WHERE user_id = ? ORDER BY created_at').bind(userId).all<AccountRow>()
  return results
}

export const calendarsOf = (a: AccountRow) => JSON.parse(a.calendars_json) as CalendarInfo[]

export function eventsOf(accounts: AccountRow[]): CalEvent[] {
  const seen = new Set<string>()
  const events: CalEvent[] = []
  for (const a of accounts) {
    for (const e of JSON.parse(a.events_json) as CalEvent[]) {
      // The same meeting can appear on several selected calendars
      const key = `${e.start}|${e.end}|${e.title}`
      if (!seen.has(key)) {
        seen.add(key)
        events.push(e)
      }
    }
  }
  return events.sort((a, b) => a.start - b.start)
}

export interface ActivityRow {
  id: number
  user_id: string
  at: number
  kind: ActivityItem['kind']
  trigger: ActivityItem['trigger']
  label: string
  emoji: string | null
  text: string | null
  detail: string | null
}

export async function getActivity(db: D1Database, userId: string, limit = 30): Promise<ActivityItem[]> {
  const { results } = await db.prepare('SELECT * FROM activity WHERE user_id = ? ORDER BY at DESC, id DESC LIMIT ?').bind(userId, limit).all<ActivityRow>()
  return results.map((r) => ({
    id: r.id,
    at: r.at,
    kind: r.kind,
    trigger: r.trigger,
    label: r.label,
    ...(r.emoji !== null && { emoji: r.emoji }),
    ...(r.text !== null && { text: r.text }),
    ...(r.detail !== null && { detail: r.detail }),
  }))
}

/** Append to the user's activity log. */
export function logActivity(db: D1Database, userId: string, at: number, item: Omit<ActivityItem, 'id' | 'at'>) {
  return db
    .prepare('INSERT INTO activity (user_id, at, kind, trigger, label, emoji, text, detail) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(userId, at, item.kind, item.trigger, item.label, item.emoji ?? null, item.text ?? null, item.detail ?? null)
    .run()
}

export const toAccount = (a: AccountRow): CalendarAccount => ({
  id: a.id,
  provider: a.provider,
  email: a.email,
  calendars: calendarsOf(a),
  lastFetchAt: a.fetched_at,
  error: a.error,
})
