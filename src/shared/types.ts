/** Shared between the Next.js app and the Cloudflare Worker. Keep this file dependency-free. */

export type Presence = 'auto' | 'away'

/** Everything Hush controls on a Slack account. */
export interface SlackState {
  /** Slack shortcode such as ":sandwich:", or "" for none */
  emoji: string
  text: string
  presence: Presence
  dnd: boolean
  /** Append when it ends, e.g. "Lunch break · until 1:00 PM" */
  showUntil?: boolean
}

export interface DayHours {
  enabled: boolean
  /** Minutes after local midnight */
  start: number
  end: number
}

export const BLOCK_COLORS = ['violet', 'amber', 'pink', 'lime', 'cyan', 'orange', 'teal', 'fuchsia'] as const
export type BlockColor = (typeof BLOCK_COLORS)[number]

/** A repeating slot in the week, e.g. lunch every weekday 12:00–13:00. */
export interface Block {
  id: string
  name: string
  color: BlockColor
  /** 0 = Sunday */
  days: number[]
  start: number
  /** end < start wraps past midnight; end === start means the whole day */
  end: number
  enabled: boolean
  state: SlackState
}

export interface CalendarRule {
  id: string
  /** Case-insensitive; matches when the event title contains any phrase */
  phrases: string[]
  enabled: boolean
  state: SlackState
}

export interface CalendarSettings {
  meetings: {
    enabled: boolean
    /** Use the event title as the status text */
    useTitle: boolean
    /** Use the first emoji in the event title as the status emoji */
    titleEmoji: boolean
    state: SlackState
  }
  focusTime: { enabled: boolean; state: SlackState }
  outOfOffice: { enabled: boolean; state: SlackState }
  rules: CalendarRule[]
  /** Never put the title of a private event in your status */
  hidePrivate: boolean
}

export interface Settings {
  timezone: string
  /** Index 0 = Sunday */
  workingHours: DayHours[]
  working: SlackState
  offline: SlackState
  blocks: Block[]
  calendar: CalendarSettings
}

export interface Override {
  id: string
  label: string
  /** Epoch ms */
  start: number
  /** Epoch ms, or null for "until I clear it" */
  end: number | null
  state: SlackState
}

export type EventKind = 'default' | 'focusTime' | 'outOfOffice'

/** A calendar event that can affect your status (already filtered to busy, accepted events). */
export interface CalEvent {
  id: string
  title: string
  start: number
  end: number
  kind: EventKind
  private: boolean
}

export type SourceKind = 'override' | 'rule' | 'event' | 'block' | 'working' | 'offline'

export interface Resolved {
  kind: SourceKind
  label: string
  refId?: string
  color: string
  state: SlackState
}

export interface Current extends Resolved {
  /** When the Slack state next changes (null = not within the lookahead window) */
  until: number | null
  next: Resolved | null
}

export interface Segment {
  start: number
  end: number
  resolved: Resolved
}

export interface EngineInput {
  settings: Settings
  overrides: Override[]
  events: CalEvent[]
}

// ---- API shapes ----

export interface CalendarInfo {
  id: string
  name: string
  color: string
  primary: boolean
  selected: boolean
}

export interface CalendarAccount {
  id: string
  provider: 'google' | 'demo'
  email: string
  calendars: CalendarInfo[]
  lastFetchAt: number | null
  error: string | null
}

export interface ActivityItem {
  id: number
  at: number
  kind: 'push' | 'error' | 'pause' | 'resume'
  /** auto = schedule/cron, manual = something you did in the app */
  trigger: 'auto' | 'manual'
  label: string
  emoji?: string
  text?: string
  detail?: string
}

export interface MeResponse {
  user: { id: string; name: string; avatarUrl: string; teamName: string; demo: boolean }
  settings: Settings
  overrides: Override[]
  events: CalEvent[]
  accounts: CalendarAccount[]
  activity: ActivityItem[]
  autopilot: boolean
  /** When a timed pause ends (autopilot off until then) */
  resumeAt: number | null
  sync: { lastSyncAt: number | null; lastError: string | null; applied: SlackState | null }
  features: { googleCalendar: boolean }
}

export interface OverrideInput {
  label: string
  state: SlackState
  start?: number
  end: number | null
}
