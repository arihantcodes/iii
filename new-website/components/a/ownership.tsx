import { CountUp } from '@/components/site/count-up'
import { Reveal } from '@/components/site/reveal'
import { ownership } from './content'
import { OwnershipMove } from './ownership-move'
import { Section } from './section'
import type { PageStats } from './stats'

/**
 * Sits high on the page, right before the Live demo: owning your architecture is the value prop almost no
 * other platform offers. Copy and adoption stats share a row; the move runs full width beneath so the three
 * environments, and the system travelling between them, are big enough to read.
 */
export function Ownership({ stats }: { stats: PageStats }) {
  const values: Record<(typeof ownership.stats)[number]['id'], number | null> = {
    workers: stats.workers,
    contributors: stats.contributors,
    ...stats.downloads,
  }
  return (
    // biome-ignore lint/correctness/useUniqueElementIds: One stable anchor per section on this page.
    <Section id="ownership" eyebrow={ownership.eyebrow} title={ownership.title} lede={ownership.subtitle}>
      <div className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-10 lg:mt-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        <Reveal className="min-w-0">
          <p className="max-w-[560px] text-pretty text-[15px] text-muted-foreground leading-relaxed md:text-[16px]">
            {ownership.copy}
          </p>
        </Reveal>
        <Reveal delay={0.1} className="min-w-0">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-7 sm:grid-cols-3">
            {ownership.stats.map(({ id, label }) => {
              const value = values[id]
              return (
                <div key={id} className="flex min-w-0 flex-col border-t pt-4">
                  <dt className="order-2 mt-2 text-[13px] text-muted-foreground leading-snug">{label}</dt>
                  <dd className="order-1 font-pixel text-[28px] text-foreground leading-none tabular-nums sm:text-[32px]">
                    {value === null ? (
                      '—'
                    ) : (
                      <CountUp value={value} format={id === 'workers' || id === 'contributors' ? 'plain' : 'compact'} />
                    )}
                  </dd>
                </div>
              )
            })}
          </dl>
        </Reveal>
      </div>
      <Reveal delay={0.15} className="mt-12 lg:mt-16">
        <OwnershipMove />
      </Reveal>
    </Section>
  )
}
