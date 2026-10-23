'use client'

import { ArrowRight, BellOff, Check, Code2, Lock, Plug, ShieldCheck, SlidersHorizontal, Sparkles, Trash2, Wand2 } from 'lucide-react'
import { motion, type Variants } from 'motion/react'
import Link from 'next/link'
import { useEffect, useState, type ReactNode } from 'react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { BLOCK_HEX, COLORS } from '@/shared/engine'
import { api } from '@/lib/api'
import { browserTimeZone } from '@/lib/format'
import { SOURCE_URL } from '@/lib/site'
import { cn } from '@/lib/utils'
import { Logo } from '../brand/logo'
import { GoogleIcon } from '../dashboard/calendar'
import { HeroDemoLazy } from './hero-demo-lazy'
import { SlackButton, SlackMark } from './slack-button'

const reveal: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] } }),
}

function Reveal({ children, className, i = 0 }: { children: ReactNode; className?: string; i?: number }) {
  return (
    <motion.div variants={reveal} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }} custom={i} className={className}>
      {children}
    </motion.div>
  )
}

function useDemoEnabled() {
  const [demo, setDemo] = useState(false)
  useEffect(() => {
    api.config().then((c) => setDemo(c.demo), () => {})
  }, [])
  return demo
}

export function Hero() {
  const demo = useDemoEnabled()
  const words = ['Your', 'Slack', 'status,']
  return (
    <section className="relative overflow-hidden pt-28 pb-20 sm:pt-36 lg:pb-28">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-[-15%] left-1/2 h-[620px] w-[1000px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,oklch(0.68_0.2_285/0.22),transparent)]" />
        <div className="absolute top-48 right-[-12%] h-[420px] w-[560px] rounded-full bg-[radial-gradient(closest-side,oklch(0.74_0.18_340/0.16),transparent)]" />
        <div className="absolute top-80 left-[-10%] h-[380px] w-[480px] rounded-full bg-[radial-gradient(closest-side,oklch(0.8_0.14_60/0.14),transparent)]" />
        <div className="absolute inset-0 bg-dots [mask-image:linear-gradient(to_bottom,black,transparent_75%)]" />
      </div>

      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <motion.a
            href="#free"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full border bg-card/70 py-1 pr-3 pl-1 text-xs font-medium shadow-sm backdrop-blur transition hover:bg-card"
          >
            <span className="rounded-full bg-primary px-2 py-0.5 text-primary-foreground">Free</span>
            No plans, no limits, no ads in your status
            <ArrowRight className="size-3" />
          </motion.a>

          <h1 className="mt-6 text-[44px] leading-[1.02] font-semibold tracking-[-0.04em] sm:text-6xl lg:text-[62px]">
            {words.map((w, i) => (
              <motion.span
                key={w}
                className="mr-[0.22em] inline-block"
                initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ duration: 0.7, delay: 0.05 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
              >
                {w}
              </motion.span>
            ))}
            <br />
            <motion.span
              className="inline-block text-gradient"
              initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              on autopilot.
            </motion.span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.6 }}
            className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground"
          >
            Hush sets your status, presence and Do Not Disturb from your working hours, routines and Google Calendar. Colleagues know when to expect you. You stop getting
            pinged at dinner.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55, duration: 0.6 }} className="mt-8 flex flex-wrap items-center gap-3">
            <SlackButton size="lg" />
            {demo ? (
              <a
                href={`/auth/demo?tz=${encodeURIComponent(browserTimeZone())}`}
                className="inline-flex h-12 items-center gap-2 rounded-xl border bg-card/60 px-5 text-[15px] font-medium backdrop-blur transition hover:bg-card"
              >
                Try the live demo <ArrowRight className="size-4" />
              </a>
            ) : (
              <a href="#how" className="inline-flex h-12 items-center gap-2 rounded-xl px-4 text-[15px] font-medium text-muted-foreground transition hover:text-foreground">
                See how it works <ArrowRight className="size-4" />
              </a>
            )}
          </motion.div>

          <motion.ul initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            {['Set up in 2 minutes', 'Only touches your own status', 'Delete everything in one click'].map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <Check className="size-4 text-emerald-500" /> {t}
              </li>
            ))}
          </motion.ul>
        </div>

        <motion.div initial={{ opacity: 0, y: 30, rotateX: 8 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ delay: 0.25, duration: 0.9, ease: [0.22, 1, 0.36, 1] }} style={{ perspective: 1200 }}>
          <HeroDemoLazy />
        </motion.div>
      </div>
    </section>
  )
}

export function WorksWith() {
  return (
    <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-4 px-4 pb-8 text-sm text-muted-foreground">
      <span>Works with</span>
      <span className="flex items-center gap-2 font-medium text-foreground">
        <SlackMark className="size-5" /> Slack
      </span>
      <span className="flex items-center gap-2 font-medium text-foreground">
        <GoogleIcon /> Google Calendar
      </span>
    </div>
  )
}

