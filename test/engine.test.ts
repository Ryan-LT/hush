import { describe, expect, it } from 'vitest'
import { defaultSettings, state } from '../src/shared/defaults'
import { extractEmoji } from '../src/shared/emoji'
import { nextChange, resolveAt, segmentsForDay, statusText } from '../src/shared/engine'
import { localParts, zonedTime } from '../src/shared/time'
import type { CalEvent, EngineInput, Override } from '../src/shared/types'
import { parseSettings } from '../src/shared/validate'

const tz = 'America/New_York'
const at = (iso: string) => new Date(iso).getTime()

function input(patch: Partial<EngineInput> = {}): EngineInput {
  return { settings: defaultSettings(tz), overrides: [], events: [], ...patch }
}

const event = (title: string, start: string, end: string, extra: Partial<CalEvent> = {}): CalEvent => ({
  id: title,
  title,
  start: at(start),
  end: at(end),
  kind: 'default',
  private: false,
  ...extra,
})

describe('time', () => {
  it('converts wall-clock times across DST', () => {
    expect(zonedTime({ year: 2026, month: 10, day: 31 }, 9 * 60, tz)).toBe(at('2026-10-31T13:00:00Z'))
    expect(zonedTime({ year: 2026, month: 11, day: 1 }, 9 * 60, tz)).toBe(at('2026-11-01T14:00:00Z'))
    expect(localParts(at('2026-10-14T14:00:00Z'), tz)).toMatchObject({ weekday: 3, hour: 10, minuteOfDay: 600 })
  })
})

describe('resolveAt', () => {
  it('follows working hours and blocks', () => {
    const i = input()
    expect(resolveAt(i, at('2026-10-14T10:00:00-04:00')).kind).toBe('working')
    expect(resolveAt(i, at('2026-10-14T12:30:00-04:00'))).toMatchObject({ kind: 'block', label: 'Lunch' })
    expect(resolveAt(i, at('2026-10-14T18:00:00-04:00')).kind).toBe('offline')
    expect(resolveAt(i, at('2026-10-17T10:00:00-04:00')).kind).toBe('offline')
  })

  it('handles blocks that wrap past midnight', () => {
    const i = input()
    i.settings.blocks = [{ ...i.settings.blocks[0], id: 'night', name: 'Night shift', days: [3], start: 22 * 60, end: 2 * 60 }]
    expect(resolveAt(i, at('2026-10-14T23:00:00-04:00')).label).toBe('Night shift')
    expect(resolveAt(i, at('2026-10-15T01:00:00-04:00')).label).toBe('Night shift')
    expect(resolveAt(i, at('2026-10-15T03:00:00-04:00')).kind).toBe('offline')
  })

  it('gives overrides the highest priority', () => {
    const override: Override = { id: 'o1', label: 'Doctor', start: at('2026-10-14T11:00:00-04:00'), end: null, state: state(':hospital:', 'Doctor') }
    const i = input({ overrides: [override], events: [event('Standup', '2026-10-14T11:00:00-04:00', '2026-10-14T11:30:00-04:00')] })
    expect(resolveAt(i, at('2026-10-14T11:10:00-04:00'))).toMatchObject({ kind: 'override', label: 'Doctor' })
  })

  it('applies calendar rules before meeting defaults', () => {
    const i = input({ events: [event('Team lunch', '2026-10-14T11:00:00-04:00', '2026-10-14T12:00:00-04:00')] })
    expect(resolveAt(i, at('2026-10-14T11:15:00-04:00'))).toMatchObject({ kind: 'rule', state: { emoji: ':sandwich:' } })
  })

  it('takes the status emoji and text from meeting titles', () => {
    const ev = event('🚀 Launch review', '2026-10-14T15:00:00-04:00', '2026-10-14T16:00:00-04:00')
    const i = input({ events: [ev] })
    expect(resolveAt(i, at('2026-10-14T15:30:00-04:00')).state).toMatchObject({ emoji: ':rocket:', text: 'In a meeting', dnd: true })
    i.settings.calendar.meetings.useTitle = true
    expect(resolveAt(i, at('2026-10-14T15:30:00-04:00')).state.text).toBe('Launch review')
    i.events = [{ ...ev, private: true }]
    expect(resolveAt(i, at('2026-10-14T15:30:00-04:00')).state.text).toBe('In a meeting')
  })
})

describe('nextChange', () => {
  it('finds the next Slack-visible change', () => {
    expect(nextChange(input(), at('2026-10-14T10:00:00-04:00')).until).toBe(at('2026-10-14T12:00:00-04:00'))
    // Friday evening -> Monday morning, across the DST change
    expect(nextChange(input(), at('2026-10-30T18:00:00-04:00')).until).toBe(at('2026-11-02T09:00:00-05:00'))
  })
})

