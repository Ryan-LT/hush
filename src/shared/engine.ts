import { extractEmoji } from './emoji'
import { addDays, DAY_MS, formatUntil, localParts, zonedTime, type LocalDate } from './time'
import type { BlockColor, CalendarSettings, CalEvent, Current, EngineInput, Override, Resolved, Segment, SlackState } from './types'

/**
 * Decides what your Slack status should be at any instant. Precedence, highest first:
 * override → calendar keyword rule → calendar event → repeating block → working hours → off hours.
 */

export const COLORS = {
  working: '#10b981',
  offline: '#94a3b8',
  override: '#f43f5e',
  event: '#3b82f6',
} as const

export const BLOCK_HEX: Record<BlockColor, string> = {
  violet: '#8b5cf6',
  amber: '#f59e0b',
  pink: '#ec4899',
  lime: '#84cc16',
  cyan: '#06b6d4',
  orange: '#f97316',
  teal: '#14b8a6',
  fuchsia: '#d946ef',
}

const STATUS_MAX = 100

export function sameState(a: SlackState, b: SlackState) {
  return a.emoji === b.emoji && a.text === b.text && a.presence === b.presence && a.dnd === b.dnd && Boolean(a.showUntil) === Boolean(b.showUntil)
}

/** The status text Slack receives: adds " · until 1:00 PM" when the state asks for its end time. */
export function statusText(state: SlackState, until: number | null, tz: string, now: number) {
  if (!state.showUntil || until === null) return state.text
  const when = formatUntil(until, tz, now)
  if (!state.text) return `Until ${when}`
  const suffix = ` · until ${when}`
  return state.text.slice(0, STATUS_MAX - suffix.length).trimEnd() + suffix
}

function sameSource(a: Resolved, b: Resolved) {
  return a.kind === b.kind && a.refId === b.refId && a.label === b.label && sameState(a.state, b.state)
}

/** Does a [start, end) slot anchored on `day` contain local weekday `wd` at minute `min`? */
function covers(day: number, start: number, end: number, wd: number, min: number) {
  if (start === end) return wd === day
  if (start < end) return wd === day && min >= start && min < end
  return (wd === day && min >= start) || (wd === (day + 1) % 7 && min < end)
}

export function activeOverride(overrides: Override[], t: number): Override | undefined {
  let best: Override | undefined
  for (const o of overrides) {
    if (o.start <= t && (o.end === null || t < o.end) && (!best || o.start >= best.start)) best = o
  }
  return best
}

export function ruleMatches(phrases: string[], title: string) {
  const lower = title.toLowerCase()
  return phrases.some((p) => p.trim() && lower.includes(p.trim().toLowerCase()))
}

/** Status for a regular meeting, applying the title and title-emoji options. */
export function meetingState(cal: CalendarSettings, ev: CalEvent): SlackState {
  const base = cal.meetings.state
  if (ev.private && cal.hidePrivate) return base
  let title = ev.title.trim()
  let emoji = base.emoji
  if (cal.meetings.titleEmoji) {
    const found = extractEmoji(title)
    if (found) {
      emoji = found.code
      title = found.rest
    }
  }
  const text = cal.meetings.useTitle && title ? title.slice(0, STATUS_MAX) : base.text
  return { ...base, emoji, text }
}

function resolveEvents(cal: CalendarSettings, active: CalEvent[]): Resolved | null {
  if (!active.length) return null
  // Most recently started first, so a meeting that starts mid-way through another wins
  const evs = [...active].sort((a, b) => b.start - a.start)
  const label = (e: CalEvent) => e.title.trim() || 'Busy'

  for (const rule of cal.rules) {
    if (!rule.enabled) continue
    const ev = evs.find((e) => ruleMatches(rule.phrases, e.title))
    if (ev) return { kind: 'rule', label: label(ev), refId: ev.id, color: COLORS.event, state: rule.state }
  }
  const ooo = cal.outOfOffice.enabled && evs.find((e) => e.kind === 'outOfOffice')
  if (ooo) return { kind: 'event', label: label(ooo), refId: ooo.id, color: COLORS.event, state: cal.outOfOffice.state }
  const focus = cal.focusTime.enabled && evs.find((e) => e.kind === 'focusTime')
  if (focus) return { kind: 'event', label: label(focus), refId: focus.id, color: COLORS.event, state: cal.focusTime.state }
  const meeting = cal.meetings.enabled && evs.find((e) => e.kind === 'default')
  if (meeting) return { kind: 'event', label: label(meeting), refId: meeting.id, color: COLORS.event, state: meetingState(cal, meeting) }
  return null
}

