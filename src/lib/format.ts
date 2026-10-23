import { DAY_MS, localParts, zonedTime } from '@/shared/time'

export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const DAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const DAY_LETTER = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
/** Monday-first display order */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]

const timeFormats = new Map<string, Intl.DateTimeFormat>()
function timeFormat(tz: string) {
  let f = timeFormats.get(tz)
  if (!f) {
    f = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', timeZone: tz })
    timeFormats.set(tz, f)
  }
  return f
}

export const fmtTime = (t: number, tz: string) => timeFormat(tz).format(t)

/** Minutes after midnight -> "9:00 AM" in the viewer's locale */
export const fmtClock = (minutes: number) => timeFormat('UTC').format(Date.UTC(2000, 0, 1, 0, minutes))

export const toInputTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

export function fromInputTime(s: string) {
  const [h, m] = s.split(':').map(Number)
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : 0
}

/** "3:00 PM", "Tomorrow 9:00 AM", "Fri 9:00 AM" or "Oct 21, 9:00 AM" relative to now, in tz */
export function fmtWhen(t: number, tz: string, now: number) {
  const a = localParts(now, tz)
  const b = localParts(t, tz)
  const days = Math.round((Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day)) / DAY_MS)
  const time = fmtTime(t, tz)
  if (days === 0) return time
  if (days === 1) return `Tomorrow ${time}`
  if (days > 1 && days < 7) return `${DAY_SHORT[b.weekday]} ${time}`
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: tz }).format(t)
}

export function fmtDuration(ms: number) {
  const mins = Math.max(1, Math.round(ms / 60_000))
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h >= 48) return `${Math.round(h / 24)}d`
  return m ? `${h}h ${m}m` : `${h}h`
}

export function fmtRelative(t: number, now: number) {
  const s = Math.round((now - t) / 1000)
  if (s < 45) return 'just now'
  if (s < 3600) return `${Math.round(s / 60)}m ago`
  if (s < 86_400) return `${Math.round(s / 3600)}h ago`
  return `${Math.round(s / 86_400)}d ago`
}

export function fmtRange(start: number, end: number) {
  if (start === end) return 'All day'
  return `${fmtClock(start)} – ${fmtClock(end)}${end < start ? ' (next day)' : ''}`
}

export function summarizeDays(days: number[]) {
  const set = new Set(days)
  if (set.size === 7) return 'Every day'
  if (set.size === 0) return 'No days'
  if (set.size === 5 && [1, 2, 3, 4, 5].every((d) => set.has(d))) return 'Weekdays'
  if (set.size === 2 && set.has(0) && set.has(6)) return 'Weekends'
  const ordered = WEEK_ORDER.filter((d) => set.has(d))
  const idx = ordered.map((d) => WEEK_ORDER.indexOf(d))
  const contiguous = idx.every((v, i) => i === 0 || v === idx[i - 1] + 1)
  if (contiguous && ordered.length > 2) return `${DAY_SHORT[ordered[0]]}–${DAY_SHORT[ordered.at(-1)!]}`
  return ordered.map((d) => DAY_SHORT[d]).join(', ')
}

export function browserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

export const uid = () => crypto.randomUUID().replace(/-/g, '').slice(0, 12)

const pad = (n: number) => String(n).padStart(2, '0')

/** Value for <input type="datetime-local"> showing an instant as wall-clock time in tz */
export function toZonedInput(t: number, tz: string) {
  const p = localParts(t, tz)
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`
}

/** Reads a datetime-local value as wall-clock time in tz (not the browser's zone) */
export function fromZonedInput(value: string, tz: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value)
  if (!m) return NaN
  return zonedTime({ year: +m[1], month: +m[2], day: +m[3] }, +m[4] * 60 + +m[5], tz)
}
