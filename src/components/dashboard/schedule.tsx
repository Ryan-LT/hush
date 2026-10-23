'use client'

import { Copy, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Switch } from '@/components/ui/switch'
import { BLOCK_HEX } from '@/shared/engine'
import type { Block } from '@/shared/types'
import { DAY_LONG, fmtDuration, fmtRange, fromInputTime, summarizeDays, toInputTime, WEEK_ORDER } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Emoji } from '../status/emoji'
import { StateEditor } from '../status/state-editor'
import { BlockDialog } from './block-dialog'
import { SectionCard, StatusPreview } from './section-card'
import { useHush } from './store'

function TimeInput({ value, onChange, disabled }: { value: number; onChange: (m: number) => void; disabled?: boolean }) {
  return (
    <input
      type="time"
      value={toInputTime(value)}
      disabled={disabled}
      onChange={(e) => e.target.value && onChange(fromInputTime(e.target.value))}
      className="h-9 rounded-lg border bg-background px-2.5 text-sm tabular-nums transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/40 disabled:opacity-40"
    />
  )
}

export function WorkingHours() {
  const { draft, update } = useHush()
  const copyMonday = () => {
    update((d) => {
      for (const day of [2, 3, 4, 5]) d.workingHours[day] = { ...d.workingHours[1] }
    })
    toast.success('Copied Monday to Tuesday–Friday')
  }
  return (
    <SectionCard
      title="Working hours"
      description="Inside these hours you get your working status; outside them, your off-hours status."
      action={
        <Button variant="outline" size="sm" onClick={copyMonday}>
          <Copy /> Copy Monday to weekdays
        </Button>
      }
    >
      <div className="divide-y">
        {WEEK_ORDER.map((d) => {
          const h = draft.workingHours[d]
          const length = ((h.end - h.start + 1440) % 1440 || 1440) * 60_000
          return (
            <div key={d} className="flex flex-wrap items-center gap-3 py-2.5 first:pt-0 last:pb-0">
              <Switch checked={h.enabled} onCheckedChange={(v) => update((s) => void (s.workingHours[d].enabled = v))} aria-label={`Work on ${DAY_LONG[d]}`} />
              <span className={cn('w-24 text-sm font-medium', !h.enabled && 'text-muted-foreground')}>{DAY_LONG[d]}</span>
              <AnimatePresence mode="wait" initial={false}>
                {h.enabled ? (
                  <motion.div key="on" initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                    <TimeInput value={h.start} onChange={(m) => update((s) => void (s.workingHours[d].start = m))} />
                    <span className="text-muted-foreground">–</span>
                    <TimeInput value={h.end} onChange={(m) => update((s) => void (s.workingHours[d].end = m))} />
                    <span className="ml-1 hidden text-xs text-muted-foreground tabular-nums sm:inline">
                      {fmtDuration(length)}
                      {h.end <= h.start && ' · overnight'}
                    </span>
                  </motion.div>
                ) : (
                  <motion.span key="off" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm text-muted-foreground">
                    Day off
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
      <div className="mt-5 rounded-xl border bg-muted/30 p-4">
        <div className="mb-3">
          <div className="text-sm font-medium">Status while working</div>
          <div className="text-xs text-muted-foreground">Most people leave this empty, or use something like 🟢 Available.</div>
        </div>
        <StateEditor value={draft.working} onChange={(v) => update((s) => void (s.working = v))} placeholder="No status while working" />
      </div>
    </SectionCard>
  )
}

export function OffHours() {
  const { draft, update } = useHush()
  return (
    <SectionCard title="Off hours" description="Evenings, weekends and days off.">
      <StateEditor value={draft.offline} onChange={(v) => update((s) => void (s.offline = v))} />
    </SectionCard>
  )
}

export function Routines() {
  const { draft, update } = useHush()
  const [editing, setEditing] = useState<Block | 'new' | null>(null)

  const remove = (b: Block) => {
    update((s) => void (s.blocks = s.blocks.filter((x) => x.id !== b.id)))
    toast(`Removed “${b.name}”`, {
      action: { label: 'Undo', onClick: () => update((s) => void s.blocks.splice(draft.blocks.indexOf(b), 0, b)) },
    })
  }
  const move = (b: Block, dir: -1 | 1) =>
    update((s) => {
      const i = s.blocks.findIndex((x) => x.id === b.id)
      const j = i + dir
      if (j < 0 || j >= s.blocks.length) return
      ;[s.blocks[i], s.blocks[j]] = [s.blocks[j], s.blocks[i]]
    })

  return (
    <SectionCard
      title="Routines"
      description="Repeating slots like lunch or deep work. Higher in the list wins when two overlap."
      action={
        <Button size="sm" onClick={() => setEditing('new')}>
          <Plus /> Add routine
        </Button>
      }
    >
      {draft.blocks.length === 0 ? (
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="flex w-full flex-col items-center gap-1 rounded-xl border border-dashed py-8 text-sm text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
        >
          <span className="text-2xl">🥪 🎧 🏋️</span>
          Add lunch, focus blocks, school runs…
        </button>
      ) : (
        <ul className="space-y-2">
          <AnimatePresence initial={false}>
            {draft.blocks.map((b, i) => (
              <motion.li
                key={b.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -12 }}
                className={cn('group flex items-center gap-3 rounded-xl border bg-background p-3 pl-0 transition-opacity', !b.enabled && 'opacity-55')}
              >
                <span className="h-10 w-1 shrink-0 rounded-r-full" style={{ backgroundColor: BLOCK_HEX[b.color] }} />
                <button type="button" onClick={() => setEditing(b)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl text-xl" style={{ backgroundColor: `${BLOCK_HEX[b.color]}1f` }}>
                    <Emoji code={b.state.emoji} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{b.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {summarizeDays(b.days)} · {fmtRange(b.start, b.end)}
                    </span>
                  </span>
                  <StatusPreview
                    emoji={null}
                    text={b.state.text}
                    dnd={b.state.dnd}
                    away={b.state.presence === 'away'}
                    className="hidden max-w-56 text-muted-foreground md:inline-flex"
                  />
                </button>
                <Switch checked={b.enabled} onCheckedChange={(v) => update((s) => void (s.blocks[i].enabled = v))} aria-label={`Enable ${b.name}`} />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label="More">
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditing(b)}>
                      <Pencil /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled={i === 0} onClick={() => move(b, -1)}>
                      Move up
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled={i === draft.blocks.length - 1} onClick={() => move(b, 1)}>
                      Move down
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => remove(b)}>
                      <Trash2 /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
      <BlockDialog
        block={editing}
        onClose={() => setEditing(null)}
        onSave={(b) =>
          update((s) => {
            const i = s.blocks.findIndex((x) => x.id === b.id)
            if (i >= 0) s.blocks[i] = b
            else s.blocks.push(b)
          })
        }
      />
    </SectionCard>
  )
}
