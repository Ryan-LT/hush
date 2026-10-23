import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Providers } from '@/components/providers'
import { cn } from '@/lib/utils'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

export const metadata: Metadata = {
  title: { default: 'Hush — Your Slack status, on autopilot', template: '%s · Hush' },
  description:
    'Hush sets your Slack status, presence and Do Not Disturb from your working hours, routines and Google Calendar. Free forever, no ads in your status.',
  icons: { icon: '/icon.svg' },
  // Search Console ownership of usehush.pages.dev, required for Google OAuth branding verification
  verification: { google: 'RG63Gbwo3d1vdTGjeZMiq83pgYfPsgS4RyPgYYVaBqw' },
  openGraph: {
    title: 'Hush — Your Slack status, on autopilot',
    description: 'Status, presence and Do Not Disturb that follow your working hours and calendar. Free forever.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fcfbf9' },
    { media: '(prefers-color-scheme: dark)', color: '#121216' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={cn('font-sans antialiased', geist.variable, geistMono.variable)}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