describe('segmentsForDay', () => {
  it('splits a workday into merged segments', () => {
    const segs = segmentsForDay(input(), { year: 2026, month: 10, day: 14 })
    expect(segs.map((s) => s.resolved.kind)).toEqual(['offline', 'working', 'block', 'working', 'offline'])
    expect(segs[0].start).toBe(at('2026-10-14T00:00:00-04:00'))
    expect(segs.at(-1)!.end).toBe(at('2026-10-15T00:00:00-04:00'))
  })
})

describe('validation and emoji', () => {
  it('round-trips default settings', () => {
    const s = defaultSettings(tz)
    expect(parseSettings(JSON.parse(JSON.stringify(s)))).toEqual(s)
  })

  it('extracts the first known emoji', () => {
    expect(extractEmoji('Planning ☕️ sync')).toEqual({ code: ':coffee:', rest: 'Planning sync' })
    expect(extractEmoji('No emoji here')).toBeNull()
  })
})

describe('DST gaps', () => {
  it('moves skipped wall times forward instead of back', () => {
    // New York skips 02:00–03:00 on 2027-03-14
    expect(zonedTime({ year: 2027, month: 3, day: 14 }, 2 * 60 + 30, tz)).toBe(at('2027-03-14T03:30:00-04:00'))
    expect(zonedTime({ year: 2027, month: 3, day: 14 }, 1 * 60 + 30, tz)).toBe(at('2027-03-14T01:30:00-05:00'))
    // Ambiguous 01:30 when clocks go back resolves to the first occurrence
    expect(zonedTime({ year: 2026, month: 11, day: 1 }, 1 * 60 + 30, tz)).toBe(at('2026-11-01T01:30:00-04:00'))
  })

  it('does not miss a block that starts inside the gap', () => {
    const i = input()
    i.settings.blocks = [{ ...i.settings.blocks[0], id: 'early', name: 'Early', days: [0], start: 2 * 60 + 30, end: 4 * 60 }]
    expect(nextChange(i, at('2027-03-14T00:30:00-05:00')).until).toBe(at('2027-03-14T03:30:00-04:00'))
  })

  it('handles zones that change clocks at midnight', () => {
    // Santiago skips 00:00–01:00 on 2026-09-06; a Saturday block ending at midnight really ends at 01:00
    const s = input()
    s.settings.timezone = 'America/Santiago'
    s.settings.workingHours = s.settings.workingHours.map((h) => ({ ...h, enabled: false }))
    s.settings.blocks = [{ ...s.settings.blocks[0], id: 'evening', name: 'Evening', days: [6], start: 20 * 60, end: 0 }]
    const end = zonedTime({ year: 2026, month: 9, day: 6 }, 0, 'America/Santiago')
    expect(localParts(end, 'America/Santiago')).toMatchObject({ day: 6, hour: 1, minute: 0 })
    expect(nextChange(s, end - 60 * 60_000).until).toBe(end)
  })
})

describe('statusText', () => {
  it('appends the end time only when asked', () => {
    const now = at('2026-10-14T12:10:00-04:00')
    const until = at('2026-10-14T13:00:00-04:00')
    expect(statusText(state(':sandwich:', 'Lunch break'), until, tz, now)).toBe('Lunch break')
    expect(statusText(state(':sandwich:', 'Lunch break', 'auto', false, true), until, tz, now)).toBe('Lunch break · until 1:00 PM')
    expect(statusText(state('', '', 'auto', false, true), until, tz, now)).toBe('Until 1:00 PM')
    expect(statusText(state('', 'Away', 'auto', false, true), null, tz, now)).toBe('Away')
  })

  it('names the day for later end times and stays within 100 characters', () => {
    const fri = at('2026-10-16T18:00:00-04:00')
    expect(statusText(state('', 'Signed off', 'away', true, true), at('2026-10-19T09:00:00-04:00'), tz, fri)).toBe('Signed off · until Mon 9:00 AM')
    expect(statusText(state('', 'Off', 'away', true, true), at('2026-10-15T09:00:00-04:00'), tz, at('2026-10-14T18:00:00-04:00'))).toBe('Off · until tomorrow 9:00 AM')
    const long = statusText(state('', 'x'.repeat(100), 'auto', false, true), at('2026-10-14T13:00:00-04:00'), tz, at('2026-10-14T12:00:00-04:00'))
    expect(long.length).toBeLessThanOrEqual(100)
    expect(long.endsWith('· until 1:00 PM')).toBe(true)
  })
})
