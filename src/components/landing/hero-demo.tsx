'use client'

import { Pause, Play } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { DEMO_DATE, landingDemoInput } from '@/shared/demo'
import { COLORS, nextChange, resolveAt, segmentsForDay } from '@/shared/engine'
import { emojiGlyph } from '@/shared/emoji'
import { zonedTime } from '@/shared/time'
import { fmtClock } from '@/lib/format'
import { cn } from '@/lib/utils'
import { SlackWindow } from '../slack/slack-preview'

const FROM = 7 * 60
const TO = 19 * 60 + 30
const STEP = 2 // minutes per tick

export function HeroDemo() {
  const input = useMemo(landingDemoInput, [])
  const dayStart = zonedTime(DEMO_DATE, 0, 'UTC')
  const segments = useMemo(() => segmentsForDay(input, DEMO_DATE).filter((s) => s.end > dayStart + FROM * 60_000 && s.start < dayStart + TO * 60_000), [input, dayStart])
  const reduced = useReducedMotion()
  const [minute, setMinute] = useState(9 * 60 + 40)
  const [playing, setPlaying] = useState(true)
  const hovering = useRef(false)

  useEffect(() => {
    if (!playing || reduced) return
    const id = setInterval(() => {
      if (hovering.current) return
      setMinute((m) => (m + STEP > TO ? FROM : m + STEP))
    }, 45)
    return () => clearInterval(id)
  }, [playing, reduced])

  const t = dayStart + minute * 60_000
  const resolved = resolveAt(input, t)
  const { until } = nextChange(input, t, 'state')
  const pct = (m: number) => ((m - FROM) / (TO - FROM)) * 100
  const segMin = (ms: number) => Math.min(Math.max((ms - dayStart) / 60_000, FROM), TO)

  return (
    <div
      className="relative"
      onMouseEnter={() => (hovering.current = true)}
      onMouseLeave={() => (hovering.current = false)}
    >
      <SlackWindow
        name="Alex Rivera"
        teamName="Acme Inc."
        state={resolved.state}
        clearsAt={until ? fmtClock((until - dayStart) / 60_000) : null}
      />

      <div className="mt-4 rounded-2xl border bg-card/80 p-4 shadow-lg backdrop-blur">
        <div className="mb-3 flex items-center gap-3">
          <button
            type="button"
            aria-label={playing ? 'Pause demo' : 'Play demo'}
            onClick={() => setPlaying((p) => !p)}
            className="flex size-8 items-center justify-center rounded-full border transition hover:bg-muted"
          >
            {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
          </button>
          <div className="font-mono text-2xl font-medium tracking-tight tabular-nums">{fmtClock(minute)}</div>
          <div className="ml-auto flex min-w-0 items-center gap-2 text-sm">
            <span className="size-2 shrink-0 rounded-full transition-colors" style={{ backgroundColor: resolved.color }} />
            <span className="truncate text-muted-foreground">{resolved.kind === 'offline' ? 'Off hours' : resolved.kind === 'working' ? 'Working hours' : resolved.label}</span>
          </div>
        </div>
        <div className="relative h-10">
          <div className="absolute inset-0 overflow-hidden rounded-lg bg-muted/50 ring-1 ring-border ring-inset">
            {segments.map((s, i) => {
              const a = segMin(s.start)
              const b = segMin(s.end)
              const r = s.resolved
              const solid = r.kind !== 'offline' && r.kind !== 'working'
              return (
                <div
                  key={i}
                  className={cn('absolute flex items-center justify-center overflow-hidden text-sm', r.kind === 'offline' ? 'inset-y-0 hatch' : 'inset-y-1 rounded-md')}
                  style={{
                    left: `${pct(a)}%`,
                    width: `${pct(b) - pct(a)}%`,
                    backgroundColor: r.kind === 'offline' ? undefined : r.kind === 'working' ? `${COLORS.working}2a` : r.color,
                    color: solid ? 'white' : undefined,
                  }}
                >
                  {solid && pct(b) - pct(a) > 4 && emojiGlyph(r.state.emoji)}
                </div>
              )
            })}
          </div>
          <motion.div className="pointer-events-none absolute -inset-y-1 z-10 w-0.5 rounded-full bg-foreground" style={{ left: `${pct(minute)}%` }}>
            <span className="absolute -top-1 -left-[5px] size-3 rounded-full border-2 border-background bg-foreground" />
          </motion.div>
          <input
            type="range"
            aria-label="Time of day"
            min={FROM}
            max={TO}
            step={5}
            value={minute}
            onChange={(e) => {
              setPlaying(false)
              setMinute(Number(e.target.value))
            }}
            className="absolute inset-0 z-20 w-full cursor-ew-resize opacity-0"
          />
        </div>
        <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground">
          <span>{fmtClock(FROM)}</span>
          <span>Drag to scrub through a day</span>
          <span>{fmtClock(TO)}</span>
        </div>
      </div>
    </div>
  )
}
