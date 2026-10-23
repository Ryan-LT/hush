'use client'

import { BellOff, Moon } from 'lucide-react'
import { motion } from 'motion/react'
import { useMemo } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { COLORS, segmentsForDay } from '@/shared/engine'
import { addDays, localParts, weekdayOf, zonedTime, type LocalDate } from '@/shared/time'
import type { EngineInput, Segment } from '@/shared/types'
import { DAY_SHORT, fmtTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Emoji } from '../status/emoji'

const hourLabel = (h: number) => new Intl.DateTimeFormat(undefined, { hour: 'numeric', timeZone: 'UTC' }).format(Date.UTC(2000, 0, 1, h % 24))

interface Day {
  date: LocalDate
  weekday: number
  start: number
  end: number
  segments: Segment[]
  isToday: boolean
}

function SegmentBlock({ seg, day, tz, row }: { seg: Segment; day: Day; tz: string; row: number }) {
  const { resolved } = seg
  const len = day.end - day.start
  const left = ((seg.start - day.start) / len) * 100
  const width = ((seg.end - seg.start) / len) * 100
  const solid = resolved.kind !== 'offline' && resolved.kind !== 'working'
  const emoji = resolved.state.emoji
  const showGlyph = width > 3.5
  const showText = width > (solid ? 9 : 14)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.div
          initial={{ opacity: 0, left: `${left}%`, width: `${width}%` }}
          animate={{ opacity: 1, left: `${left}%`, width: `${width}%` }}
          transition={{ opacity: { duration: 0.35, delay: row * 0.04 }, default: { type: 'spring', stiffness: 380, damping: 36 } }}
          style={{ backgroundColor: resolved.kind === 'working' ? `${COLORS.working}24` : resolved.color }}
          className={cn(
            'absolute inset-y-[3px] flex cursor-default items-center gap-1 overflow-hidden rounded-md px-1.5 text-[11px] font-medium whitespace-nowrap',
            solid ? 'text-white shadow-[inset_0_0_0_1px_rgb(255_255_255/0.12)]' : 'text-emerald-700 dark:text-emerald-300',
            resolved.kind === 'override' && 'stripes',
          )}
        >
          {showGlyph && emoji && <Emoji code={emoji} className="text-[12px]" />}
          {showText && <span className="truncate max-sm:hidden">{resolved.kind === 'working' ? resolved.state.text || 'Working' : resolved.label}</span>}
        </motion.div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-64">
        <div className="flex items-center gap-1.5 font-medium">
          {emoji && <Emoji code={emoji} />}
          {resolved.label}
        </div>
        <div className="opacity-70">
          {fmtTime(seg.start, tz)} – {fmtTime(seg.end, tz)}
        </div>
        {(resolved.state.text || resolved.state.dnd || resolved.state.presence === 'away') && (
          <div className="mt-1 flex items-center gap-2 opacity-90">
            {resolved.state.text && <span className="truncate">“{resolved.state.text}”</span>}
            {resolved.state.presence === 'away' && <Moon className="size-3 shrink-0" />}
            {resolved.state.dnd && <BellOff className="size-3 shrink-0" />}
          </div>
        )}
      </TooltipContent>
    </Tooltip>
  )
}

/** Non-off-hours segments keyed by source and occurrence, e.g. "working--1" for the afternoon block. */
function withKeys(segments: Segment[]): [string, Segment][] {
  const seen = new Map<string, number>()
  return segments
    .filter((s) => s.resolved.kind !== 'offline')
    .map((s) => {
      const base = `${s.resolved.kind}-${s.resolved.refId ?? ''}`
      const n = seen.get(base) ?? 0
      seen.set(base, n + 1)
      return [`${base}-${n}`, s]
    })
}

