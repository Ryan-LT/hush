'use client'

import { Plus, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { QUICK_PRESETS } from '@/shared/defaults'
import { api } from '@/lib/api'
import { fmtDuration, fmtWhen } from '@/lib/format'
import { Emoji } from '../status/emoji'
import { OverrideDialog, type OverridePreset } from './override-dialog'
import { SectionCard } from './section-card'
import { useHush } from './store'

const hint = (m: number | 'today' | null) => (m === null ? 'Until cleared' : m === 'today' ? 'Rest of day' : fmtDuration(m * 60_000))

export function QuickActions() {
  const { me, now, draft, run } = useHush()
  const [preset, setPreset] = useState<OverridePreset | null>(null)
  const tz = draft.timezone

  return (
    <SectionCard tour="quick" title="Quick status" description="One tap overrides your schedule. Pick how long it lasts.">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {QUICK_PRESETS.map((p, i) => (
          <motion.button
            key={p.id}
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setPreset({ label: p.label, state: p.state, duration: p.minutes === null ? 'forever' : p.minutes })}
            className="group flex items-center gap-3 rounded-xl border bg-background p-3 text-left transition-colors hover:border-primary/40 hover:bg-accent/40"
          >
            <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-xl transition-transform group-hover:scale-110">
              <Emoji code={p.state.emoji} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{p.label}</span>
              <span className="block text-xs text-muted-foreground">{hint(p.minutes)}</span>
            </span>
          </motion.button>
        ))}
        <motion.button
          type="button"
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setPreset({ label: '', state: { emoji: '', text: '', presence: 'auto', dnd: false }, duration: 60 })}
          className="flex items-center gap-3 rounded-xl border border-dashed p-3 text-left text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        >
          <span className="flex size-9 items-center justify-center rounded-lg bg-muted">
            <Plus className="size-4" />
          </span>
          <span className="text-sm font-medium">Custom</span>
        </motion.button>
      </div>

      <AnimatePresence initial={false}>
        {me.overrides.length > 0 && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="mt-4 space-y-1.5 border-t pt-4">
              <div className="text-xs font-medium text-muted-foreground">Active & scheduled</div>
              <AnimatePresence initial={false}>
                {me.overrides.map((o) => {
                  const active = o.start <= now
                  return (
                    <motion.div
                      key={o.id}
                      layout
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8 }}
                      className="flex items-center gap-3 rounded-xl border bg-background px-3 py-2"
                    >
                      <Emoji code={o.state.emoji} className="text-lg" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{o.state.text || o.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {active ? 'Now' : fmtWhen(o.start, tz, now)} → {o.end ? fmtWhen(o.end, tz, now) : 'until cleared'}
                        </div>
                      </div>
                      {active && <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-medium text-rose-600 dark:text-rose-400">Live</span>}
                      <Button variant="ghost" size="icon-sm" aria-label="Remove override" onClick={() => run(api.removeOverride(o.id), 'Override removed')}>
                        <X />
                      </Button>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <OverrideDialog preset={preset} onOpenChange={(open) => !open && setPreset(null)} />
    </SectionCard>
  )
}
