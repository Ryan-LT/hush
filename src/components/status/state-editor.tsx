'use client'

import { BellOff, Clock } from 'lucide-react'
import { motion } from 'motion/react'
import { useId } from 'react'
import { ToggleGroup } from 'radix-ui'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import type { SlackState } from '@/shared/types'
import { cn } from '@/lib/utils'
import { EmojiPicker } from './emoji-picker'

const PRESENCE = [
  { value: 'auto', label: 'Active', pill: 'bg-emerald-500/15 ring-emerald-500/40', text: 'text-emerald-700 dark:text-emerald-300' },
  { value: 'away', label: 'Away', pill: 'bg-background ring-border shadow-sm', text: 'text-foreground' },
] as const

/** Segmented Active/Away switch; the selected side gets a sliding tinted pill. */
function PresenceToggle({ value, onChange }: { value: SlackState['presence']; onChange: (v: SlackState['presence']) => void }) {
  const pillId = useId()
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      onValueChange={(v) => v && onChange(v as SlackState['presence'])}
      aria-label="Presence"
      className="inline-flex h-8 items-center rounded-lg bg-muted p-0.5"
    >
      {PRESENCE.map((o) => {
        const on = value === o.value
        return (
          <ToggleGroup.Item
            key={o.value}
            value={o.value}
            className={cn(
              'relative flex h-full items-center gap-1.5 rounded-md px-3 text-[0.8rem] font-medium outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50',
              on ? o.text : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {on && <motion.span layoutId={pillId} className={cn('absolute inset-0 rounded-md ring-1', o.pill)} transition={{ type: 'spring', stiffness: 500, damping: 36 }} />}
            <span
              className={cn(
                'relative size-2 rounded-full transition-all',
                o.value === 'auto' ? (on ? 'bg-emerald-500 ring-3 ring-emerald-500/25' : 'bg-emerald-500/40') : 'border-[1.5px] border-current',
              )}
            />
            <span className="relative">{o.label}</span>
          </ToggleGroup.Item>
        )
      })}
    </ToggleGroup.Root>
  )
}

export function StateEditor({
  value,
  onChange,
  placeholder = 'What’s your status?',
  className,
}: {
  value: SlackState
  onChange: (next: SlackState) => void
  placeholder?: string
  className?: string
}) {
  const set = (patch: Partial<SlackState>) => onChange({ ...value, ...patch })
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2">
        <EmojiPicker value={value.emoji} onChange={(emoji) => set({ emoji })} />
        <div className="relative flex-1">
          <Input
            value={value.text}
            maxLength={100}
            onChange={(e) => set({ text: e.target.value })}
            placeholder={placeholder}
            className="h-10 rounded-xl pr-12"
          />
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 font-mono text-[10px] text-muted-foreground/70 tabular-nums">
            {100 - value.text.length}
          </span>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PresenceToggle value={value.presence} onChange={(presence) => set({ presence })} />
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm select-none" title="Adds “· until 1:00 PM” so people know when you’re back">
            <Clock className={cn('size-4 transition-colors', value.showUntil ? 'text-primary' : 'text-muted-foreground')} />
            Show end time
            <Switch checked={Boolean(value.showUntil)} onCheckedChange={(showUntil) => set({ showUntil })} />
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm select-none">
            <BellOff className={cn('size-4 transition-colors', value.dnd ? 'text-primary' : 'text-muted-foreground')} />
            Pause notifications
            <Switch checked={value.dnd} onCheckedChange={(dnd) => set({ dnd })} />
          </label>
        </div>
      </div>
    </div>
  )
}
