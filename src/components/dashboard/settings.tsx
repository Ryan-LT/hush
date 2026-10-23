'use client'

import { Check, ChevronsUpDown, Globe, LogOut, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import { api } from '@/lib/api'
import { browserTimeZone, fmtTime, fmtWhen } from '@/lib/format'
import { cn } from '@/lib/utils'
import { SlackAvatar } from '../slack/avatar'
import { AutopilotButtons } from './autopilot'
import { SectionCard } from './section-card'
import { errorMessage, useHush } from './store'
import { toast } from 'sonner'

function timeZones() {
  try {
    return Intl.supportedValuesOf('timeZone')
  } catch {
    return ['UTC']
  }
}

export function TimezoneSettings() {
  const { draft, update, now } = useHush()
  const [open, setOpen] = useState(false)
  const zones = useMemo(timeZones, [])
  const browser = browserTimeZone()
  return (
    <SectionCard title="Time zone" description="Working hours and routines follow this time zone, including daylight saving.">
      <div className="flex flex-wrap items-center gap-3">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-10 w-72 justify-between rounded-xl">
              <span className="flex items-center gap-2 truncate">
                <Globe className="size-4 text-muted-foreground" />
                {draft.timezone.replace(/_/g, ' ')}
              </span>
              <ChevronsUpDown className="size-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="start">
            <Command>
              <CommandInput placeholder="Search time zones…" />
              <CommandList>
                <CommandEmpty>No time zone found.</CommandEmpty>
                <CommandGroup>
                  {zones.map((z) => (
                    <CommandItem
                      key={z}
                      value={z}
                      onSelect={() => {
                        update((s) => void (s.timezone = z))
                        setOpen(false)
                      }}
                    >
                      <Check className={cn('size-4', z === draft.timezone ? 'opacity-100' : 'opacity-0')} />
                      <span className="truncate">{z.replace(/_/g, ' ')}</span>
                      <span className="ml-auto text-xs text-muted-foreground tabular-nums">{fmtTime(now, z)}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <span className="text-sm text-muted-foreground">It’s {fmtTime(now, draft.timezone)} there</span>
        {browser !== draft.timezone && (
          <Button variant="link" size="sm" className="px-0" onClick={() => update((s) => void (s.timezone = browser))}>
            Use {browser.replace(/_/g, ' ')}
          </Button>
        )}
      </div>
    </SectionCard>
  )
}

export function AutopilotSettings() {
  const { me, now, draft } = useHush()
  return (
    <SectionCard title="Autopilot" description="Pausing clears the status, away and Do Not Disturb Hush set, then leaves Slack alone until it resumes.">
      <div className="space-y-3 rounded-xl bg-muted/40 p-4">
        <div>
          <div className="text-sm font-medium">
            {me.autopilot ? 'Autopilot is on' : me.resumeAt ? `Paused until ${fmtWhen(me.resumeAt, draft.timezone, now)}` : 'Autopilot is off'}
          </div>
          <div className="text-xs text-muted-foreground">
            {me.autopilot ? 'Your status follows your schedule, calendar and overrides.' : 'Turn it on once your schedule looks right.'}
          </div>
        </div>
        <AutopilotButtons />
      </div>
    </SectionCard>
  )
}

export function EmojiSettings() {
  const { me, customEmoji } = useHush()
  const count = Object.keys(customEmoji.emoji).length
  if (me.user.demo) return null
  return (
    <SectionCard title="Workspace emoji" description="Use your team’s custom emoji in statuses. Needs one extra Slack permission to read them.">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/40 p-4">
        <div className="text-sm">
          {customEmoji.available ? (
            <>
              <span className="font-medium">Connected</span>
              <span className="text-muted-foreground"> · {count} custom emoji in the picker</span>
            </>
          ) : (
            <span className="text-muted-foreground">Not connected. The standard Slack emoji are always available.</span>
          )}
        </div>
        {!customEmoji.available && (
          <Button size="sm" variant="outline" asChild>
            <a href="/auth/slack?emoji=1">Connect workspace emoji</a>
          </Button>
        )}
      </div>
    </SectionCard>
  )
}

export function AccountSettings() {
  const { me } = useHush()
  const [deleting, setDeleting] = useState(false)
  const signOut = async () => {
    await api.logout().catch(() => {})
    window.location.href = '/'
  }
  const remove = async () => {
    setDeleting(true)
    try {
      await api.deleteAccount()
      window.location.href = '/?deleted=1'
    } catch (e) {
      toast.error(errorMessage(e))
      setDeleting(false)
    }
  }
  return (
    <SectionCard title="Account">
      <div className="flex flex-wrap items-center gap-3">
        <SlackAvatar name={me.user.name} src={me.user.avatarUrl} size={40} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{me.user.name}</div>
          <div className="truncate text-xs text-muted-foreground">{me.user.teamName} · Slack</div>
        </div>
        <Button variant="outline" size="sm" onClick={signOut}>
          <LogOut /> Sign out
        </Button>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4">
        <div>
          <div className="text-sm font-medium">Delete account</div>
          <div className="text-xs text-muted-foreground">Revokes Slack and Google access and erases everything Hush stores. Immediate and permanent.</div>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 /> Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete your Hush account?</AlertDialogTitle>
              <AlertDialogDescription>
                Your schedule, routines, rules and calendar connections will be erased and Hush’s access to Slack and Google revoked. This can’t be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep my account</AlertDialogCancel>
              <AlertDialogAction variant="destructive" disabled={deleting} onClick={remove}>
                Delete everything
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </SectionCard>
  )
}
