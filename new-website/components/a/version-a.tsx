import { Faq } from '@/components/sections/faq'
import { Footer } from '@/components/site/footer'
import { SiteHeader } from '@/components/site/site-header'
import { FinalCta } from './final-cta'
import { Hero } from './hero'
import { LiveDemo } from './live-demo'
import { Numbers } from './numbers'
import { Overview } from './overview'
import { Ownership } from './ownership'
import { Proof } from './proof'
import { getPageStats } from './stats'
import { Story } from './story'
import { UseCases } from './use-cases'

/** Version A of the A/B landing page test: one iii graph that grows as the page scrolls. */
export async function VersionA() {
  const stats = await getPageStats()
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <Overview />
        {/* Ownership sits before the Live demo: the 2026-10-05 sync moved it up as a top-level value prop. */}
        <Ownership stats={stats} />
        <LiveDemo />
        <Story />
        <Proof />
        <UseCases />
        {/* Numbers keeps the doc's slot after Use cases: the engine benchmarks, with the runner in a footnote. */}
        <Numbers />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </>
  )
}
