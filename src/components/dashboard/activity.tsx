'use client'

import { AlertTriangle, Pause, Play } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { localParts } from '@/shared/time'
import type { ActivityItem } from '@/shared/types'
import { DAY_SHORT, fmtTime, fmtWhen } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Emoji } from '../status/emoji'
import { SectionCard } from './section-card'
import { useHush } from './store'

function dayLabel(t: number, tz: string, now: number) {
  const a = localParts(now, tz)
  const b = localParts(t, tz)
  const diff = Math.round((Date.UTC(a.year, a.month - 1, a.day) - Date.UTC(b.year, b.month - 1, b.day)) / 86_400_000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return `${DAY_SHORT[b.weekday]} ${b.day}/${b.month}`
}

function Icon({ item }: { item: ActivityItem }) {
  const base = 'flex size-8 shrink-0 items-center justify-center rounded-lg'
  if (item.kind === 'error') return <span className={cn(base, 'bg-amber-500/10 text-amber-600')}><AlertTriangle className="size-4" /></span>
  if (item.kind === 'pause') return <span className={cn(base, 'bg-muted text-muted-foreground')}><Pause className="size-4" /></span>
  if (item.kind === 'resume') return <span className={cn(base, 'bg-emerald-500/10 text-emerald-600')}><Play className="size-4" /></span>
  return <span className={cn(base, 'bg-muted text-lg')}>{item.emoji ? <Emoji code={item.emoji} /> : <span className="text-xs text-muted-foreground">–</span>}</span>
}

function describe(item: ActivityItem, tz: string, now: number) {
  if (item.kind === 'pause') return item.detail ? `Paused until ${fmtWhen(Number(item.detail), tz, now)}` : 'Autopilot turned off'
  if (item.kind === 'resume') return item.trigger === 'auto' ? 'Autopilot resumed on schedule' : 'Autopilot turned on'
  if (item.kind === 'error') return `Slack rejected “${item.text || 'status'}” (${item.detail})`
  return item.text || 'Cleared status'
}

/** What Hush changed in Slack, newest first. */
export function Activity() {
  const { me, draft, now } = useHush()
  const [all, setAll] = useState(false)
  const tz = draft.timezone
  const items = all ? me.activity : me.activity.slice(0, 6)

  return (
    <SectionCard title="Recent activity" description="Every change Hush made in Slack, and why.">
      {me.activity.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing yet. Changes show up here once autopilot is on.</p>
      ) : (
        <>
          <ul className="space-y-1">
            <AnimatePresence initial={false}>
              {items.map((item, i) => {
                const day = dayLabel(item.at, tz, now)
                const showDay = i === 0 || dayLabel(items[i - 1].at, tz, now) !== day
                return (
                  <motion.li key={item.id} layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    {showDay && <div className="pt-2 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase first:pt-0">{day}</div>}
                    <div className="flex items-center gap-3 rounded-xl px-1 py-1.5">
                      <Icon item={item} />
                      <div className="min-w-0 flex-1">
                        <div className={cn('truncate text-sm', item.kind === 'push' && !item.text && 'text-muted-foreground')}>{describe(item, tz, now)}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {item.kind === 'push' || item.kind === 'error' ? item.label : 'Autopilot'}
                          {item.trigger === 'manual' && ' · by you'}
                        </div>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{fmtTime(item.at, tz)}</span>
                    </div>
                  </motion.li>
                )
              })}
            </AnimatePresence>
          </ul>
          {me.activity.length > 6 && (
            <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={() => setAll(!all)}>
              {all ? 'Show less' : `Show ${me.activity.length - 6} more`}
            </Button>
          )}
        </>
      )}
    </SectionCard>
  )
}
