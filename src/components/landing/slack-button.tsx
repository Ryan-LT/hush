import { cn } from '@/lib/utils'

export function SlackMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 54 54" className={cn('size-4', className)} aria-hidden>
      <path fill="#36C5F0" d="M19.7 0a5.4 5.4 0 1 0 0 10.8h5.4V5.4A5.4 5.4 0 0 0 19.7 0Zm0 14.4H5.4a5.4 5.4 0 1 0 0 10.8h14.3a5.4 5.4 0 1 0 0-10.8Z" />
      <path fill="#2EB67D" d="M54 19.8a5.4 5.4 0 1 0-10.8 0v5.4h5.4a5.4 5.4 0 0 0 5.4-5.4Zm-14.4 0V5.4a5.4 5.4 0 1 0-10.8 0v14.4a5.4 5.4 0 1 0 10.8 0Z" />
      <path fill="#ECB22E" d="M34.2 54a5.4 5.4 0 1 0 0-10.8h-5.4v5.4a5.4 5.4 0 0 0 5.4 5.4Zm0-14.4h14.4a5.4 5.4 0 1 0 0-10.8H34.2a5.4 5.4 0 1 0 0 10.8Z" />
      <path fill="#E01E5A" d="M0 34.2a5.4 5.4 0 1 0 10.8 0v-5.4H5.4A5.4 5.4 0 0 0 0 34.2Zm14.4 0v14.4a5.4 5.4 0 1 0 10.8 0V34.2a5.4 5.4 0 1 0-10.8 0Z" />
    </svg>
  )
}

export function SlackButton({ className, label = 'Add to Slack — it’s free', size = 'default' }: { className?: string; label?: string; size?: 'default' | 'lg' }) {
  return (
    <a
      href="/auth/slack"
      className={cn(
        'group relative inline-flex items-center justify-center gap-2.5 overflow-hidden rounded-xl bg-foreground font-medium text-background shadow-lg shadow-foreground/10 transition-all hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0',
        size === 'lg' ? 'h-12 px-6 text-[15px]' : 'h-10 px-4 text-sm',
        className,
      )}
    >
      <span className="flex size-6 items-center justify-center rounded-md bg-white">
        <SlackMark />
      </span>
      {label}
      <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
    </a>
  )
}