function SectionHeading({ eyebrow, title, children }: { eyebrow: string; title: ReactNode; children?: ReactNode }) {
  return (
    <Reveal className="mx-auto max-w-2xl text-center">
      <div className="text-sm font-medium text-primary">{eyebrow}</div>
      <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em] sm:text-[42px] sm:leading-[1.1]">{title}</h2>
      {children && <p className="mt-4 text-lg text-muted-foreground">{children}</p>}
    </Reveal>
  )
}

const STEPS = [
  { icon: Plug, title: 'Connect Slack', body: 'One click. Hush asks only for permission to manage your own status, presence and Do Not Disturb.' },
  { icon: SlidersHorizontal, title: 'Shape your week', body: 'Set working hours, add routines like lunch or deep work, connect your calendar and add keyword rules.' },
  { icon: Sparkles, title: 'Forget about it', body: 'Every minute, Hush works out what your status should be and updates Slack only when it changes.' },
]

export function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-20 py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading eyebrow="How it works" title="Set it once. Stay in sync forever." />
        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.title} i={i} className="group relative rounded-2xl border bg-card p-6 transition-shadow hover:shadow-lg">
              <div className="flex items-center justify-between">
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110 group-hover:rotate-3">
                  <s.icon className="size-5" />
                </span>
                <span className="font-mono text-5xl font-semibold text-muted-foreground/15">0{i + 1}</span>
              </div>
              <h3 className="mt-5 text-lg font-semibold tracking-tight">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function Bento({ className, title, body, children, i = 0 }: { className?: string; title: string; body: string; children: ReactNode; i?: number }) {
  return (
    <Reveal i={i} className={cn('group relative flex flex-col overflow-hidden rounded-3xl border bg-card p-6 transition-shadow hover:shadow-xl', className)}>
      <div className="relative z-10">
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
      </div>
      <div className="relative mt-6 flex flex-1 items-end">{children}</div>
    </Reveal>
  )
}

const CAL_EXAMPLES = [
  { time: '9:30', title: 'Daily standup', emoji: '🗓️', status: 'In a meeting', color: COLORS.event },
  { time: '12:00', title: 'Team lunch', emoji: '🥪', status: 'Lunch break', color: BLOCK_HEX.amber },
  { time: '15:00', title: '🚀 Launch review', emoji: '🚀', status: 'In a meeting', color: COLORS.event },
  { time: '16:30', title: 'Focus time', emoji: '🎧', status: 'Focusing', color: BLOCK_HEX.violet },
]

function CalendarVisual() {
  return (
    <div className="w-full space-y-2">
      {CAL_EXAMPLES.map((e, i) => (
        <motion.div
          key={e.title}
          initial={{ opacity: 0, x: -16 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15 + i * 0.12 }}
          className="flex items-center gap-3"
        >
          <span className="w-11 font-mono text-xs text-muted-foreground">{e.time}</span>
          <span className="flex flex-1 items-center gap-2 truncate rounded-lg border-l-[3px] bg-muted/50 px-3 py-2 text-sm" style={{ borderColor: e.color }}>
            {e.title}
          </span>
          <motion.span initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ delay: 0.35 + i * 0.12 }} className="h-px w-6 origin-left bg-border" />
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.45 + i * 0.12, type: 'spring' }}
            className="flex w-40 items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-sm shadow-sm max-sm:hidden"
          >
            <span>{e.emoji}</span>
            <span className="truncate">{e.status}</span>
          </motion.span>
        </motion.div>
      ))}
    </div>
  )
}

