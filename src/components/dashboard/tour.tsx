'use client'

import { motion, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useHush } from './store'

interface Step {
  target: string
  title: string
  body: string
}

export const TOUR_EVENT = 'hush:tour'
const storageKey = (userId: string) => `hush:tour-done:${userId}`
const PAD = 6
const GUTTER = 16
const CARD_W = 300

function readDone(userId: string) {
  try {
    return localStorage.getItem(storageKey(userId)) === '1'
  } catch {
    return true // storage blocked: don't nag on every visit
  }
}

function markDone(userId: string) {
  try {
    localStorage.setItem(storageKey(userId), '1')
  } catch {
    // ignore: the tour simply shows again next time
  }
}

/** First visible element for a data-tour key (some exist twice for mobile and desktop layouts). */
function findTarget(key: string) {
  return [...document.querySelectorAll<HTMLElement>(`[data-tour="${key}"]`)].find((el) => {
    const r = el.getBoundingClientRect()
    return r.width > 0 && r.height > 0
  })
}

type Rect = { top: number; left: number; width: number; height: number }

/** A short spotlight tour of the dashboard. Starts on first visit; replay from the account menu. */
export function Tour({ onStart }: { onStart: () => void }) {
  const { me } = useHush()
  const reduced = useReducedMotion()
  const [index, setIndex] = useState<number | null>(null)
  const [rect, setRect] = useState<Rect | null>(null)
  const [cardH, setCardH] = useState(170)
  const cardRef = useRef<HTMLDivElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)

  const steps: Step[] = useMemo(
    () => [
      { target: 'now', title: 'Your status, right now', body: 'Exactly what Slack shows, and when it changes next.' },
      { target: 'quick', title: 'One-tap overrides', body: 'Heading out? Pick a preset and how long it lasts.' },
      { target: 'week', title: 'Your week at a glance', body: 'Click any moment to preview what Slack will show.' },
      { target: 'nav-schedule', title: 'Hours and routines', body: 'Set working hours, lunch, focus blocks and their statuses.' },
      ...(me.features.googleCalendar || me.accounts.length
        ? [{ target: 'nav-calendar', title: 'Calendar sync', body: 'Meetings, focus time and out-of-office set your status.' }]
        : []),
      { target: 'command', title: 'Quick actions', body: 'Press ⌘K to set a status, pause or jump anywhere.' },
      {
        target: 'autopilot',
        title: me.autopilot ? 'Autopilot is on' : 'Turn on autopilot',
        body: me.autopilot ? 'Hush keeps Slack in sync. Switch it off any time.' : 'When your schedule looks right, Hush takes it from here.',
      },
    ],
    [me.features.googleCalendar, me.accounts.length, me.autopilot],
  )

  // Keep the latest callback without restarting the first-visit timer on every render
  const onStartRef = useRef(onStart)
  useEffect(() => {
    onStartRef.current = onStart
  })

  const start = useCallback(() => {
    onStartRef.current()
    // Let the Overview render before measuring
    setTimeout(() => setIndex(0), 80)
  }, [])

  const close = useCallback(() => {
    markDone(me.user.id)
    setIndex(null)
    setRect(null)
  }, [me.user.id])

  // First visit: start once the dashboard has settled
  useEffect(() => {
    if (readDone(me.user.id)) return
    const id = setTimeout(start, 700)
    return () => clearTimeout(id)
  }, [me.user.id, start])

  // Replay from the account menu
  useEffect(() => {
    window.addEventListener(TOUR_EVENT, start)
    return () => window.removeEventListener(TOUR_EVENT, start)
  }, [start])

  const step = index === null ? null : steps[index]

  // Bring the target into view, then keep the spotlight on it while scrolling or resizing
  useEffect(() => {
    if (!step) return
    const el = findTarget(step.target)
    if (!el) {
      // Target not on screen (e.g. layout changed): skip ahead rather than point at nothing
      setIndex((i) => (i !== null && i < steps.length - 1 ? i + 1 : null))
      return
    }
    el.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' })
    let frame = 0
    const measure = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect()
        setRect({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 })
      })
    }
    measure()
    const settle = setTimeout(measure, 450)
    window.addEventListener('scroll', measure, true)
    window.addEventListener('resize', measure)
    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(settle)
      window.removeEventListener('scroll', measure, true)
      window.removeEventListener('resize', measure)
    }
  }, [step, steps.length, reduced])

  useLayoutEffect(() => {
    if (cardRef.current) setCardH(cardRef.current.offsetHeight)
  }, [index, rect])

  useEffect(() => {
    if (index !== null) nextRef.current?.focus({ preventScroll: true })
  }, [index])

  useEffect(() => {
    if (index === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      else if (e.key === 'ArrowRight') setIndex((i) => (i === null ? i : Math.min(i + 1, steps.length - 1)))
      else if (e.key === 'ArrowLeft') setIndex((i) => (i === null ? i : Math.max(i - 1, 0)))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, steps.length, close])

  if (index === null || !step || !rect || typeof document === 'undefined') return null

  const vw = window.innerWidth
  const vh = window.innerHeight
  const mobile = vw < 640
  const width = mobile ? vw - GUTTER * 2 : CARD_W
  const below = rect.top + rect.height + 12
  const above = rect.top - 12 - cardH
  const top = mobile
    ? vh - cardH - GUTTER
    : below + cardH <= vh - GUTTER
      ? below
      : above >= GUTTER
        ? above
        : vh - cardH - GUTTER
  const left = mobile ? GUTTER : Math.min(Math.max(rect.left + rect.width / 2 - width / 2, GUTTER), vw - width - GUTTER)
  const last = index === steps.length - 1
  const spring = reduced ? { duration: 0 } : { type: 'spring' as const, stiffness: 320, damping: 32 }

  return createPortal(
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      {/* Blocks clicks on the page while the tour is open */}
      <div className="absolute inset-0" onClick={(e) => e.stopPropagation()} />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute rounded-2xl ring-2 ring-primary/70"
        style={{ boxShadow: '0 0 0 9999px rgb(10 10 14 / 0.55)' }}
        initial={false}
        animate={rect}
        transition={spring}
      />
      <motion.div
        ref={cardRef}
        className="absolute rounded-2xl border bg-popover p-4 text-popover-foreground shadow-2xl"
        style={{ width }}
        initial={{ opacity: 0, top, left }}
        animate={{ opacity: 1, top, left }}
        transition={spring}
      >
        <div className="text-xs font-medium text-muted-foreground tabular-nums">
          {index + 1} of {steps.length}
        </div>
        <motion.div key={index} initial={reduced ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          <h2 id="tour-title" className="mt-1 font-semibold tracking-tight">
            {step.title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
        </motion.div>
        <div className="mt-4 flex items-center gap-1.5">
          {steps.map((s, i) => (
            <span key={s.target} className={cn('h-1.5 rounded-full transition-all', i === index ? 'w-4 bg-primary' : 'w-1.5 bg-muted-foreground/25')} />
          ))}
          <div className="ml-auto flex items-center gap-1">
            {!last && (
              <Button variant="ghost" size="sm" onClick={close}>
                Skip
              </Button>
            )}
            {index > 0 && (
              <Button variant="outline" size="sm" onClick={() => setIndex(index - 1)}>
                Back
              </Button>
            )}
            <Button ref={nextRef} size="sm" onClick={() => (last ? close() : setIndex(index + 1))}>
              {last ? 'Done' : 'Next'}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body,
  )
}
