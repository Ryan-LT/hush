'use client'

import { ChevronDown, Pause, Play, Power } from 'lucide-react'
import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { nextChange } from '@/shared/engine'
import { DAY_MS, HOUR_MS } from '@/shared/time'
import type { EngineInput } from '@/shared/types'
import { api } from '@/lib/api'
import { fmtWhen } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useHush } from './store'

/** Next time working hours begin (for "pause until tomorrow"), or 08:00-ish tomorrow if none. */
export function nextWorkStart(input: EngineInput, now: number) {
  let t = now
  for (let i = 0; i < 40; i++) {
    const { until, next } = nextChange(input, t, 'source', 8 * DAY_MS)
    if (!until || !next) break
    if (next.kind === 'working' && until - now > HOUR_MS) return until
    t = until
  }
  return now + 16 * HOUR_MS
}

export function usePauseOptions() {
  const { input, now, draft } = useHush()
  return useMemo(() => {
    const tomorrow = nextWorkStart(input, now)
    return [
      { id: 'hour', label: 'Pause for 1 hour', until: now + HOUR_MS },
      { id: 'tomorrow', label: `Pause until ${fmtWhen(tomorrow, draft.timezone, now)}`, until: tomorrow },
      { id: 'off', label: 'Turn off', until: null },
    ]
    // Recomputed each minute via `now`
  }, [input, now, draft.timezone])
}

/** Autopilot pill for the top bar: on → menu with pause options; off/paused → one click resumes. */
export function AutopilotControl() {
  const { me, run, now, draft } = useHush()
  const options = usePauseOptions()

  if (!me.autopilot) {
    return (
      <button
        type="button"
        data-tour="autopilot"
        onClick={() => run(api.setAutopilot(true), 'Autopilot on')}
        className="flex items-center gap-2 rounded-full border py-1 pr-1 pl-1 text-xs font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground sm:pl-3"
      >
        <span className="hidden sm:inline">{me.resumeAt ? `Paused until ${fmtWhen(me.resumeAt, draft.timezone, now)}` : 'Autopilot off'}</span>
        <span className="flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[11px] text-primary-foreground">
          <Play className="size-3" /> {me.resumeAt ? 'Resume' : 'Turn on'}
        </span>
      </button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          data-tour="autopilot"
          className={cn(
            'flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 py-1 pr-2 pl-2.5 text-xs font-medium whitespace-nowrap text-emerald-700 transition-colors outline-none hover:bg-emerald-500/15 focus-visible:ring-3 focus-visible:ring-ring/50 dark:text-emerald-300',
          )}
        >
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          Autopilot on
          <ChevronDown className="size-3.5 opacity-70" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Hush is keeping Slack in sync</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((o) => (
          <DropdownMenuItem
            key={o.id}
            variant={o.id === 'off' ? 'destructive' : 'default'}
            onClick={() => run(api.setAutopilot(false, o.until), o.until ? `Paused until ${fmtWhen(o.until, draft.timezone, now)}` : 'Autopilot off')}
          >
            {o.id === 'off' ? <Power /> : <Pause />} {o.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Full-width controls for Settings. */
export function AutopilotButtons() {
  const { me, run, now, draft } = useHush()
  const options = usePauseOptions()
  if (!me.autopilot) {
    return (
      <Button onClick={() => run(api.setAutopilot(true), 'Autopilot on')}>
        <Play /> {me.resumeAt ? 'Resume now' : 'Turn on autopilot'}
      </Button>
    )
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <Button
          key={o.id}
          variant={o.id === 'off' ? 'destructive' : 'outline'}
          onClick={() => run(api.setAutopilot(false, o.until), o.until ? `Paused until ${fmtWhen(o.until, draft.timezone, now)}` : 'Autopilot off')}
        >
          {o.id === 'off' ? <Power /> : <Pause />} {o.label}
        </Button>
      ))}
    </div>
  )
}
