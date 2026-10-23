'use client'

import { useMemo } from 'react'
import { nextChange } from '@/shared/engine'
import { DAY_MS } from '@/shared/time'
import type { Resolved } from '@/shared/types'
import { fmtWhen } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Emoji } from '../status/emoji'
import { sourceText } from './now-card'
import { SectionCard } from './section-card'
import { useHush } from './store'

export function ComingUp() {
  const { input, now, draft } = useHush()
  const items = useMemo(() => {
    const out: { at: number; r: Resolved }[] = []
    let t = now
    for (let i = 0; i < 6; i++) {
      const { until, next } = nextChange(input, t, 'source', DAY_MS * 2)
      if (!until || !next || until > now + DAY_MS * 1.5) break
      out.push({ at: until, r: next })
      t = until
    }
    return out
  }, [input, now])

  return (
    <SectionCard title="Coming up" description="What Slack will show next.">
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing changes in the next day.</p>
      ) : (
        <ol className="relative space-y-3 before:absolute before:top-2 before:bottom-2 before:left-[5px] before:w-px before:bg-border">
          {items.map(({ at, r }) => (
            <li key={at} className="relative flex items-center gap-3 pl-6">
              <span className="absolute top-1/2 left-0 size-[11px] -translate-y-1/2 rounded-full border-2 border-card" style={{ backgroundColor: r.color }} />
              <span className="w-28 shrink-0 text-xs text-muted-foreground tabular-nums">{fmtWhen(at, draft.timezone, now)}</span>
              <span className="flex w-5 justify-center text-base leading-none">{r.state.emoji ? <Emoji code={r.state.emoji} /> : '·'}</span>
              <span className={cn('min-w-0 flex-1 truncate text-sm', !r.state.text && 'text-muted-foreground')}>{r.state.text || 'No status'}</span>
              <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">{sourceText(r)}</span>
            </li>
          ))}
        </ol>
      )}
    </SectionCard>
  )
}
