'use client'

import { BellOff, Hash, MessageSquareText, Search } from 'lucide-react'
import { motion } from 'motion/react'
import type { SlackState } from '@/shared/types'
import { cn } from '@/lib/utils'
import { Emoji } from '../status/emoji'
import { Swap } from '../swap'
import { SlackAvatar } from './avatar'

function StatusLine({ state, clearsAt, className }: { state: SlackState; clearsAt?: string | null; className?: string }) {
  const hasStatus = Boolean(state.emoji || state.text)
  return (
    <Swap id={`${state.emoji}|${state.text}`} className={cn('min-w-0', className)}>
      {hasStatus ? (
        <span className="flex items-center gap-1.5">
          <Emoji code={state.emoji} placeholder={false} className="text-base" />
          <span className="truncate">{state.text || <span className="text-muted-foreground">No status text</span>}</span>
        </span>
      ) : (
        <span className="block text-muted-foreground">No status</span>
      )}
      {/* Always takes a line, so the card keeps its height as statuses come and go */}
      {clearsAt !== undefined && (
        <span className={cn('mt-0.5 block text-xs text-muted-foreground', !(hasStatus && clearsAt) && 'invisible')}>Clears {clearsAt ?? 'soon'}</span>
      )}
    </Swap>
  )
}

/** The emoji next to your name in messages. */
function StatusEmoji({ code }: { code: string }) {
  return (
    <Swap id={code} variant="pop" inline className={cn('h-4 place-items-center', code ? 'w-4' : 'w-0')}>
      <Emoji code={code} placeholder={false} className="text-sm" />
    </Swap>
  )
}

/** One fixed-height line: notifications paused or on. */
function NotifLine({ dnd }: { dnd: boolean }) {
  return (
    <Swap id={String(dnd)} className="text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        {dnd ? <BellOff className="size-3.5" /> : <MessageSquareText className="size-3.5" />}
        {dnd ? 'Notifications paused' : 'Notifications on'}
      </span>
    </Swap>
  )
}

interface PreviewProps {
  name: string
  avatarUrl?: string
  teamName: string
  state: SlackState
  clearsAt?: string | null
  className?: string
}

/** A Slack-like profile card plus a message, showing how colleagues see you. */
export function SlackProfileCard({ name, avatarUrl, state, clearsAt, className }: PreviewProps) {
  return (
    <div className={cn('overflow-hidden rounded-2xl border bg-card shadow-sm', className)}>
      <div className="flex items-start gap-3 p-4">
        <SlackAvatar name={name} src={avatarUrl} presence={state.presence} size={52} />
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="truncate font-semibold">{name}</div>
          <StatusLine state={state} clearsAt={clearsAt} className="mt-0.5 text-sm" />
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 border-t bg-muted/30 px-4 py-2.5 text-xs">
        <span className="flex items-center gap-1.5">
          <span className={cn('size-2 rounded-full transition-colors', state.presence === 'auto' ? 'bg-emerald-500' : 'border border-muted-foreground')} />
          {state.presence === 'auto' ? 'Active' : 'Away'}
        </span>
        <NotifLine dnd={state.dnd} />
      </div>
      <div className="border-t px-4 py-3">
        <div className="flex gap-2.5">
          <SlackAvatar name={name} src={avatarUrl} size={34} />
          <div className="min-w-0 text-sm">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold">{name}</span>
              <StatusEmoji code={state.emoji} />
              <span className="text-xs text-muted-foreground">10:42 AM</span>
            </div>
            <p className="text-muted-foreground">Pushed the fix, reviewing the rest after this.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

const CHANNELS = ['general', 'product', 'design', 'random']
const PEOPLE: { name: string; presence: 'auto' | 'away' }[] = [
  { name: 'Sam Lee', presence: 'auto' },
  { name: 'Priya Shah', presence: 'away' },
  { name: 'Jordan Kim', presence: 'auto' },
]

/** A miniature Slack window, used on the landing page. */
export function SlackWindow({ name, avatarUrl, teamName, state, clearsAt, className }: PreviewProps) {
  return (
    <div className={cn('overflow-hidden rounded-2xl border bg-card shadow-2xl shadow-primary/10', className)}>
      <div className="flex items-center gap-2 border-b bg-muted/40 px-3 py-2">
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-[#ff5f57]" />
          <span className="size-2.5 rounded-full bg-[#febc2e]" />
          <span className="size-2.5 rounded-full bg-[#28c840]" />
        </div>
        <div className="mx-auto flex w-1/2 items-center gap-1.5 rounded-md bg-background/80 px-2 py-1 text-[11px] text-muted-foreground">
          <Search className="size-3" /> Search {teamName}
        </div>
      </div>
      <div className="grid grid-cols-[150px_1fr] max-sm:grid-cols-1">
        <aside className="space-y-4 border-r bg-[#3f0e40] p-3 text-[13px] text-white/75 max-sm:hidden">
          <div className="font-semibold text-white">{teamName}</div>
          <div className="space-y-0.5">
            {CHANNELS.map((c) => (
              <div key={c} className={cn('flex items-center gap-1.5 rounded px-1.5 py-0.5', c === 'product' && 'bg-[#1164a3] text-white')}>
                <Hash className="size-3 opacity-70" />
                {c}
              </div>
            ))}
          </div>
          <div className="space-y-1">
            <div className="text-[11px] text-white/50">Direct messages</div>
            {[{ name, presence: state.presence }, ...PEOPLE].map((p, i) => (
              <div key={p.name} className="flex items-center gap-1.5 px-1.5">
                <span className={cn('size-2 rounded-full transition-colors', p.presence === 'auto' ? 'bg-emerald-400' : 'border border-white/60')} />
                <span className="truncate">{i === 0 ? `${p.name} (you)` : p.name}</span>
                {i === 0 && <Emoji code={state.emoji} placeholder={false} className="ml-auto text-xs" />}
              </div>
            ))}
          </div>
        </aside>
        <div className="relative flex flex-col">
          <div className="flex items-center gap-1.5 border-b px-4 py-2.5 text-sm font-semibold">
            <Hash className="size-3.5" /> product
          </div>
          <div className="flex-1 space-y-3 p-4 text-sm">
            <div className="flex gap-2.5">
              <SlackAvatar name="Sam Lee" size={34} />
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-semibold">Sam Lee</span>
                  <span className="text-xs text-muted-foreground">10:41 AM</span>
                </div>
                <p className="text-muted-foreground">Anyone around to review the onboarding PR?</p>
              </div>
            </div>
            <div className="flex gap-2.5">
              <SlackAvatar name={name} src={avatarUrl} size={34} />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold">{name}</span>
                  <StatusEmoji code={state.emoji} />
                  <span className="text-xs text-muted-foreground">10:42 AM</span>
                </div>
                <p className="text-muted-foreground">I’ll take it. My status says when I’m free.</p>
              </div>
            </div>
            <motion.div layout className="relative ml-11 w-full max-w-64 rounded-xl border bg-popover p-3 shadow-xl">
              <span className="absolute -top-1.5 left-6 size-3 rotate-45 border-t border-l bg-popover" />
              <div className="flex items-center gap-2.5">
                <SlackAvatar name={name} src={avatarUrl} presence={state.presence} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{name}</div>
                  <StatusLine state={state} clearsAt={clearsAt} className="text-xs" />
                </div>
              </div>
              <div className="mt-2 border-t pt-2">
                <NotifLine dnd={state.dnd} />
              </div>
            </motion.div>
          </div>
          <div className="m-3 rounded-lg border px-3 py-2 text-xs text-muted-foreground">Message #product</div>
        </div>
      </div>
    </div>
  )
}
