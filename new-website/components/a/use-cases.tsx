'use client'

import type { ReactNode } from 'react'

import { DemoPlayback } from '@/components/graphics/demo-playback'
import { IconBot, IconCategory, IconServer } from '@/components/icons/iconly'
import { Reveal } from '@/components/site/reveal'
import { useDemoPlayback } from '@/hooks/use-demo-playback'
import { useCases } from './content'
import { Section } from './section'
import styles from './use-cases.module.css'
import { HarnessVisual, InfraVisual, PlatformVisual } from './use-cases-demos'
import { useSpinnerFrame } from './use-cases-motion'

/**
 * Three ways to use iii, side by side (2026-10-05 sync: no graph, no problem subtitles, no links yet; "Custom
 * harness"; App platform shows several workloads; Infrastructure reproduces the `iii compose` renderer from
 * iii-hq/iii#2263). All three are on screen at once rather than behind tabs: they are related, and switching
 * between them hid two thirds of the section (Anthony, 00:06:49). No window chrome either, so this does not read as
 * one more copy of the app panels above it (Mike, 00:05:38: "everything looks like this").
 */
export function UseCases() {
  const { ref, running, paused, setPaused, reduce } = useDemoPlayback<HTMLDivElement>()
  const frame = useSpinnerFrame(running)
  const visual = { running, frame, still: reduce }

  return (
    // biome-ignore lint/correctness/useUniqueElementIds: One stable anchor per section on this page.
    <Section id="use-cases" eyebrow={useCases.eyebrow} title={useCases.title} lede={useCases.subtitle}>
      <Reveal delay={0.1} className="mt-10 lg:mt-14">
        <div ref={ref}>
          <div className={styles.grid}>
            <Card
              icon={<IconBot className="size-4" />}
              title={useCases.harness.label}
              copy={useCases.harness.solution}
              tag="Your choices"
            >
              <HarnessVisual {...visual} />
            </Card>
            <Card
              icon={<IconCategory className="size-4" />}
              title={useCases.platform.label}
              copy={useCases.platform.solution}
              tag="5 workloads"
            >
              <PlatformVisual {...visual} />
            </Card>
            <Card
              icon={<IconServer className="size-4" />}
              title={useCases.infra.label}
              copy={useCases.infra.solution}
              tag={useCases.infra.terminal.command}
              mono
            >
              <InfraVisual {...visual} />
            </Card>
          </div>
          <div className={styles.controls}>
            <DemoPlayback paused={paused} reduce={reduce} onToggle={() => setPaused(!paused)} />
          </div>
        </div>
      </Reveal>
    </Section>
  )
}

function Card({
  icon,
  title,
  copy,
  tag,
  mono = false,
  children,
}: {
  icon: ReactNode
  title: string
  copy: string
  tag: string
  mono?: boolean
  children: ReactNode
}) {
  return (
    <article className={styles.card}>
      <div className={styles.visual}>{children}</div>
      <div className={styles.text}>
        <div className={styles.titleRow}>
          <span className={styles.cardIcon}>{icon}</span>
          <h3 className={styles.cardTitle}>{title}</h3>
          <span className={styles.tag} data-mono={mono}>
            {tag}
          </span>
        </div>
        <p className={styles.copy}>{copy}</p>
      </div>
    </article>
  )
}
