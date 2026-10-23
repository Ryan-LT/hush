'use client'

import { AlertTriangle, CalendarClock, CalendarDays, Compass, Eye, FlaskConical, LayoutDashboard, Loader2, LogOut, Pause, Plug, RefreshCw, Search, Settings2, Sparkles, Undo2 } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Kbd } from '@/components/ui/kbd'
import { api } from '@/lib/api'
import { fmtRelative, fmtWhen } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Logo } from '../brand/logo'
import { SlackAvatar } from '../slack/avatar'
import { SlackProfileCard } from '../slack/slack-preview'
import { ThemeToggle } from '../theme-toggle'
import { TimelineLegend, WeekTimeline } from '../timeline/week-timeline'
import { Activity } from './activity'
import { AutopilotControl } from './autopilot'
import { CalendarAccounts, EventBehavior, KeywordRules } from './calendar'
import { COMMAND_EVENT, CommandMenu } from './command-menu'
import { ComingUp } from './coming-up'
import { NowCard } from './now-card'
import { QuickActions } from './quick-actions'
import { OffHours, Routines, WorkingHours } from './schedule'
import { SectionCard } from './section-card'
import { AccountSettings, AutopilotSettings, EmojiSettings, TimezoneSettings } from './settings'
import { useHush } from './store'
import { Tour, TOUR_EVENT } from './tour'

const SECTIONS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'schedule', label: 'Schedule', icon: CalendarClock },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'settings', label: 'Settings', icon: Settings2 },
] as const
type SectionId = (typeof SECTIONS)[number]['id']

function useSection(): [SectionId, (s: SectionId) => void] {
  const [section, setSection] = useState<SectionId>('overview')
  useEffect(() => {
    const read = () => {
      const h = window.location.hash.slice(1)
      setSection(SECTIONS.some((s) => s.id === h) ? (h as SectionId) : 'overview')
    }
    read()
    window.addEventListener('hashchange', read)
    return () => window.removeEventListener('hashchange', read)
  }, [])
  const go = (s: SectionId) => {
    history.replaceState(null, '', s === 'overview' ? window.location.pathname : `#${s}`)
    window.scrollTo({ top: 0 })
    setSection(s)
  }
  return [section, go]
}

function TopBar() {
  const { me, run } = useHush()
  const signOut = async () => {
    await api.logout().catch(() => {})
    window.location.href = '/'
  }
  return (
    <header className="sticky top-0 z-30 border-b bg-background/75 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-3 px-4 sm:px-6">
        <Link href="/" aria-label="Hush home">
          <Logo />
        </Link>
        <span className="hidden truncate rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground sm:inline">{me.user.teamName}</span>
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            data-tour="command"
            onClick={() => window.dispatchEvent(new Event(COMMAND_EVENT))}
            className="flex h-8 items-center gap-2 rounded-full border px-2.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:w-56"
            aria-label="Quick actions"
          >
            <Search className="size-3.5" />
            <span className="hidden md:inline">Set a status, pause…</span>
            <Kbd className="ml-auto hidden md:inline-flex">⌘K</Kbd>
          </button>
          <AutopilotControl />
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
              <SlackAvatar name={me.user.name} src={me.user.avatarUrl} size={30} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="truncate text-sm font-medium">{me.user.name}</div>
                <div className="truncate text-xs text-muted-foreground">{me.user.teamName}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => window.dispatchEvent(new Event(TOUR_EVENT))}>
                <Compass /> Take the tour
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => run(api.sync(), 'Synced to Slack')} disabled={!me.autopilot}>
                <RefreshCw /> Sync now
              </DropdownMenuItem>
              <DropdownMenuItem onClick={signOut}>
                <LogOut /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}

