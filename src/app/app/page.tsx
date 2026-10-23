'use client'

import { Loader2 } from 'lucide-react'
import { motion } from 'motion/react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Logo } from '@/components/brand/logo'
import { Dashboard } from '@/components/dashboard/shell'
import { HushProvider } from '@/components/dashboard/store'
import { SlackButton } from '@/components/landing/slack-button'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { MeResponse } from '@/shared/types'
import { api, ERROR_MESSAGES, UnauthorizedError } from '@/lib/api'
import { browserTimeZone } from '@/lib/format'

type State = { status: 'loading' } | { status: 'ready'; me: MeResponse } | { status: 'signed-out' } | { status: 'error'; message: string }

function Loading() {
  return (
    <div className="min-h-dvh">
      <div className="flex h-14 items-center border-b px-6">
        <Logo />
      </div>
      <div className="mx-auto grid max-w-[1400px] gap-6 px-6 py-6 lg:grid-cols-[200px_1fr] xl:grid-cols-[200px_1fr_320px]">
        <div className="hidden space-y-2 lg:block">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-9 rounded-xl" />
          ))}
        </div>
        <div className="space-y-4">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
        <Skeleton className="hidden h-80 rounded-2xl xl:block" />
      </div>
    </div>
  )
}

function SignedOut() {
  const [demo, setDemo] = useState(false)
  useEffect(() => {
    api.config().then((c) => setDemo(c.demo), () => {})
  }, [])
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none absolute inset-0 bg-dots [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-sm rounded-3xl border bg-card p-8 text-center shadow-xl">
        <Link href="/" className="inline-flex">
          <Logo className="text-xl" />
        </Link>
        <h1 className="mt-6 text-xl font-semibold tracking-tight">Sign in to Hush</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Use your Slack account. Hush only asks for permission to manage your own status.</p>
        <SlackButton className="mt-6 w-full" label="Continue with Slack" />
        {demo && (
          <Button variant="ghost" className="mt-2 w-full" asChild>
            <a href={`/auth/demo?tz=${encodeURIComponent(browserTimeZone())}`}>Try the demo workspace</a>
          </Button>
        )}
      </motion.div>
    </div>
  )
}

export default function AppPage() {
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const error = params.get('error')
    if (error) toast.error(ERROR_MESSAGES[error] ?? `Something went wrong (${error})`)
    if (params.get('connected') === 'google') toast.success('Google Calendar connected')
    if (error || params.has('connected')) history.replaceState(null, '', window.location.pathname + window.location.hash)

    api.me().then(
      (me) => setState({ status: 'ready', me }),
      (e) => setState(e instanceof UnauthorizedError ? { status: 'signed-out' } : { status: 'error', message: e instanceof Error ? e.message : String(e) }),
    )
  }, [])

  if (state.status === 'loading') return <Loading />
  if (state.status === 'signed-out') return <SignedOut />
  if (state.status === 'error') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm text-muted-foreground">Couldn’t load your dashboard: {state.message}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          <Loader2 className="hidden" /> Try again
        </Button>
      </div>
    )
  }
  return (
    <HushProvider initial={state.me}>
      <Dashboard />
    </HushProvider>
  )
}