export function WeekTimeline({
  input,
  now,
  startOn = 'week',
  previewAt = null,
  onPick,
}: {
  input: EngineInput
  now: number
  startOn?: 'week' | 'today'
  /** A picked moment to mark on the timeline */
  previewAt?: number | null
  /** Click anywhere on a day to pick that moment */
  onPick?: (t: number) => void
}) {
  const tz = input.settings.timezone
  const today = localParts(now, tz)
  const offset = startOn === 'week' ? -((today.weekday + 6) % 7) : 0
  const first = addDays(today, offset)
  const firstKey = `${first.year}-${first.month}-${first.day}`

  const days: Day[] = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const date = addDays(first, i)
        return {
          date,
          weekday: weekdayOf(date),
          start: zonedTime(date, 0, tz),
          end: zonedTime(addDays(date, 1), 0, tz),
          segments: segmentsForDay(input, date),
          isToday: i === -offset,
        }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [input, firstKey, offset, tz],
  )

  return (
    <div className="select-none">
      <div className="mb-1.5 grid grid-cols-[44px_1fr] gap-3 sm:grid-cols-[52px_1fr]">
        <div />
        <div className="relative h-4 text-[10px] text-muted-foreground">
          {[0, 6, 12, 18, 24].map((h) => (
            <span
              key={h}
              className="absolute whitespace-nowrap"
              style={{ left: `${(h / 24) * 100}%`, transform: h === 0 ? 'none' : h === 24 ? 'translateX(-100%)' : 'translateX(-50%)' }}
            >
              {hourLabel(h)}
            </span>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        {days.map((day, row) => {
          const nowLeft = ((now - day.start) / (day.end - day.start)) * 100
          return (
            <div key={`${day.date.month}-${day.date.day}`} className="grid grid-cols-[44px_1fr] items-center gap-3 sm:grid-cols-[52px_1fr]">
              <div className={cn('flex items-baseline gap-1.5 text-xs text-muted-foreground', day.isToday && 'text-foreground')}>
                <span className={cn('font-medium', day.isToday && 'text-primary')}>{DAY_SHORT[day.weekday]}</span>
                <span className="tabular-nums opacity-70">{day.date.day}</span>
              </div>
              <div
                className={cn('relative h-9 overflow-hidden rounded-lg bg-muted/40 hatch ring-1 ring-border/60 ring-inset', day.isToday && 'ring-primary/30', onPick && 'cursor-pointer')}
                onClick={
                  onPick &&
                  ((e) => {
                    const r = e.currentTarget.getBoundingClientRect()
                    const frac = Math.min(Math.max((e.clientX - r.left) / r.width, 0), 0.9999)
                    // Snap to 5 minutes
                    const t = day.start + frac * (day.end - day.start)
                    onPick(Math.round(t / 300_000) * 300_000)
                  })
                }
              >
                {[6, 12, 18].map((h) => (
                  <div key={h} className="absolute inset-y-0 w-px bg-border/80" style={{ left: `${(h / 24) * 100}%` }} />
                ))}
                {/* Off hours are the hatched background; keys stay stable while editing so blocks resize instead of remounting */}
                {withKeys(day.segments).map(([key, seg]) => (
                  <SegmentBlock key={key} seg={seg} day={day} tz={tz} row={row} />
                ))}
                {previewAt !== null && previewAt >= day.start && previewAt < day.end && (
                  <div
                    className="pointer-events-none absolute inset-y-0 z-20 w-0 border-l-2 border-dashed border-primary"
                    style={{ left: `${((previewAt - day.start) / (day.end - day.start)) * 100}%` }}
                  >
                    <span className="absolute -top-0.5 -left-[5px] size-2 rounded-full bg-primary ring-2 ring-card" />
                  </div>
                )}
                {day.isToday && nowLeft >= 0 && nowLeft <= 100 && (
                  <div className="pointer-events-none absolute inset-y-0 z-10 w-0.5 bg-foreground transition-[left] duration-1000" style={{ left: `${nowLeft}%` }}>
                    <span className="absolute -top-0.5 -left-[3px] size-2 rounded-full bg-foreground" />
                    <span className="absolute -top-0.5 -left-[3px] size-2 animate-ping rounded-full bg-foreground/60" />
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Small legend chips for the kinds of segments in a schedule. */
export function TimelineLegend({ input }: { input: EngineInput }) {
  const items = [
    { label: 'Working', swatch: <span className="size-2.5 rounded-sm" style={{ background: `${COLORS.working}55` }} /> },
    { label: 'Off hours', swatch: <span className="size-2.5 rounded-sm hatch ring-1 ring-border" /> },
    ...(input.events.length ? [{ label: 'Calendar', swatch: <span className="size-2.5 rounded-sm" style={{ background: COLORS.event }} /> }] : []),
    ...(input.overrides.length ? [{ label: 'Override', swatch: <span className="size-2.5 rounded-sm stripes" style={{ background: COLORS.override }} /> }] : []),
  ]
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          {i.swatch}
          {i.label}
        </span>
      ))}
    </div>
  )
}
