'use client'

import { ThemeProvider } from 'next-themes'
import type { ReactNode } from 'react'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <TooltipProvider delayDuration={150}>{children}</TooltipProvider>
      {/* On phones, sit above the floating save bar */}
      <Toaster position="bottom-right" richColors closeButton mobileOffset={{ bottom: 84 }} />
    </ThemeProvider>
  )
}
