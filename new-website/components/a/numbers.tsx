import { ArrowUpRightIcon } from 'lucide-react'

import { Reveal } from '@/components/site/reveal'
import { stagger } from '@/lib/motion'

import { numbers } from './content'
import { Section } from './section'

/**
 * Six figures in a hairline grid, one claim per cell: the figure, what it measures, and the one detail behind
 * it. Cells fade up in reading order; the figures themselves stay still, since a latency ticking upward would
 * read as the engine getting slower. The footnote says where the benchmarks ran and links to every run.
 */
export function Numbers() {
  const { metrics, footnote } = numbers
  return (
    // biome-ignore lint/correctness/useUniqueElementIds: One stable anchor per section on this page.
    <Section id="numbers" eyebrow={numbers.eyebrow} title={numbers.title}>
      <dl className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border lg:mt-14 lg:grid-cols-3">
        {metrics.map((m, i) => (
          <Reveal
            key={m.id}
            delay={0.1 + i * stagger}
            className="flex min-w-0 flex-col gap-2 bg-card px-5 py-6 sm:px-6 sm:py-8"
          >
            <dt className="order-2 text-[14px] text-foreground leading-snug">{m.label}</dt>
            <dd className="order-1 flex items-baseline gap-1.5 font-pixel text-[32px] text-foreground leading-none tabular-nums sm:text-[40px]">
              {m.value}
              {m.unit ? <span className="text-[20px] text-muted-foreground sm:text-[24px]">{m.unit}</span> : null}
            </dd>
            <dd className="order-3 text-pretty text-[12.5px] text-muted-foreground leading-snug">{m.detail}</dd>
          </Reveal>
        ))}
      </dl>
      <Reveal delay={0.1 + metrics.length * stagger}>
        <p className="mt-5 max-w-[760px] text-pretty text-[13px] text-muted-foreground leading-relaxed">
          {footnote.setup} {footnote.bench}{' '}
          <a
            href={footnote.link.href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-0.5 text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground"
          >
            {footnote.link.label}
            <ArrowUpRightIcon aria-hidden className="size-3.5" />
          </a>
        </p>
      </Reveal>
    </Section>
  )
}
