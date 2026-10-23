import { Faq, Features, FinalCta, FreeSection, Hero, HowItWorks, SiteFooter, WorksWith } from '@/components/landing/sections'
import { SiteHeader } from '@/components/landing/site-header'
import { LandingToasts } from '@/components/landing/landing-toasts'

export default function Home() {
  return (
    <div className="overflow-x-clip">
      <SiteHeader />
      <main>
        <Hero />
        <WorksWith />
        <HowItWorks />
        <Features />
        <FreeSection />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
      <LandingToasts />
    </div>
  )
}
