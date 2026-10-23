'use client'

import { ArrowRight, BellOff, Circle, CircleDot, X } from 'lucide-react'
import { motion } from 'motion/react'
import { Button } from '@/components/ui/button'
import type { Resolved, SourceKind } from '@/shared/types'
import { api } from '@/lib/api'
import { fmtDuration, fmtWhen } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Emoji } from '../status/emoji'
import { Swap } from '../swap'
import { useHush } from './store'

export const SOURCE_LABEL: Record<SourceKind, string> = {
  override: 'Override',
  rule: 'Calendar rule',
  event: 'Calendar',
  block: 'Routine',
  working: 'Working hours',
  offline: 'Off hours',
}

/** Where a state comes from: "Working hours", or the routine / event / override name. */
export const sourceText = (r: Resolved) => (r.kind === 'working' || r.kind === 'offline' ? SOURCE_LABEL[r.kind] : r.label)

export function NowCard() {
  const { current, now, draft, me, run } = useHush()
  const tz = draft.timezone
  const { state } = current
  const key = `${current.kind}|${current.label}|${state.emoji}|${state.text}`

  return (
    <section data-tour="now" className="relative overflow-hidden rounded-2xl border bg-card">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full blur-3xl"
        animate={{ backgroundColor: current.color, opacity: 0.16 }}
        transition={{ duration: 0.8 }}
      />
      <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
        <div className="grid size-20 shrink-0 place-items-center rounded-3xl shadow-inner transition-colors duration-500" style={{ backgroundColor: `${current.color}1f` }}>
          <Swap id={state.emoji} variant="pop" className="text-[44px] leading-none">
            {state.emoji ? <Emoji code={state.emoji} /> : <span className="text-3xl text-muted-foreground/50">–</span>}
          </Swap>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2 text-xs font-medium text-muted-foreground">
            <span className="relative flex size-2 shrink-0">
              {me.autopilot && <span className="absolute inline-flex size-full animate-ping rounded-full opacity-60" style={{ backgroundColor: current.color }} />}
              <span className="relative inline-flex size-2 rounded-full" style={{ backgroundColor: current.color }} />
            </span>
            <span className="truncate">
              {me.autopilot ? 'Right now' : 'Preview · autopilot off'} · {SOURCE_LABEL[current.kind]}
              {current.kind !== 'working' && current.kind !== 'offline' && <span className="text-foreground/80"> · {current.label}</span>}
            </span>
          </div>
          <h1 className={cn('mt-1.5 text-2xl font-semibold tracking-tight sm:text-[28px]', !state.text && 'text-muted-foreground')}>
            <Swap id={key}>
              <span className="block truncate">{state.text || 'No status'}</span>
            </Swap>
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full border bg-background/60 px-2.5 py-1">
              {state.presence === 'auto' ? <CircleDot className="size-3.5 text-emerald-500" /> : <Circle className="size-3.5 text-muted-foreground" />}
              {state.presence === 'auto' ? 'Active' : 'Away'}
            </span>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition-colors',
                state.dnd ? 'border-primary/30 bg-primary/10 text-primary' : 'bg-background/60 text-muted-foreground',
              )}
            >
              <BellOff className="size-3.5" />
              {state.dnd ? 'Notifications paused' : 'Notifications on'}
            </span>
            {current.until && (
              <span className="inline-flex items-center gap-1.5 rounded-full border bg-background/60 px-2.5 py-1 text-muted-foreground">
                until {fmtWhen(current.until, tz, now)}
                <span className="text-muted-foreground/60">· {fmtDuration(current.until - now)}</span>
              </span>
            )}
          </div>
        </div>

        {current.kind === 'override' && current.refId && (
          <Button variant="outline" size="sm" className="self-start sm:self-center" onClick={() => run(api.removeOverride(current.refId!), 'Override cleared')}>
            <X /> Clear
          </Button>
        )}
      </div>

      {current.next && current.until && (
        <div className="relative flex items-center gap-2 border-t bg-muted/30 px-5 py-2.5 text-xs text-muted-foreground sm:px-6">
          <ArrowRight className="size-3.5" />
          <span>
            At <span className="font-medium text-foreground">{fmtWhen(current.until, tz, now)}</span>
          </span>
          <span className="flex min-w-0 items-center gap-1.5">
            {current.next.state.emoji ? <Emoji code={current.next.state.emoji} /> : <span className="size-2 rounded-full" style={{ backgroundColor: current.next.color }} />}
            <span className="truncate">{current.next.state.text || 'No status'}</span>
          </span>
          <span className="ml-auto hidden shrink-0 sm:inline">{sourceText(current.next)}</span>
        </div>
      )}
    </section>
  )
}