export function resolveAt({ settings, overrides, events }: EngineInput, t: number): Resolved {
  const o = activeOverride(overrides, t)
  if (o) return { kind: 'override', label: o.label, refId: o.id, color: COLORS.override, state: o.state }

  const fromCalendar = resolveEvents(settings.calendar, events.filter((e) => e.start <= t && t < e.end))
  if (fromCalendar) return fromCalendar

  const { weekday, minuteOfDay } = localParts(t, settings.timezone)
  for (const b of settings.blocks) {
    if (b.enabled && b.days.some((d) => covers(d, b.start, b.end, weekday, minuteOfDay))) {
      return { kind: 'block', label: b.name, refId: b.id, color: BLOCK_HEX[b.color], state: b.state }
    }
  }
  const working = settings.workingHours.some((h, d) => h.enabled && covers(d, h.start, h.end, weekday, minuteOfDay))
  return working
    ? { kind: 'working', label: 'Working hours', color: COLORS.working, state: settings.working }
    : { kind: 'offline', label: 'Off hours', color: COLORS.offline, state: settings.offline }
}

/** Sorted instants in (from, to] at which the resolved state could change. */
export function boundaries({ settings, overrides, events }: EngineInput, from: number, to: number): number[] {
  const tz = settings.timezone
  const minutes = new Set<number>([0])
  for (const b of settings.blocks) {
    if (b.enabled) minutes.add(b.start).add(b.end)
  }
  for (const h of settings.workingHours) {
    if (h.enabled) minutes.add(h.start).add(h.end)
  }

  const out = new Set<number>()
  const add = (t: number | null) => {
    if (t !== null && t > from && t <= to) out.add(t)
  }
  const first = localParts(from, tz)
  const days = Math.ceil((to - from) / DAY_MS) + 1
  for (let i = 0; i <= days; i++) {
    const date = addDays(first, i)
    for (const m of minutes) add(zonedTime(date, m, tz))
  }
  for (const o of overrides) {
    add(o.start)
    add(o.end)
  }
  for (const e of events) {
    add(e.start)
    add(e.end)
  }
  return [...out].sort((a, b) => a - b)
}

/**
 * The next instant the state changes. `compare: 'state'` only counts changes Slack would see;
 * `'source'` also counts a switch between two sources that happen to share a status.
 */
export function nextChange(input: EngineInput, now: number, compare: 'state' | 'source' = 'state', horizon = 8 * DAY_MS) {
  const cur = resolveAt(input, now)
  for (const t of boundaries(input, now, now + horizon)) {
    const r = resolveAt(input, t)
    if (compare === 'state' ? !sameState(r.state, cur.state) : !sameSource(r, cur)) return { until: t, next: r }
  }
  return { until: null, next: null }
}

export function currentState(input: EngineInput, now: number): Current {
  return { ...resolveAt(input, now), ...nextChange(input, now, 'source') }
}

/** The day split into contiguous segments, for timelines. */
export function segmentsForDay(input: EngineInput, date: LocalDate): Segment[] {
  const tz = input.settings.timezone
  const start = zonedTime(date, 0, tz)
  const end = zonedTime(addDays(date, 1), 0, tz)
  const points = [start, ...boundaries(input, start, end).filter((t) => t < end)]
  const segments: Segment[] = []
  points.forEach((t, i) => {
    const resolved = resolveAt(input, t)
    const segEnd = points[i + 1] ?? end
    const last = segments.at(-1)
    if (last && sameSource(last.resolved, resolved)) last.end = segEnd
    else segments.push({ start: t, end: segEnd, resolved })
  })
  return segments
}
