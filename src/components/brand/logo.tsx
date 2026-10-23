import { useId } from 'react'
import { cn } from '@/lib/utils'

export function LogoMark({ className }: { className?: string }) {
  const id = useId()
  return (
    <svg viewBox="0 0 32 32" className={cn('size-7 shrink-0', className)} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6d5cff" />
          <stop offset="0.6" stopColor="#b44dff" />
          <stop offset="1" stopColor="#ff7f6e" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${id})`} />
      <path d="M15 9a8 8 0 1 0 7.9 9.3A7 7 0 0 1 15 9Z" fill="white" />
      <circle cx="23" cy="9.5" r="1.4" fill="white" opacity="0.85" />
    </svg>
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-[17px] font-semibold tracking-tight', className)}>
      <LogoMark />
      Hush
    </span>
  )
}
