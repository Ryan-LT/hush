export const MINUTE_MS = 60_000
export const HOUR_MS = 3_600_000
export const DAY_MS = 86_400_000

const formatters = new Map<string, Intl.DateTimeFormat>()

function formatter(tz: string) {
  let f = formatters.get(tz)
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    })
    formatters.set(tz, f)
  }
  return f
}

export interface LocalDate {
  year: number
  month: number
  day: number
}

export interface LocalParts extends LocalDate {
  hour: number
  minute: number
  second: number
  /** 0 = Sunday */
  weekday: number
  minuteOfDay: number
}

/** Wall-clock parts of an instant in a time zone. */
export function localParts(t: number, tz: string): LocalParts {
  const p: Record<string, number> = {}
  for (const { type, value } of formatter(tz).formatToParts(t)) {
    if (type !== 'literal') p[type] = Number(value)
  }
  const hour = p.hour === 24 ? 0 : p.hour
  return {
    year: p.year,
    month: p.month,
    day: p.day,
    hour,
    minute: p.minute,
    second: p.second,
    weekday: new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay(),
    minuteOfDay: hour * 60 + p.minute,
  }
}

function offsetAt(t: number, tz: string) {
  const p = localParts(t, tz)
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(t / 1000) * 1000
}

/**
 * Instant for a wall-clock time in a time zone. Ambiguous times (clocks going back) resolve to the
 * first occurrence; times skipped by a DST gap move forward by the gap, like Temporal's "compatible".
 */
export function zonedTime(date: LocalDate, minuteOfDay: number, tz: string): number {
  const wall = Date.UTC(date.year, date.month - 1, date.day, 0, minuteOfDay)
  const first = wall - offsetAt(wall, tz)
  const second = wall - offsetAt(first, tz)
  if (first === second) return first
  const matches = (t: number) => wall - offsetAt(t, tz) === t
  if (matches(second)) return second
  if (matches(first)) return first
  return Math.max(first, second)
}

export function addDays(date: LocalDate, n: number): LocalDate {
  const d = new Date(Date.UTC(date.year, date.month - 1, date.day + n))
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() }
}

export function weekdayOf(date: LocalDate) {
  return new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay()
}

export function startOfLocalDay(t: number, tz: string) {
  return zonedTime(localParts(t, tz), 0, tz)
}

export function isValidTimeZone(tz: string) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

/** "1:00 PM", "tomorrow 9:00 AM", "Mon 9:00 AM" or "Oct 21" — for status text Slack shows to others. */
export function formatUntil(t: number, tz: string, now: number) {
  const a = localParts(now, tz)
  const b = localParts(t, tz)
  const days = Math.round((Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day)) / DAY_MS)
  const time = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: tz }).format(t)
  if (days <= 0) return time
  if (days === 1) return `tomorrow ${time}`
  if (days < 7) return `${new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: tz }).format(t)} ${time}`
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: tz }).format(t)
}
