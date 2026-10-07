'use client'

import { ArrowRightIcon } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'

import { DemoPlayback } from '@/components/graphics/demo-playback'
import { PixelHeading } from '@/components/site/pixel-heading'
import { SectionRule } from '@/components/site/section-rule'
import { useDemoPlayback } from '@/hooks/use-demo-playback'
import { cn } from '@/lib/utils'

import { story } from './content'
import { wideContainer } from './section'
import styles from './story.module.css'
import { StoryActivity } from './story-asides'
import { DiscoverPreview } from './story-discovery'
import { ExtendPreview } from './story-extend'
import { StoryGraph } from './story-graph'
import { lastStoryBeat, STORY_BEATS, STORY_STEPS, type StoryStage } from './story-model'
import { ObserveActivity } from './story-observability'
import { ReactPreview } from './story-react'
import { useStoryPlayback } from './use-story-playback'

/** Explanations lead on the left; the active chapter's system or observability preview sits on the right. */
export function Story() {
  const headingId = useId()
  const [stage, setStage] = useState<StoryStage>('compose')
  const [inspections, setInspections] = useState<Set<string>>(() => new Set())
  const inspectChart = useCallback((id: string, active: boolean) => {
    setInspections((previous) => {
      if (previous.has(id) === active) return previous
      const next = new Set(previous)
      if (active) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])
  const [visibleChapters, setVisibleChapters] = useState<Partial<Record<StoryStage, boolean>>>({})
  const enterChapter = useCallback((next: StoryStage) => {
    setStage(next)
  }, [])
  const chapterVisibility = useCallback((next: StoryStage, visible: boolean) => {
    setVisibleChapters((previous) => ({ ...previous, [next]: visible }))
    // Resize can change which chapter owns the viewport without another enter event.
    const current = chapterAtReadingLine()
    if (current) setStage(current)
  }, [])
  const { ref, running, paused, setPaused, reduce } = useDemoPlayback<HTMLDivElement>()
  const inspecting = stage === 'observe' && inspections.size > 0
  const chapterRunning = running && Boolean(visibleChapters[stage]) && !inspecting
  const playback = useStoryPlayback(stage, chapterRunning)
  const beat = reduce ? lastStoryBeat(stage) : playback.beat
  // The first beat animates too (it is the lead-in); only the held finished state is static.
  const animating = chapterRunning && playback.phase !== 'holding'
  const playbackLabel = playbackStatus({ reduce, paused, inspecting, phase: playback.phase, stage, beat })
  const controls = (
    <div className={styles.controls} data-playback={reduce ? 'static' : playback.phase}>
      <span className={styles.playbackStatus}>{playbackLabel}</span>
      {/* Pause only: every chapter loops on its own, so there is nothing to replay. */}
      <DemoPlayback paused={paused} reduce={reduce} onToggle={() => setPaused(!paused)} />
    </div>
  )

  return (
    // biome-ignore lint/correctness/useUniqueElementIds: One CODER story per page.
    <section id="coder" aria-labelledby={headingId} className={cn('landing-section relative', styles.story)}>
      <SectionRule />
      <div ref={ref} className={wideContainer}>
        <header className={styles.intro}>
          <p className={styles.eyebrow}>{story.eyebrow}</p>
          <PixelHeading id={headingId} className={styles.introTitle}>
            {story.title}
          </PixelHeading>
          <p className={styles.introCopy}>{story.description}</p>
        </header>
        <div className={styles.layout}>
          <ol className={styles.chapters}>
            {STORY_STEPS.map((chapter) => {
              const active = chapter.id === stage
              const chapterBeat = active ? beat : lastStoryBeat(chapter.id)
              return (
                <StoryChapter key={chapter.id} chapter={chapter} onVisibility={chapterVisibility}>
                  <StoryActivity stage={chapter.id} beat={chapterBeat} running={active && animating} />
                  <div className={styles.mobileGraph}>
                    <StoryPreview
                      stage={chapter.id}
                      beat={chapterBeat}
                      running={active && animating}
                      onInspectChange={inspectChart}
                    />
                    {active ? controls : null}
                  </div>
                </StoryChapter>
              )
            })}
          </ol>
          <div className={styles.desktopGraph}>
            <div className={styles.stickyGraph}>
              <nav aria-label="Explore CODER" className={styles.chapterNav}>
                {STORY_STEPS.map((chapter, i) => (
                  <a
                    key={chapter.id}
                    href={`#coder-${chapter.id}`}
                    aria-label={chapter.name}
                    aria-current={stage === chapter.id ? 'step' : undefined}
                    onClick={() => enterChapter(chapter.id)}
                  >
                    <span>{chapter.letter}</span>
                    <span className={styles.navName}>{chapter.name}</span>
                    <span className={styles.navNumber}>0{i + 1}</span>
                  </a>
                ))}
              </nav>
              <StoryPreview stage={stage} beat={beat} running={animating} onInspectChange={inspectChart} />
              <div className={styles.graphFooter}>{controls}</div>
            </div>
          </div>
        </div>
        {/* The recap: one line, then the five chapters as links back to where each one plays. */}
        <div className={styles.summary}>
          <div className={styles.summaryHead}>
            <p className={styles.eyebrow}>{story.summary.title}</p>
            <p className={styles.summaryLine}>{story.summary.subtitle}</p>
          </div>
          <a href="#proof" className={styles.summaryLink}>
            See it in an agent runtime
            <ArrowRightIcon aria-hidden strokeWidth={1.75} className={styles.summaryArrow} />
          </a>
          <ol className={styles.recap}>
            {STORY_STEPS.map((chapter, i) => (
              <li key={chapter.id}>
                <a href={`#coder-${chapter.id}`} onClick={() => enterChapter(chapter.id)}>
                  <span className={styles.recapTop}>
                    <span aria-hidden className={styles.recapLetter}>
                      {chapter.letter}
                    </span>
                    <span className={styles.recapNumber}>0{i + 1}</span>
                  </span>
                  <span className={styles.recapName}>{chapter.name}</span>
                  <span className={styles.recapTitle}>{chapter.title}</span>
                </a>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

function StoryPreview({
  stage,
  beat,
  running,
  onInspectChange,
}: {
  stage: StoryStage
  beat: number
  running: boolean
  onInspectChange: (id: string, active: boolean) => void
}) {
  if (stage === 'observe') {
    return <ObserveActivity beat={beat} running={running} onInspectChange={onInspectChange} />
  }
  if (stage === 'discover') return <DiscoverPreview beat={beat} running={running} />
  if (stage === 'extend') return <ExtendPreview beat={beat} running={running} />
  if (stage === 'react') return <ReactPreview beat={beat} />
  return <StoryGraph stage={stage} beat={beat} running={running} />
}

function StoryChapter({
  chapter,
  onVisibility,
  children,
}: {
  chapter: (typeof STORY_STEPS)[number]
  onVisibility: (stage: StoryStage, visible: boolean) => void
  children: React.ReactNode
}) {
  const ref = useRef<HTMLLIElement>(null)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        onVisibility(chapter.id, entry.isIntersecting)
      },
      { rootMargin: '-25% 0px -45% 0px' },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [chapter.id, onVisibility])

  return (
    <li ref={ref} id={`coder-${chapter.id}`} className={styles.chapter}>
      <header>
        <p className={styles.eyebrow}>
          <span className={styles.chapterLetter}>{chapter.letter}</span>
          {chapter.name}
        </p>
        <h3 className={cn('font-pixel', styles.chapterTitle)}>{chapter.title}</h3>
        <p className={styles.description}>{chapter.description}</p>
      </header>
      {children}
    </li>
  )
}

function playbackStatus({
  reduce,
  paused,
  inspecting,
  phase,
  stage,
  beat,
}: {
  reduce: boolean
  paused: boolean
  inspecting: boolean
  phase: ReturnType<typeof useStoryPlayback>['phase']
  stage: StoryStage
  beat: number
}) {
  if (reduce) return 'Complete'
  if (paused) return 'Paused'
  if (inspecting) return 'Inspecting data'
  if (phase === 'waiting') return 'Starting'
  if (phase === 'holding') return 'Complete · looping'
  return `${beat + 1} / ${STORY_BEATS[stage].length}`
}

function chapterAtReadingLine() {
  const line = window.innerHeight * 0.4
  return STORY_STEPS.find(({ id }) => {
    const bounds = document.getElementById(`coder-${id}`)?.getBoundingClientRect()
    return bounds && bounds.top <= line && bounds.bottom > line
  })?.id
}
