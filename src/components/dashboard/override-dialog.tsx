'use client'

import { CalendarClock, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { addDays, localParts, zonedTime } from '@/shared/time'
import type { SlackState } from '@/shared/types'
import { api } from '@/lib/api'
import { browserTimeZone, fmtWhen, fromZonedInput, toZonedInput } from '@/lib/format'
import { cn } from '@/lib/utils'
import { StateEditor } from '../status/state-editor'
import { useHush } from './store'

export type Duration = number | 'today' | 'forever' | 'custom'

const DURATIONS: { value: Duration; label: string }[] = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
  { value: 240, label: '4 hours' },
  { value: 'today', label: 'Rest of today' },
  { value: 'forever', label: 'Until I clear it' },
  { value: 'custom', label: 'Pick a time…' },
]

export interface OverridePreset {
  label: string
  state: SlackState
  duration: Duration
}

export function OverrideDialog({ preset, onOpenChange }: { preset: OverridePreset | null; onOpenChange: (open: boolean) => void }) {
  const { run, now, draft } = useHush()
  const tz = draft.timezone
  const [state, setState] = useState<SlackState>(preset?.state ?? { emoji: '', text: '', presence: 'auto', dnd: false })
  const [duration, setDuration] = useState<Duration>(preset?.duration ?? 60)
  const [later, setLater] = useState(false)
  const [startAt, setStartAt] = useState(() => toZonedInput(now + 60 * 60_000, tz))
  const [endAt, setEndAt] = useState(() => toZonedInput(now + 2 * 60 * 60_000, tz))
  const [busy, setBusy] = useState(false)

  // Fresh defaults every time the dialog opens; it stays mounted between uses
  useEffect(() => {
    if (!preset) return
    const t = Date.now()
    setState(preset.state)
    setDuration(preset.duration)
    setLater(false)
    setStartAt(toZonedInput(t + 60 * 60_000, tz))
    setEndAt(toZonedInput(t + 2 * 60 * 60_000, tz))
  }, [preset, tz])

  const start = later ? fromZonedInput(startAt, tz) : now
  const end =
    duration === 'forever'
      ? null
      : duration === 'custom'
        ? fromZonedInput(endAt, tz)
        : duration === 'today'
          ? zonedTime(addDays(localParts(start, tz), 1), 0, tz)
          : start + duration * 60_000
  const invalid = Number.isNaN(start) || (later && start < now - 60_000) || (end !== null && (Number.isNaN(end) || end <= start))
  const zoneNote = tz !== browserTimeZone() ? ` (${tz.replace(/_/g, ' ')} time)` : ''

  async function submit() {
    setBusy(true)
    const label = preset?.label || state.text || 'Custom status'
    const res = await run(
      api.addOverride({ label, state, start: later ? start : undefined, end }),
      later ? `Scheduled for ${fmtWhen(start, tz, now)}` : end ? `Set until ${fmtWhen(end, tz, now)}` : 'Set until you clear it',
    )
    setBusy(false)
    if (res) onOpenChange(false)
  }

  return (
    <Dialog open={preset !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{preset?.label ? `Set “${preset.label}”` : 'Set a status'}</DialogTitle>
          <DialogDescription>Overrides take priority over your schedule and calendar until they end.</DialogDescription>
        </DialogHeader>

        <StateEditor value={state} onChange={setState} />

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Clear after</Label>
          <div className="flex flex-wrap gap-1.5">
            {DURATIONS.map((d) => (
              <button
                key={String(d.value)}
                type="button"
                onClick={() => setDuration(d.value)}
                className={cn(
                  'rounded-full border px-3 py-1 text-sm transition-all hover:bg-muted active:scale-95',
                  duration === d.value && 'border-primary bg-primary text-primary-foreground hover:bg-primary/90',
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
          {duration === 'custom' && (
            <div className="mt-2 flex items-center gap-2">
              <Input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} className="w-fit" />
              {zoneNote && <span className="text-xs text-muted-foreground">{zoneNote.trim()}</span>}
            </div>
          )}
        </div>

        <div className="space-y-2 rounded-xl border bg-muted/30 p-3">
          <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2">
              <CalendarClock className="size-4 text-muted-foreground" /> Schedule for later
            </span>
            <Switch checked={later} onCheckedChange={setLater} />
          </label>
          {later && (
            <div className="flex items-center gap-2">
              <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} className="w-fit bg-background" />
              {zoneNote && <span className="text-xs text-muted-foreground">{zoneNote.trim()}</span>}
            </div>
          )}
        </div>

        <DialogFooter className="items-center sm:justify-between">
          <span className="text-xs text-muted-foreground">
            {invalid ? (later && start < now - 60_000 ? 'The start is in the past' : 'The end must be after the start') : end ? `Until ${fmtWhen(end, tz, now)}` : 'Stays until you clear it'}
          </span>
          <Button onClick={submit} disabled={busy || invalid}>
            {busy && <Loader2 className="animate-spin" />}
            {later ? 'Schedule' : 'Set status'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
