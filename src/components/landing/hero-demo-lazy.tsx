'use client'

import dynamic from 'next/dynamic'

// Rendered only in the browser: it ticks through a simulated day and formats times in the visitor's locale
export const HeroDemoLazy = dynamic(() => import('./hero-demo').then((m) => m.HeroDemo), {
  ssr: false,
  loading: () => (
    <div className="space-y-4">
      <div className="h-[350px] animate-pulse rounded-2xl border bg-card" />
      <div className="h-[118px] animate-pulse rounded-2xl border bg-card" />
    </div>
  ),
})
