'use client'

import { Check } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { BLOCK_HEX } from '@/shared/engine'
import { BLOCK_COLORS, type Block } from '@/shared/types'
import { DAY_LETTER, DAY_LONG, fromInputTime, toInputTime, uid, WEEK_ORDER } from '@/lib/format'
import { cn } from '@/lib/utils'
import { StateEditor } from '../status/state-editor'

/** One-tap starting points for common routines. */
const TEMPLATES: (Omit<Block, 'id' | 'enabled'> & { glyph: string })[] = [
  { glyph: '🥪', name: 'Lunch', color: 'amber', days: [1, 2, 3, 4, 5], start: 12 * 60, end: 13 * 60, state: { emoji: ':sandwich:', text: 'Lunch break', presence: 'auto', dnd: false, showUntil: true } },
  { glyph: '🎧', name: 'Deep work', color: 'violet', days: [2, 4], start: 9 * 60, end: 11 * 60, state: { emoji: ':headphones:', text: 'Heads down', presence: 'auto', dnd: true, showUntil: true } },
  { glyph: '🏋️', name: 'Gym', color: 'lime', days: [1, 3, 5], start: 18 * 60, end: 19 * 60, state: { emoji: ':weight_lifter:', text: 'At the gym', presence: 'away', dnd: true, showUntil: true } },
  { glyph: '🚸', name: 'School run', color: 'orange', days: [1, 2, 3, 4, 5], start: 15 * 60, end: 15 * 60 + 45, state: { emoji: ':car:', text: 'School run', presence: 'away', dnd: false, showUntil: true } },
  { glyph: '☕', name: 'Coffee break', color: 'teal', days: [1, 2, 3, 4, 5], start: 15 * 60 + 30, end: 15 * 60 + 45, state: { emoji: ':coffee:', text: 'Coffee break', presence: 'auto', dnd: false, showUntil: true } },
  { glyph: '🌙', name: 'Night shift', color: 'cyan', days: [0, 1, 2, 3, 4], start: 22 * 60, end: 6 * 60, state: { emoji: ':crescent_moon:', text: 'On night shift', presence: 'auto', dnd: false } },
]

const blank = (): Block => ({
  id: uid(),
  name: '',
  color: 'violet',
  days: [1, 2, 3, 4, 5],
  start: 14 * 60,
  end: 15 * 60,
  enabled: true,
  state: { emoji: ':headphones:', text: 'Focusing', presence: 'auto', dnd: true },
})

export function BlockDialog({ block, onClose, onSave }: { block: Block | 'new' | null; onClose: () => void; onSave: (b: Block) => void }) {
  const [b, setB] = useState<Block>(blank)
  useEffect(() => {
    if (block) setB(block === 'new' ? blank() : structuredClone(block))
  }, [block])

  const allDay = b.start === b.end
  const valid = b.name.trim() && b.days.length > 0
  const toggleDay = (d: number) => setB((x) => ({ ...x, days: x.days.includes(d) ? x.days.filter((y) => y !== d) : [...x.days, d].sort() }))

  return (
    <Dialog open={block !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{block === 'new' ? 'New routine' : 'Edit routine'}</DialogTitle>
          <DialogDescription>Repeats every week on the days you pick. Remember to save your changes.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {block === 'new' && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Start from a template</Label>
              <div className="flex flex-wrap gap-1.5">
                {TEMPLATES.map(({ glyph, ...t }) => (
                  <button
                    key={t.name}
                    type="button"
                    onClick={() => setB((x) => ({ ...x, ...structuredClone(t) }))}
                    className={cn(
                      'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm transition-all hover:bg-muted active:scale-95',
                      b.name === t.name && 'border-primary bg-accent',
                    )}
                  >
                    <span>{glyph}</span>
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="block-name">Name</Label>
              <Input id="block-name" autoFocus value={b.name} maxLength={60} placeholder="e.g. Deep work" onChange={(e) => setB({ ...b, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Colour</Label>
              <div className="flex h-9 items-center gap-1">
                {BLOCK_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={c}
                    onClick={() => setB({ ...b, color: c })}
                    className="flex size-5 items-center justify-center rounded-full transition-transform hover:scale-110"
                    style={{ backgroundColor: BLOCK_HEX[c] }}
                  >
                    {b.color === c && <Check className="size-3 text-white" strokeWidth={3} />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Days</Label>
            <div className="flex gap-1.5">
              {WEEK_ORDER.map((d) => (
                <button
                  key={d}
                  type="button"
                  title={DAY_LONG[d]}
                  onClick={() => toggleDay(d)}
                  className={cn(
                    'size-9 rounded-full border text-sm font-medium transition-all active:scale-90',
                    b.days.includes(d) ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted',
                  )}
                >
                  {DAY_LETTER[d]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label>From</Label>
              <Input type="time" disabled={allDay} value={toInputTime(b.start)} onChange={(e) => e.target.value && setB({ ...b, start: fromInputTime(e.target.value) })} className="w-32 tabular-nums" />
            </div>
            <div className="space-y-1.5">
              <Label>To</Label>
              <Input type="time" disabled={allDay} value={toInputTime(b.end)} onChange={(e) => e.target.value && setB({ ...b, end: fromInputTime(e.target.value) })} className="w-32 tabular-nums" />
            </div>
            <label className="flex h-9 cursor-pointer items-center gap-2 text-sm">
              <Switch checked={allDay} onCheckedChange={(v) => setB({ ...b, start: v ? 0 : 9 * 60, end: v ? 0 : 17 * 60 })} /> All day
            </label>
          </div>
          {!allDay && b.end < b.start && <p className="-mt-3 text-xs text-muted-foreground">Ends the next morning.</p>}

          <div className="space-y-1.5">
            <Label>Status during this routine</Label>
            <StateEditor value={b.state} onChange={(state) => setB({ ...b, state })} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!valid}
            onClick={() => {
              onSave({ ...b, name: b.name.trim() })
              onClose()
            }}
          >
            {block === 'new' ? 'Add routine' : 'Done'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
