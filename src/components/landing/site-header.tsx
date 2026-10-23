'use client'

import { motion, useMotionValueEvent, useScroll } from 'motion/react'
import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Logo } from '../brand/logo'
import { ThemeToggle } from '../theme-toggle'
import { SlackMark } from './slack-button'

const LINKS = [
  { href: '/#how', label: 'How it works' },
  { href: '/#features', label: 'Features' },
  { href: '/#free', label: 'Pricing' },
  { href: '/#faq', label: 'FAQ' },
]

export function SiteHeader() {
  const { scrollY } = useScroll()
  const [scrolled, setScrolled] = useState(false)
  useMotionValueEvent(scrollY, 'change', (y) => setScrolled(y > 12))
  return (
    <motion.header
      className={cn('fixed inset-x-0 top-0 z-50 transition-all duration-300', scrolled ? 'border-b bg-background/75 backdrop-blur-xl' : 'border-b border-transparent')}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" aria-label="Hush home">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          <ThemeToggle />
          <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
            <Link href="/app">Sign in</Link>
          </Button>
          <Button size="sm" asChild className="rounded-lg bg-foreground text-background hover:bg-foreground/85">
            <a href="/auth/slack">
              <SlackMark className="size-3.5 rounded-sm bg-white p-px" /> Add to Slack
            </a>
          </Button>
        </div>
      </div>
    </motion.header>
  )
}
