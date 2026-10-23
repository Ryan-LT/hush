import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function SectionCard({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
  tour,
}: {
  /** Anchor for the onboarding tour */
  tour?: string
  title?: ReactNode
  description?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section data-tour={tour} className={cn('rounded-2xl border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.03)]', className)}>
      {(title || action) && (
        <header className="flex flex-col gap-3 px-5 pt-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            {title && <h2 className="font-semibold tracking-tight">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
          </div>
          {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
        </header>
      )}
      <div className={cn('p-5', bodyClassName)}>{children}</div>
    </section>
  )
}

export function StatusPreview({ emoji, text, dnd, away, className }: { emoji: ReactNode; text: string; dnd?: boolean; away?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-1.5 text-sm', className)}>
      <span className="shrink-0 text-base leading-none">{emoji}</span>
      <span className={cn('truncate', !text && 'text-muted-foreground')}>{text || 'No status text'}</span>
      {away && <span className="shrink-0 rounded-full border px-1.5 text-[10px] text-muted-foreground">Away</span>}
      {dnd && <span className="shrink-0 rounded-full bg-primary/10 px-1.5 text-[10px] font-medium text-primary">DND</span>}
    </span>
  )
}