function Nav({ section, go }: { section: SectionId; go: (s: SectionId) => void }) {
  return (
    <nav className="lg:sticky lg:top-20 lg:self-start">
      <ul className="grid grid-cols-4 gap-1 rounded-2xl border bg-muted/40 p-1 lg:flex lg:flex-col lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0">
        {SECTIONS.map(({ id, label, icon: Icon }) => (
          <li key={id}>
            <button
              type="button"
              data-tour={`nav-${id}`}
              onClick={() => go(id)}
              className={cn(
                'relative flex w-full flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[11px] font-medium whitespace-nowrap transition-colors sm:flex-row sm:justify-center sm:gap-2 sm:text-sm lg:justify-start lg:gap-2.5 lg:px-3 lg:py-2',
                section === id ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {section === id && (
                <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-xl border bg-card shadow-sm" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />
              )}
              <Icon className="relative size-4" />
              <span className="relative">{label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function Banners() {
  const { me, run, draft, now } = useHush()
  const err = me.sync.lastError
  return (
    <AnimatePresence initial={false}>
      {err === 'slack_disconnected' ? (
        <motion.div key="disc" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-wrap items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
          <Plug className="size-5 text-destructive" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">Slack disconnected</div>
            <div className="text-xs text-muted-foreground">Slack revoked Hush’s access, so autopilot is paused. Reconnect to pick up where you left off.</div>
          </div>
          <Button size="sm" asChild>
            <a href="/auth/slack">Reconnect Slack</a>
          </Button>
        </motion.div>
      ) : !me.autopilot && (me.resumeAt || me.activity.some((a) => a.kind === 'push')) ? (
        <motion.div key="paused" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className="flex flex-wrap items-center gap-3 rounded-2xl border bg-muted/40 p-4">
          <Pause className="size-5 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">{me.resumeAt ? `Autopilot paused until ${fmtWhen(me.resumeAt, draft.timezone, now)}` : 'Autopilot is off'}</div>
            <div className="text-xs text-muted-foreground">Hush won’t change your Slack status{me.resumeAt ? ' until then' : ''}. Statuses below are a preview.</div>
          </div>
          <Button size="sm" onClick={() => run(api.setAutopilot(true), 'Autopilot on')}>
            {me.resumeAt ? 'Resume now' : 'Turn on'}
          </Button>
        </motion.div>
      ) : !me.autopilot ? (
        <motion.div
          key="off"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, height: 0 }}
          className="relative flex flex-wrap items-center gap-3 overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-fuchsia-500/10 to-orange-400/10 p-4"
        >
          <Sparkles className="size-5 text-primary" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">Autopilot is off</div>
            <div className="text-xs text-muted-foreground">Check your working hours and routines below, then switch it on. Hush won’t touch Slack until you do.</div>
          </div>
          <Button size="sm" onClick={() => run(api.setAutopilot(true), 'Autopilot on — Slack updated')}>
            Turn on autopilot
          </Button>
        </motion.div>
      ) : err ? (
        <motion.div key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
          <AlertTriangle className="size-5 text-amber-500" />
          <span className="flex-1">
            Slack rejected the last update (<code className="font-mono text-xs">{err}</code>). Check that every emoji exists in your workspace.
          </span>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

function PreviewRail() {
  const { me, now, draft, dirty, run, preview, previewAt, setPreviewAt } = useHush()
  const [syncing, setSyncing] = useState(false)
  return (
    <div className="space-y-3">
      <div className="flex min-h-6 items-center justify-between gap-2 px-1">
        {previewAt === null ? (
          <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">How you look in Slack</span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs font-medium text-primary">
            <Eye className="size-3.5" /> Previewing {fmtWhen(previewAt, draft.timezone, now)}
          </span>
        )}
        {previewAt !== null ? (
          <Button variant="ghost" size="xs" onClick={() => setPreviewAt(null)}>
            <Undo2 /> Back to now
          </Button>
        ) : (
          dirty && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">Unsaved preview</span>
        )}
      </div>
      <SlackProfileCard
        name={me.user.name}
        avatarUrl={me.user.avatarUrl}
        teamName={me.user.teamName}
        state={{ ...preview.resolved.state, text: preview.text }}
        clearsAt={preview.until && !preview.resolved.state.showUntil ? fmtWhen(preview.until, draft.timezone, preview.at) : null}
      />
      {previewAt !== null && (
        <p className="px-1 text-xs text-muted-foreground">
          From <span className="font-medium text-foreground">{preview.resolved.label}</span>. Click another moment on the timeline, or go back to now.
        </p>
      )}
      <div className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2.5 text-xs text-muted-foreground">
        <span className={cn('size-2 rounded-full', me.autopilot ? (me.sync.lastError ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-muted-foreground/40')} />
        <span className="flex-1">
          {!me.autopilot ? 'Autopilot off' : me.sync.lastSyncAt ? `Synced to Slack ${fmtRelative(me.sync.lastSyncAt, now)}` : 'Waiting for first sync'}
        </span>
        {me.autopilot && (
          <Button
            variant="ghost"
            size="xs"
            onClick={async () => {
              setSyncing(true)
              await run(api.sync(), 'Synced to Slack')
              setSyncing(false)
            }}
          >
            {syncing ? <Loader2 className="animate-spin" /> : <RefreshCw />} Sync
          </Button>
        )}
      </div>
      {me.user.demo && (
        <div className="flex gap-2 rounded-xl border border-dashed p-3 text-xs text-muted-foreground">
          <FlaskConical className="size-4 shrink-0" /> Demo workspace: Slack updates are simulated and the calendar is sample data.
        </div>
      )}
    </div>
  )
}

function SaveBar() {
  const { dirty, saving, save, discard } = useHush()
  return (
    <AnimatePresence>
      {dirty && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
          className="fixed inset-x-0 bottom-5 z-40 flex justify-center px-4"
        >
          <div className="flex items-center gap-3 rounded-2xl border bg-popover/95 py-2 pr-2 pl-4 shadow-2xl backdrop-blur">
            <span className="size-2 animate-pulse rounded-full bg-amber-500" />
            <span className="text-sm">Unsaved changes</span>
            <Kbd className="hidden sm:inline-flex">⌘S</Kbd>
            <Button variant="ghost" size="sm" onClick={discard} disabled={saving}>
              Discard
            </Button>
            <Button size="sm" onClick={save} disabled={saving}>
              {saving && <Loader2 className="animate-spin" />} Save
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Overview() {
  const { input, now, previewAt, setPreviewAt } = useHush()
  return (
    <>
      <NowCard />
      <div className="xl:hidden">
        <PreviewRail />
      </div>
      <QuickActions />
      <SectionCard tour="week" title="Your week" description="Click any moment to preview it in Slack." action={<TimelineLegend input={input} />}>
        <WeekTimeline input={input} now={now} previewAt={previewAt} onPick={setPreviewAt} />
      </SectionCard>
      <div className="grid gap-4 2xl:grid-cols-2">
        <ComingUp />
        <Activity />
      </div>
    </>
  )
}

function Schedule() {
  const { input, now, previewAt, setPreviewAt } = useHush()
  return (
    <>
      <SectionCard title="Preview" description="Updates live as you edit. Click any moment to preview it." bodyClassName="pt-4">
        <WeekTimeline input={input} now={now} previewAt={previewAt} onPick={setPreviewAt} />
      </SectionCard>
      <WorkingHours />
      <Routines />
      <OffHours />
    </>
  )
}

export function Dashboard() {
  const [section, go] = useSection()
  return (
    <div className="min-h-dvh bg-background">
      <TopBar />
      <div className="mx-auto grid max-w-[1400px] grid-cols-[minmax(0,1fr)] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[200px_minmax(0,1fr)] xl:grid-cols-[200px_minmax(0,1fr)_320px]">
        <Nav section={section} go={go} />
        <main className="min-w-0 space-y-4 pb-28">
          <Banners />
          <motion.div
            key={section}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-4"
          >
              {section === 'overview' && <Overview />}
              {section === 'schedule' && <Schedule />}
              {section === 'calendar' && (
                <>
                  <CalendarAccounts />
                  <EventBehavior />
                  <KeywordRules />
                </>
              )}
              {section === 'settings' && (
                <>
                  <AutopilotSettings />
                  <TimezoneSettings />
                  <EmojiSettings />
                  <AccountSettings />
                </>
              )}
          </motion.div>
        </main>
        <aside className="hidden xl:block">
          <div className="sticky top-20">
            <PreviewRail />
          </div>
        </aside>
      </div>
      <SaveBar />
      <CommandMenu go={go} />
      <Tour onStart={() => section !== 'overview' && go('overview')} />
    </div>
  )
}
