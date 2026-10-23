'use client'

import { CalendarClock, CalendarDays, Compass, LayoutDashboard, Pause, Play, Power, Settings2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from '@/components/ui/command'
import { QUICK_PRESETS } from '@/shared/defaults'
import { addDays, localParts, zonedTime } from '@/shared/time'
import { api } from '@/lib/api'
import { fmtDuration, fmtWhen } from '@/lib/format'
import { Emoji } from '../status/emoji'
import { usePauseOptions } from './autopilot'
import { useHush } from './store'
import { TOUR_EVENT } from './tour'

export const COMMAND_EVENT = 'hush:command'
type Section = 'overview' | 'schedule' | 'calendar' | 'settings'

/** Extra durations offered per preset in the palette. */
const DURATIONS: Record<string, (number | 'today' | null)[]> = {
  focus: [30, 60, 120],
  meeting: [30, 60],
  lunch: [30, 45, 60],
  brb: [15, 30],
  commute: [30, 60],
  sick: ['today'],
  vacation: [null],
}

const durationLabel = (m: number | 'today' | null) => (m === null ? 'until I clear it' : m === 'today' ? 'rest of today' : fmtDuration(m * 60_000))

/** ⌘K / Ctrl+K: set a status, pause autopilot or jump anywhere without leaving the keyboard. */
export function CommandMenu({ go }: { go: (s: Section) => void }) {
  const { me, run, now, draft, current } = useHush()
  const [open, setOpen] = useState(false)
  const pauses = usePauseOptions()
  const tz = draft.timezone

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    const onOpen = () => setOpen(true)
    window.addEventListener('keydown', onKey)
    window.addEventListener(COMMAND_EVENT, onOpen)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener(COMMAND_EVENT, onOpen)
    }
  }, [])

  const act = (fn: () => void) => {
    setOpen(false)
    fn()
  }

  const setStatus = (p: (typeof QUICK_PRESETS)[number], m: number | 'today' | null) => {
    const end = m === null ? null : m === 'today' ? zonedTime(addDays(localParts(now, tz), 1), 0, tz) : now + m * 60_000
    act(() => run(api.addOverride({ label: p.label, state: p.state, end }), end ? `${p.label} until ${fmtWhen(end, tz, now)}` : `${p.label} until you clear it`))
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Quick actions" description="Set a status, pause autopilot or jump to a page">
      <Command>
        <CommandInput placeholder="Set a status, pause, or go to…" />
        <CommandList className="max-h-[min(420px,60dvh)]">
          <CommandEmpty>Nothing matches.</CommandEmpty>
          {current.kind === 'override' && current.refId && (
            <>
              <CommandGroup heading="Right now">
                <CommandItem value={`clear override ${current.label}`} onSelect={() => act(() => run(api.removeOverride(current.refId!), 'Override cleared'))}>
                  <X /> Clear “{current.label}”
                </CommandItem>
              </CommandGroup>
              <CommandSeparator />
            </>
          )}
          <CommandGroup heading="Set status">
            {QUICK_PRESETS.flatMap((p) =>
              (DURATIONS[p.id] ?? [p.minutes]).map((m) => (
                <CommandItem key={`${p.id}-${m}`} value={`${p.label} ${p.state.text} ${durationLabel(m)}`} onSelect={() => setStatus(p, m)}>
                  <Emoji code={p.state.emoji} className="text-base" />
                  <span>{p.label}</span>
                  <span className="text-muted-foreground">· {durationLabel(m)}</span>
                </CommandItem>
              )),
            )}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Autopilot">
            {me.autopilot ? (
              pauses.map((o) => (
                <CommandItem
                  key={o.id}
                  value={`autopilot ${o.label}`}
                  onSelect={() => act(() => run(api.setAutopilot(false, o.until), o.until ? `Paused until ${fmtWhen(o.until, tz, now)}` : 'Autopilot off'))}
                >
                  {o.id === 'off' ? <Power /> : <Pause />} {o.label}
                </CommandItem>
              ))
            ) : (
              <CommandItem value="autopilot turn on resume" onSelect={() => act(() => run(api.setAutopilot(true), 'Autopilot on'))}>
                <Play /> {me.resumeAt ? 'Resume autopilot now' : 'Turn on autopilot'}
              </CommandItem>
            )}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Go to">
            {(
              [
                ['overview', 'Overview', LayoutDashboard],
                ['schedule', 'Schedule', CalendarClock],
                ['calendar', 'Calendar', CalendarDays],
                ['settings', 'Settings', Settings2],
              ] as const
            ).map(([id, label, Icon]) => (
              <CommandItem key={id} value={`go to ${label}`} onSelect={() => act(() => go(id))}>
                <Icon /> {label}
              </CommandItem>
            ))}
            <CommandItem value="take the tour help" onSelect={() => act(() => window.dispatchEvent(new Event(TOUR_EVENT)))}>
              <Compass /> Take the tour
            </CommandItem>
          </CommandGroup>
        </CommandList>
        <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
          <span>↑↓ to move · Enter to run</span>
          <CommandShortcut>⌘K</CommandShortcut>
        </div>
      </Command>
    </CommandDialog>
  )
}
