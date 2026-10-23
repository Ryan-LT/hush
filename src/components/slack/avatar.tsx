import type { Presence } from '@/shared/types'
import { cn } from '@/lib/utils'

const GRADIENTS = ['from-violet-500 to-fuchsia-500', 'from-sky-500 to-indigo-500', 'from-amber-400 to-orange-500', 'from-emerald-400 to-teal-500', 'from-rose-400 to-pink-500']

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')
}

export function SlackAvatar({
  name,
  src,
  presence,
  size = 40,
  className,
}: {
  name: string
  src?: string
  presence?: Presence
  size?: number
  className?: string
}) {
  const gradient = GRADIENTS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % GRADIENTS.length]
  return (
    <span className={cn('relative inline-flex shrink-0', className)} style={{ width: size, height: size }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="size-full rounded-[22%] object-cover" />
      ) : (
        <span
          className={cn('flex size-full items-center justify-center rounded-[22%] bg-gradient-to-br font-semibold text-white', gradient)}
          style={{ fontSize: size * 0.38 }}
        >
          {initials(name)}
        </span>
      )}
      {presence && (
        <span
          className="absolute -right-0.5 -bottom-0.5 rounded-full bg-card p-[2.5px]"
          style={{ width: Math.max(10, size * 0.32), height: Math.max(10, size * 0.32) }}
        >
          <span
            className={cn(
              'block size-full rounded-full transition-colors duration-500',
              presence === 'auto' ? 'bg-emerald-500' : 'border-2 border-muted-foreground/60 bg-transparent',
            )}
          />
        </span>
      )}
    </span>
  )
}
