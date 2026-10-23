import { isEmojiCode } from './emoji'
import { isValidTimeZone } from './time'
import { BLOCK_COLORS, type Block, type BlockColor, type CalendarRule, type CalendarSettings, type DayHours, type OverrideInput, type Settings, type SlackState } from './types'

export class ValidationError extends Error {}

type Obj = Record<string, unknown>

function obj(v: unknown, field: string): Obj {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new ValidationError(`${field} is invalid`)
  return v as Obj
}

function arr(v: unknown, field: string, max: number): unknown[] {
  if (!Array.isArray(v) || v.length > max) throw new ValidationError(`${field} is invalid`)
  return v
}

function text(v: unknown, field: string, max: number): string {
  if (typeof v !== 'string') throw new ValidationError(`${field} must be text`)
  const s = v.trim()
  if (s.length > max) throw new ValidationError(`${field} must be at most ${max} characters`)
  return s
}

function bool(v: unknown, field: string): boolean {
  if (typeof v !== 'boolean') throw new ValidationError(`${field} must be true or false`)
  return v
}

function minute(v: unknown, field: string): number {
  if (!Number.isInteger(v) || (v as number) < 0 || (v as number) > 1439) throw new ValidationError(`${field} is not a valid time`)
  return v as number
}

function id(v: unknown, field: string): string {
  const s = text(v, field, 64)
  if (!/^[\w-]+$/.test(s)) throw new ValidationError(`${field} is invalid`)
  return s
}

export function parseState(v: unknown, field = 'Status'): SlackState {
  const o = obj(v, field)
  const emoji = text(o.emoji, `${field} emoji`, 102)
  if (emoji && !isEmojiCode(emoji)) throw new ValidationError(`${field} emoji must look like :emoji_name:`)
  if (o.presence !== 'auto' && o.presence !== 'away') throw new ValidationError(`${field} presence is invalid`)
  const state: SlackState = { emoji, text: text(o.text, `${field} text`, 100), presence: o.presence, dnd: bool(o.dnd, `${field} Do Not Disturb`) }
  if (o.showUntil !== undefined) state.showUntil = bool(o.showUntil, `${field} end time`)
  return state
}

function parseDay(v: unknown, i: number): DayHours {
  const o = obj(v, `Working hours (day ${i})`)
  return { enabled: bool(o.enabled, 'Working day'), start: minute(o.start, 'Start time'), end: minute(o.end, 'End time') }
}

function parseBlock(v: unknown): Block {
  const o = obj(v, 'Block')
  const name = text(o.name, 'Block name', 60)
  if (!name) throw new ValidationError('Every block needs a name')
  if (!BLOCK_COLORS.includes(o.color as BlockColor)) throw new ValidationError('Block colour is invalid')
  const days = arr(o.days, 'Block days', 7).map((d) => {
    if (!Number.isInteger(d) || (d as number) < 0 || (d as number) > 6) throw new ValidationError('Block days are invalid')
    return d as number
  })
  return {
    id: id(o.id, 'Block id'),
    name,
    color: o.color as BlockColor,
    days: [...new Set(days)].sort(),
    start: minute(o.start, `${name} start`),
    end: minute(o.end, `${name} end`),
    enabled: bool(o.enabled, 'Block enabled'),
    state: parseState(o.state, name),
  }
}

function parseRule(v: unknown): CalendarRule {
  const o = obj(v, 'Rule')
  const phrases = arr(o.phrases, 'Rule phrases', 20)
    .map((p) => text(p, 'Phrase', 60))
    .filter(Boolean)
  if (!phrases.length) throw new ValidationError('Every calendar rule needs at least one phrase')
  return { id: id(o.id, 'Rule id'), phrases, enabled: bool(o.enabled, 'Rule enabled'), state: parseState(o.state, 'Rule status') }
}

function parseCalendar(v: unknown): CalendarSettings {
  const o = obj(v, 'Calendar settings')
  const meetings = obj(o.meetings, 'Meetings')
  const focus = obj(o.focusTime, 'Focus time')
  const ooo = obj(o.outOfOffice, 'Out of office')
  return {
    meetings: {
      enabled: bool(meetings.enabled, 'Meetings enabled'),
      useTitle: bool(meetings.useTitle, 'Use title'),
      titleEmoji: bool(meetings.titleEmoji, 'Title emoji'),
      state: parseState(meetings.state, 'Meeting status'),
    },
    focusTime: { enabled: bool(focus.enabled, 'Focus time enabled'), state: parseState(focus.state, 'Focus time status') },
    outOfOffice: { enabled: bool(ooo.enabled, 'Out of office enabled'), state: parseState(ooo.state, 'Out of office status') },
    rules: arr(o.rules, 'Calendar rules', 50).map(parseRule),
    hidePrivate: bool(o.hidePrivate, 'Hide private events'),
  }
}

export function parseSettings(v: unknown): Settings {
  const o = obj(v, 'Settings')
  const timezone = text(o.timezone, 'Time zone', 64)
  if (!isValidTimeZone(timezone)) throw new ValidationError('Time zone is not recognised')
  const days = arr(o.workingHours, 'Working hours', 7)
  if (days.length !== 7) throw new ValidationError('Working hours need all seven days')
  return {
    timezone,
    workingHours: days.map(parseDay),
    working: parseState(o.working, 'Working status'),
    offline: parseState(o.offline, 'Off-hours status'),
    blocks: arr(o.blocks, 'Blocks', 50).map(parseBlock),
    calendar: parseCalendar(o.calendar),
  }
}

const YEAR_MS = 366 * 86_400_000

export function parseOverride(v: unknown, now: number): Required<OverrideInput> {
  const o = obj(v, 'Override')
  const label = text(o.label, 'Label', 60) || 'Custom status'
  const start = o.start === undefined || o.start === null ? now : Number(o.start)
  const end = o.end === null ? null : Number(o.end)
  if (!Number.isFinite(start) || start < now - 60_000 || start > now + YEAR_MS) throw new ValidationError('Start time is invalid')
  if (end !== null && (!Number.isFinite(end) || end <= start || end > now + YEAR_MS)) throw new ValidationError('End time must be after the start')
  // "Start now" begins a minute early so a browser clock slightly behind the server still sees it as active
  return { label, state: parseState(o.state), start: o.start === undefined || o.start === null ? now - 60_000 : Math.max(start, now), end }
}
