import { defaultSettings } from './defaults'
import { addDays, localParts, weekdayOf, zonedTime, type LocalDate } from './time'
import type { CalEvent, EngineInput, EventKind } from './types'

function eventsForDate(date: LocalDate, tz: string): CalEvent[] {
  const wd = weekdayOf(date)
  if (wd === 0 || wd === 6) return []
  const events: CalEvent[] = []
  const add = (id: string, title: string, start: number, end: number, kind: EventKind = 'default') =>
    events.push({ id: `${id}-${date.month}-${date.day}`, title, start: zonedTime(date, start, tz), end: zonedTime(date, end, tz), kind, private: false })
  add('standup', 'Daily standup', 9 * 60 + 30, 9 * 60 + 45)
  if (wd === 1) add('planning', 'Sprint planning', 10 * 60, 11 * 60)
  if (wd === 2) add('one-on-one', '1:1 with Sam', 11 * 60, 11 * 60 + 30)
  if (wd === 3) add('launch', '🚀 Launch review', 15 * 60, 16 * 60)
  if (wd === 4) add('focus', 'Focus time', 13 * 60 + 30, 15 * 60 + 30, 'focusTime')
  if (wd === 5) add('demo', '🎉 Friday demos', 16 * 60, 17 * 60)
  return events
}

/** Plausible meetings from yesterday to a week ahead, for demo accounts. */
export function demoEvents(tz: string, now: number): CalEvent[] {
  const today = localParts(now, tz)
  return Array.from({ length: 9 }, (_, i) => eventsForDate(addDays(today, i - 1), tz)).flat()
}

/** A fixed Wednesday used by the landing page demo. */
export const DEMO_DATE: LocalDate = { year: 2026, month: 10, day: 14 }

export function landingDemoInput(): EngineInput {
  const settings = defaultSettings('UTC')
  settings.blocks[1].enabled = true
  settings.blocks[1].days = [3]
  return { settings, overrides: [], events: eventsForDate(DEMO_DATE, 'UTC') }
}
