'use client'

import { CalendarDays, Lock, MoreHorizontal, Pencil, Plus, RefreshCw, Trash2, Unplug } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { state as mkState } from '@/shared/defaults'
import type { CalendarAccount, CalendarRule, SlackState } from '@/shared/types'
import { api, ERROR_MESSAGES } from '@/lib/api'
import { fmtRelative, uid } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Emoji } from '../status/emoji'
import { StateEditor } from '../status/state-editor'
import { SectionCard, StatusPreview } from './section-card'
import { useHush } from './store'

export function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn('size-5', className)} aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}

function AccountRow({ account }: { account: CalendarAccount }) {
  const { run, now } = useHush()
  const [confirm, setConfirm] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const selected = account.calendars.filter((c) => c.selected).map((c) => c.id)

  const toggle = (id: string, on: boolean) => run(api.selectCalendars(account.id, on ? [...selected, id] : selected.filter((s) => s !== id)))

  return (
    <div className="rounded-xl border bg-background">
      <div className="flex items-center gap-3 p-3">
        <span className="flex size-9 items-center justify-center rounded-lg border bg-card">
          {account.provider === 'google' ? <GoogleIcon /> : <CalendarDays className="size-4 text-primary" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">
            {account.email}
            {account.provider === 'demo' && <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">Demo</span>}
          </div>
          <div className={cn('text-xs', account.error ? 'text-destructive' : 'text-muted-foreground')}>
            {account.error ? (ERROR_MESSAGES[account.error] ?? `Sync error: ${account.error}`) : account.lastFetchAt ? `Synced ${fmtRelative(account.lastFetchAt, now)}` : 'Not synced yet'}
          </div>
        </div>
        {account.error === 'reconnect_required' && (
          <Button size="sm" variant="outline" asChild>
            <a href="/auth/google">Reconnect</a>
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Refresh"
          onClick={async () => {
            setRefreshing(true)
            await run(api.refreshAccount(account.id))
            setRefreshing(false)
          }}
        >
          <RefreshCw className={cn(refreshing && 'animate-spin')} />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="More">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem variant="destructive" onClick={() => setConfirm(true)}>
              <Unplug /> Disconnect
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {account.calendars.length > 1 && (
        <div className="grid gap-1 border-t p-3 sm:grid-cols-2">
          {account.calendars.map((c) => (
            <label key={c.id} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-muted/60">
              <Checkbox checked={c.selected} onCheckedChange={(v) => toggle(c.id, v === true)} />
              <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
              <span className="truncate">{c.name}</span>
            </label>
          ))}
        </div>
      )}
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect {account.email}?</AlertDialogTitle>
            <AlertDialogDescription>Hush will forget this calendar and revoke its access. Your schedule and routines stay as they are.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => run(api.removeAccount(account.id), 'Calendar disconnected')}>
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export function CalendarAccounts() {
  const { me } = useHush()
  const canConnect = me.features.googleCalendar
  return (
    <SectionCard
      title="Calendars"
      description="Meetings, focus time and out-of-office events update your status automatically."
      action={
        canConnect && (
          <Button size="sm" asChild>
            <a href="/auth/google">
              <GoogleIcon className="size-4" /> Connect Google Calendar
            </a>
          </Button>
        )
      }
    >
      <div className="space-y-2">
        {me.accounts.map((a) => (
          <AccountRow key={a.id} account={a} />
        ))}
        {me.accounts.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center">
            <GoogleIcon className="size-8" />
            <div className="text-sm font-medium">{canConnect ? 'No calendar connected yet' : 'Google Calendar isn’t set up on this server'}</div>
            <p className="max-w-sm text-xs text-muted-foreground">
              {canConnect
                ? 'Connect one or more Google accounts. Hush only reads event times, titles and visibility.'
                : 'Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to the server to enable calendar sync. See the README.'}
            </p>
          </div>
        )}
      </div>
    </SectionCard>
  )
}

function BehaviorRow({
  title,
  description,
  enabled,
  onEnabled,
  value,
  onChange,
  children,
}: {
  title: string
  description: string
  enabled: boolean
  onEnabled: (v: boolean) => void
  value: SlackState
  onChange: (v: SlackState) => void
  children?: ReactNode
}) {
  return (
    <div className="py-4 first:pt-0 last:pb-0">
      <label className="flex cursor-pointer items-start justify-between gap-4">
        <span>
          <span className="block text-sm font-medium">{title}</span>
          <span className="block text-xs text-muted-foreground">{description}</span>
        </span>
        <Switch checked={enabled} onCheckedChange={onEnabled} />
      </label>
      <AnimatePresence initial={false}>
        {enabled && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="space-y-3 pt-3">
              <StateEditor value={value} onChange={onChange} />
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Toggle({ label, checked, onChange, icon }: { label: string; checked: boolean; onChange: (v: boolean) => void; icon?: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2 text-sm">
      <span className="flex items-center gap-2">
        {icon}
        {label}
      </span>
      <Switch size="sm" checked={checked} onCheckedChange={onChange} />
    </label>
  )
}

export function EventBehavior() {
  const { draft, update } = useHush()
  const cal = draft.calendar
  return (
    <SectionCard title="During events" description="What happens while a calendar event is in progress.">
      <div className="divide-y">
        <BehaviorRow
          title="Meetings"
          description="Any busy event you haven’t declined."
          enabled={cal.meetings.enabled}
          onEnabled={(v) => update((s) => void (s.calendar.meetings.enabled = v))}
          value={cal.meetings.state}
          onChange={(v) => update((s) => void (s.calendar.meetings.state = v))}
        >
          <div className="grid gap-2 sm:grid-cols-2">
            <Toggle label="Use the event title as status" checked={cal.meetings.useTitle} onChange={(v) => update((s) => void (s.calendar.meetings.useTitle = v))} />
            <Toggle label="Use the first emoji in the title" checked={cal.meetings.titleEmoji} onChange={(v) => update((s) => void (s.calendar.meetings.titleEmoji = v))} />
          </div>
        </BehaviorRow>
        <BehaviorRow
          title="Focus time"
          description="Google Calendar focus time blocks."
          enabled={cal.focusTime.enabled}
          onEnabled={(v) => update((s) => void (s.calendar.focusTime.enabled = v))}
          value={cal.focusTime.state}
          onChange={(v) => update((s) => void (s.calendar.focusTime.state = v))}
        />
        <BehaviorRow
          title="Out of office"
          description="Google Calendar out-of-office events."
          enabled={cal.outOfOffice.enabled}
          onEnabled={(v) => update((s) => void (s.calendar.outOfOffice.enabled = v))}
          value={cal.outOfOffice.state}
          onChange={(v) => update((s) => void (s.calendar.outOfOffice.state = v))}
        />
        <div className="pt-4">
          <Toggle
            icon={<Lock className="size-3.5 text-muted-foreground" />}
            label="Never show titles of private events"
            checked={cal.hidePrivate}
            onChange={(v) => update((s) => void (s.calendar.hidePrivate = v))}
          />
        </div>
      </div>
    </SectionCard>
  )
}

function RuleDialog({ rule, onClose, onSave }: { rule: CalendarRule | 'new' | null; onClose: () => void; onSave: (r: CalendarRule) => void }) {
  const [r, setR] = useState<CalendarRule>(() => ({ id: uid(), phrases: [], enabled: true, state: mkState(':sandwich:', 'Lunch break') }))
  const [text, setText] = useState('')
  useEffect(() => {
    if (!rule) return
    const next = rule === 'new' ? { id: uid(), phrases: [], enabled: true, state: mkState(':spiral_calendar_pad:', '') } : structuredClone(rule)
    setR(next)
    setText(next.phrases.join(', '))
  }, [rule])
  const phrases = text
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)

  return (
    <Dialog open={rule !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{rule === 'new' ? 'New keyword rule' : 'Edit keyword rule'}</DialogTitle>
          <DialogDescription>When an event title contains any of these words, use this status instead of the meeting status.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="phrases">Title contains</Label>
          <Input id="phrases" autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="lunch, gym, school run" />
          <div className="flex min-h-6 flex-wrap gap-1">
            {phrases.map((p) => (
              <span key={p} className="rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">
                {p}
              </span>
            ))}
          </div>
        </div>
        <StateEditor value={r.state} onChange={(state) => setR({ ...r, state })} />
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!phrases.length}
            onClick={() => {
              onSave({ ...r, phrases })
              onClose()
            }}
          >
            {rule === 'new' ? 'Add rule' : 'Done'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function KeywordRules() {
  const { draft, update } = useHush()
  const [editing, setEditing] = useState<CalendarRule | 'new' | null>(null)
  const rules = draft.calendar.rules
  return (
    <SectionCard
      title="Keyword rules"
      description="Match words in event titles to give them their own status. First match wins."
      action={
        <Button size="sm" variant="outline" onClick={() => setEditing('new')}>
          <Plus /> Add rule
        </Button>
      }
    >
      {rules.length === 0 ? (
        <p className="text-sm text-muted-foreground">No rules yet. Try “lunch” → 🥪 Lunch break.</p>
      ) : (
        <ul className="space-y-2">
          <AnimatePresence initial={false}>
            {rules.map((rule, i) => (
              <motion.li
                key={rule.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className={cn('flex items-center gap-3 rounded-xl border bg-background p-3', !rule.enabled && 'opacity-55')}
              >
                <button type="button" className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-left" onClick={() => setEditing(rule)}>
                  <span className="flex flex-wrap gap-1">
                    {rule.phrases.map((p) => (
                      <span key={p} className="rounded-full bg-accent px-2 py-0.5 font-mono text-xs text-accent-foreground">
                        {p}
                      </span>
                    ))}
                  </span>
                  <span className="text-muted-foreground">→</span>
                  <StatusPreview emoji={<Emoji code={rule.state.emoji} />} text={rule.state.text} dnd={rule.state.dnd} away={rule.state.presence === 'away'} />
                </button>
                <Switch checked={rule.enabled} onCheckedChange={(v) => update((s) => void (s.calendar.rules[i].enabled = v))} />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label="More">
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditing(rule)}>
                      <Pencil /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => {
                        update((s) => void (s.calendar.rules = s.calendar.rules.filter((x) => x.id !== rule.id)))
                        toast('Rule removed', { action: { label: 'Undo', onClick: () => update((s) => void s.calendar.rules.splice(i, 0, rule)) } })
                      }}
                    >
                      <Trash2 /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
      <RuleDialog
        rule={editing}
        onClose={() => setEditing(null)}
        onSave={(r) =>
          update((s) => {
            const i = s.calendar.rules.findIndex((x) => x.id === r.id)
            if (i >= 0) s.calendar.rules[i] = r
            else s.calendar.rules.push(r)
          })
        }
      />
    </SectionCard>
  )
}
