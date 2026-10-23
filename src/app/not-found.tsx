import Link from 'next/link'
import { Logo } from '@/components/brand/logo'

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <Logo className="text-xl" />
      <div className="text-6xl">🌙</div>
      <h1 className="text-2xl font-semibold tracking-tight">This page is on Do Not Disturb</h1>
      <Link href="/" className="text-sm text-primary hover:underline">
        Back to the homepage
      </Link>
    </main>
  )
}