function WeekVisual() {
  const rows: [number, number, string][][] = [
    [[20, 45, COLORS.working], [45, 52, BLOCK_HEX.amber], [52, 75, COLORS.working]],
    [[20, 30, COLORS.working], [30, 42, BLOCK_HEX.violet], [42, 49, BLOCK_HEX.amber], [49, 75, COLORS.working]],
    [[20, 45, COLORS.working], [45, 52, BLOCK_HEX.amber], [52, 62, COLORS.event], [62, 75, COLORS.working]],
    [[20, 30, COLORS.working], [30, 42, BLOCK_HEX.violet], [42, 49, BLOCK_HEX.amber], [49, 75, COLORS.working]],
    [[20, 45, COLORS.working], [45, 52, BLOCK_HEX.amber], [52, 66, COLORS.working]],
  ]
  return (
    <div className="w-full space-y-1.5">
      {rows.map((segs, r) => (
        <div key={r} className="relative h-5 overflow-hidden rounded-md bg-muted/40 hatch">
          {segs.map(([a, b, c], i) => (
            <motion.div
              key={i}
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ delay: r * 0.06 + i * 0.05, duration: 0.5 }}
              className="absolute inset-y-0.5 origin-left rounded"
              style={{ left: `${a}%`, width: `${b - a}%`, backgroundColor: c === COLORS.working ? `${c}40` : c }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

function DndVisual() {
  return (
    <div className="flex w-full items-center justify-center py-4">
      <div className="relative">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="absolute inset-0 rounded-full border border-primary/30"
            animate={{ scale: [1, 2.2], opacity: [0.6, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.8, ease: 'easeOut' }}
          />
        ))}
        <span className="relative flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30">
          <BellOff className="size-7" />
        </span>
      </div>
    </div>
  )
}

function RulesVisual() {
  const rules = [
    ['lunch', '🥪'],
    ['gym', '🏋️'],
    ['dentist', '🏥'],
    ['interview', '🤝'],
  ]
  return (
    <div className="w-full space-y-2">
      {rules.map(([k, e], i) => (
        <motion.div
          key={k}
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.08 }}
          className="flex items-center gap-2 text-sm"
        >
          <span className="rounded-full bg-accent px-2.5 py-0.5 font-mono text-xs text-accent-foreground">“{k}”</span>
          <span className="h-px flex-1 bg-border" />
          <span className="text-lg">{e}</span>
        </motion.div>
      ))}
    </div>
  )
}

function OverridesVisual() {
  const chips = ['🎧 Focus · 1h', '🥪 Lunch · 45m', '🚶 Back soon', '🤒 Out sick', '🌴 Vacation', '🚆 Commuting']
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((c, i) => (
        <motion.span
          key={c}
          initial={{ opacity: 0, scale: 0.85 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.05, type: 'spring', stiffness: 300 }}
          whileHover={{ y: -2 }}
          className="rounded-full border bg-background px-3 py-1.5 text-sm shadow-sm"
        >
          {c}
        </motion.span>
      ))}
    </div>
  )
}

function PrivacyVisual() {
  const items = [
    { icon: Lock, text: 'Tokens encrypted with AES-256' },
    { icon: ShieldCheck, text: 'Private event titles never shown' },
    { icon: Trash2, text: 'One click deletes everything' },
  ]
  return (
    <ul className="w-full space-y-2">
      {items.map(({ icon: Icon, text }) => (
        <li key={text} className="flex items-center gap-2.5 rounded-xl bg-muted/50 px-3 py-2 text-sm">
          <Icon className="size-4 text-emerald-500" /> {text}
        </li>
      ))}
    </ul>
  )
}

export function Features() {
  return (
    <section id="features" className="scroll-mt-20 py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading eyebrow="Features" title="Everything your status should do by itself">
          Built for people who live in Slack and want it to reflect reality without thinking about it.
        </SectionHeading>
        <div className="mt-14 grid gap-4 md:grid-cols-6">
          <Bento
            className="md:col-span-4"
            title="Calendar-aware"
            body="Meetings, focus time and out-of-office events from Google Calendar set your status the moment they start. Declined and free events are ignored."
          >
            <CalendarVisual />
          </Bento>
          <Bento i={1} className="md:col-span-2" title="Do Not Disturb, on time" body="Notifications pause during meetings and focus blocks, and come back exactly when they end.">
            <DndVisual />
          </Bento>
          <Bento i={0} className="md:col-span-2" title="Working hours & routines" body="Lunch, deep work, school runs, night shifts. Any day, any time, even past midnight.">
            <WeekVisual />
          </Bento>
          <Bento i={1} className="md:col-span-2" title="Keyword rules" body="Words in event titles map to their own status. Emoji in titles become your status emoji.">
            <RulesVisual />
          </Bento>
          <Bento i={2} className="md:col-span-2" title="One-tap overrides" body="Heading out? Pick a preset and a duration. Your schedule resumes when it ends.">
            <OverridesVisual />
          </Bento>
          <Bento i={0} className="md:col-span-3" title="See it before Slack does" body="A live preview and week timeline show exactly what colleagues will see, and update as you edit.">
            <div className="flex w-full items-center gap-3 rounded-2xl border bg-background p-3 shadow-sm">
              <span className="flex size-11 items-center justify-center rounded-[22%] bg-gradient-to-br from-violet-500 to-fuchsia-500 font-semibold text-white">AR</span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">Alex Rivera</div>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  🎧 Heads down, will reply soon <span className="text-xs">· until 4:00 PM</span>
                </div>
              </div>
              <Wand2 className="size-4 text-primary" />
            </div>
          </Bento>
          <Bento i={1} className="md:col-span-3" title="Private by design" body="Hush stores the minimum it needs, encrypts every token, and never sells or shares anything.">
            <PrivacyVisual />
          </Bento>
        </div>
      </div>
    </section>
  )
}

const FREE_ITEMS = [
  'Unlimited calendars and Google accounts',
  'Unlimited routines and keyword rules',
  'Scheduled and one-tap overrides',
  'Custom workspace emoji',
  'Focus time and out-of-office events',
  'No ads or “sent with” text in your status',
  'No credit card, no trial, no upsell',
  'Open source — host it yourself',
]

export function FreeSection() {
  return (
    <section id="free" className="scroll-mt-20 py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <Reveal className="relative overflow-hidden rounded-[32px] border bg-card p-8 sm:p-12">
          <div aria-hidden className="pointer-events-none absolute -top-32 -right-32 size-96 rounded-full bg-[radial-gradient(closest-side,oklch(0.68_0.2_285/0.2),transparent)]" />
          <div className="relative grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-center">
            <div>
              <div className="text-sm font-medium text-primary">Pricing</div>
              <h2 className="mt-2 text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
                $0. <span className="text-muted-foreground">Forever.</span>
              </h2>
              <p className="mt-4 text-muted-foreground">
                Not freemium. Every feature is free for everyone. Hush runs on Cloudflare’s free tier, so it costs next to nothing to operate.
              </p>
              <SlackButton className="mt-6" />
            </div>
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {FREE_ITEMS.map((t, i) => (
                <motion.li
                  key={t}
                  initial={{ opacity: 0, x: 10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-start gap-2.5 rounded-xl border bg-background/70 p-3 text-sm"
                >
                  <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                  {t}
                </motion.li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

const FAQ = [
  {
    q: 'Is it really free?',
    a: 'Yes. There are no paid plans, no feature limits and nothing added to your status. The whole thing runs comfortably on free hosting tiers.',
  },
  {
    q: 'What can Hush do in my Slack?',
    a: 'Only manage your own status, your presence (active or away) and your Do Not Disturb snooze. It can’t read messages, post anything, or see channels.',
  },
  {
    q: 'What if I change my status by hand?',
    a: 'Hush leaves it alone. It only writes to Slack when your scheduled status changes, so a manual status stays until the next change, or use an override to pin it.',
  },
  {
    q: 'Which calendars are supported?',
    a: 'Google Calendar today, including multiple accounts and shared calendars. Busy events you haven’t declined count; all-day and “free” events are ignored.',
  },
  {
    q: 'Does it work with Microsoft Teams?',
    a: 'Not yet. Hush is Slack-first. Teams support is on the roadmap.',
  },
  {
    q: 'Can I host it myself?',
    a: 'Yes. Hush is a Next.js app plus a Cloudflare Worker and D1 database. The README walks through deploying your own copy for free.',
  },
]

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-20 py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <SectionHeading eyebrow="FAQ" title="Questions, answered" />
        <Reveal className="mt-10">
          <Accordion type="single" collapsible className="rounded-2xl border bg-card px-5">
            {FAQ.map((f) => (
              <AccordionItem key={f.q} value={f.q}>
                <AccordionTrigger className="text-[15px]">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  )
}

export function FinalCta() {
  return (
    <section className="px-4 py-24 sm:px-6">
      <Reveal className="relative mx-auto max-w-5xl overflow-hidden rounded-[32px] bg-foreground px-6 py-16 text-center text-background sm:px-12">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 left-1/4 size-80 rounded-full bg-[radial-gradient(closest-side,oklch(0.65_0.22_285/0.55),transparent)]" />
          <div className="absolute -bottom-24 right-1/4 size-80 rounded-full bg-[radial-gradient(closest-side,oklch(0.72_0.2_350/0.45),transparent)]" />
        </div>
        <div className="relative">
          <h2 className="text-3xl font-semibold tracking-[-0.03em] sm:text-5xl">Give your notifications a bedtime.</h2>
          <p className="mx-auto mt-4 max-w-xl text-background/70">Two minutes to set up. Then Hush quietly keeps Slack honest about where you are.</p>
          <a
            href="/auth/slack"
            className="mt-8 inline-flex h-12 items-center gap-2.5 rounded-xl bg-background px-6 text-[15px] font-medium text-foreground transition hover:-translate-y-0.5"
          >
            <SlackMark className="size-5" /> Add to Slack
          </a>
        </div>
      </Reveal>
    </section>
  )
}

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:px-6">
        <div>
          <Logo />
          <p className="mt-2 text-sm text-muted-foreground">Your Slack status, on autopilot. Free and open source.</p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground sm:ml-auto">
          <Link href="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            Terms
          </Link>
          <Link href="/support" className="hover:text-foreground">
            Support
          </Link>
          <Link href="/app" className="hover:text-foreground">
            Dashboard
          </Link>
          <a href={SOURCE_URL} className="flex items-center gap-1.5 hover:text-foreground">
            <Code2 className="size-4" /> Source
          </a>
        </nav>
      </div>
    </footer>
  )
}
