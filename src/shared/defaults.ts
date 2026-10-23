import type { Settings, SlackState } from './types'

export const state = (emoji: string, text: string, presence: SlackState['presence'] = 'auto', dnd = false, showUntil = false): SlackState => ({
  emoji,
  text,
  presence,
  dnd,
  ...(showUntil ? { showUntil } : {}),
})

export function defaultSettings(timezone: string): Settings {
  const weekday = () => ({ enabled: true, start: 9 * 60, end: 17 * 60 + 30 })
  const weekend = () => ({ enabled: false, start: 9 * 60, end: 17 * 60 + 30 })
  return {
    timezone,
    workingHours: [weekend(), weekday(), weekday(), weekday(), weekday(), weekday(), weekend()],
    working: state('', ''),
    offline: state(':crescent_moon:', 'Signed off for the day', 'away', true, true),
    blocks: [
      {
        id: 'lunch',
        name: 'Lunch',
        color: 'amber',
        days: [1, 2, 3, 4, 5],
        start: 12 * 60,
        end: 13 * 60,
        enabled: true,
        state: state(':sandwich:', 'Lunch break', 'auto', false, true),
      },
      {
        id: 'focus',
        name: 'Deep work',
        color: 'violet',
        days: [2, 4],
        start: 14 * 60,
        end: 16 * 60,
        enabled: false,
        state: state(':headphones:', 'Heads down, will reply soon', 'auto', true),
      },
    ],
    calendar: {
      meetings: { enabled: true, useTitle: false, titleEmoji: true, state: state(':spiral_calendar_pad:', 'In a meeting', 'auto', true, true) },
      focusTime: { enabled: true, state: state(':headphones:', 'Focusing', 'auto', true, true) },
      outOfOffice: { enabled: true, state: state(':palm_tree:', 'Out of office', 'away', true) },
      rules: [
        { id: 'rule-lunch', phrases: ['lunch'], enabled: true, state: state(':sandwich:', 'Lunch break') },
        { id: 'rule-doctor', phrases: ['doctor', 'dentist', 'appointment'], enabled: true, state: state(':hospital:', 'At an appointment', 'away', true) },
      ],
      hidePrivate: true,
    },
  }
}

/** Presets for one-tap overrides. */
export const QUICK_PRESETS: { id: string; label: string; state: SlackState; minutes: number | 'today' | null }[] = [
  { id: 'focus', label: 'Focus', state: state(':headphones:', 'Focusing', 'auto', true, true), minutes: 60 },
  { id: 'meeting', label: 'Meeting', state: state(':spiral_calendar_pad:', 'In a meeting', 'auto', true, true), minutes: 30 },
  { id: 'lunch', label: 'Lunch', state: state(':sandwich:', 'Lunch break', 'auto', false, true), minutes: 45 },
  { id: 'brb', label: 'Be right back', state: state(':walking:', 'Back soon', 'away', false, true), minutes: 15 },
  { id: 'commute', label: 'Commuting', state: state(':train2:', 'Commuting', 'away', false, true), minutes: 30 },
  { id: 'sick', label: 'Out sick', state: state(':face_with_thermometer:', 'Out sick', 'away', true), minutes: 'today' },
  { id: 'vacation', label: 'Vacation', state: state(':palm_tree:', 'On vacation', 'away', true, true), minutes: null },
]
