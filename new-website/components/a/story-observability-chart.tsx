import { type PointerEvent as ReactPointerEvent, useEffect, useId, useRef, useState } from 'react'

import { cn } from '@/lib/utils'
import styles from './story-observability.module.css'
import { OBSERVABILITY_BUCKETS, observationPath } from './story-observability-data'

const COMPLETED_PATH = observationPath(
  OBSERVABILITY_BUCKETS.map((bucket) => bucket.completed),
  160,
)
const FAILED_PATH = observationPath(
  OBSERVABILITY_BUCKETS.map((bucket) => bucket.failed),
  160,
)
const RATE_PATH = observationPath(
  OBSERVABILITY_BUCKETS.map((bucket) => bucket.failureRate),
  5,
)

export function ObservabilityChart({
  kind,
  beat,
  running,
  onInspectChange,
}: {
  kind: 'calls' | 'failures'
  beat: number
  running: boolean
  onInspectChange: (id: string, active: boolean) => void
}) {
  const id = useId()
  const plotRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(OBSERVABILITY_BUCKETS.length - 1)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [touched, setTouched] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const open = (hovered || focused || touched) && !dismissed
  const bucket = OBSERVABILITY_BUCKETS[index]
  const calls = kind === 'calls'
  const labels = calls ? ['160', '80', '0'] : ['5%', '2.5%', '0%']
  const position = (index / (OBSERVABILITY_BUCKETS.length - 1)) * 100
  const height = calls ? (bucket.completed / 160) * 100 : (bucket.failureRate / 5) * 100
  const valueText = calls
    ? `${bucket.time}. ${bucket.calls} function calls, ${bucket.completed} completed, ${bucket.failed} failed.`
    : `${bucket.time}. ${bucket.failed} failed calls, ${bucket.failureRate.toFixed(1)} percent failure rate.`

  useEffect(() => {
    onInspectChange(id, open)
    return () => onInspectChange(id, false)
  }, [id, open, onInspectChange])

  useEffect(() => {
    if (!open) return
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDismissed(true)
    }
    const dismissOutside = (event: PointerEvent) => {
      if (!plotRef.current?.contains(event.target as Node)) {
        setDismissed(true)
        setTouched(false)
      }
    }
    document.addEventListener('keydown', dismiss)
    document.addEventListener('pointerdown', dismissOutside)
    return () => {
      document.removeEventListener('keydown', dismiss)
      document.removeEventListener('pointerdown', dismissOutside)
    }
  }, [open])

  const inspectPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch' || (event.target as Element).closest('[role="tooltip"]')) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const fraction = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width))
    setIndex(Math.round(fraction * (OBSERVABILITY_BUCKETS.length - 1)))
  }

  return (
    <div className={styles.chart}>
      <div className={styles.chartGrid} aria-hidden>
        {labels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      {/* The transparent native range supplies touch dragging, keyboard controls, and a spoken value. */}
      <div
        ref={plotRef}
        className={styles.chartPlot}
        onPointerEnter={(event) => {
          if (event.pointerType !== 'touch') setHovered(true)
          setDismissed(false)
          inspectPointer(event)
        }}
        onPointerMove={inspectPointer}
        onPointerLeave={() => setHovered(false)}
      >
        <svg viewBox="0 0 300 100" preserveAspectRatio="none" className={styles.chartGhost} aria-hidden="true">
          <path d={calls ? COMPLETED_PATH : RATE_PATH} className={styles.line} vectorEffect="non-scaling-stroke" />
        </svg>
        {beat >= 1 ? (
          <div
            className={styles.chartReveal}
            data-animate={beat === 1}
            style={{ animationPlayState: running ? 'running' : 'paused' }}
          >
            <svg viewBox="0 0 300 100" preserveAspectRatio="none" aria-hidden="true">
              {calls ? <ChartSeries path={COMPLETED_PATH} className={styles.success} /> : null}
              <ChartSeries path={calls ? FAILED_PATH : RATE_PATH} className={styles.serverError} />
            </svg>
          </div>
        ) : null}
        {open ? (
          <div
            className={cn(styles.crosshair, calls ? styles.success : styles.serverError)}
            style={{ left: `${position}%` }}
            aria-hidden
          >
            <span style={{ top: `${100 - height}%` }} />
          </div>
        ) : null}
        <input
          type="range"
          min={0}
          max={OBSERVABILITY_BUCKETS.length - 1}
          step={1}
          value={index}
          className={styles.chartInput}
          aria-label={calls ? 'Inspect function calls by time' : 'Inspect failed calls by time'}
          aria-valuetext={valueText}
          aria-describedby={`${id}-help${open ? ` ${id}-tooltip` : ''}`}
          onPointerDown={(event) => {
            if (event.pointerType === 'touch') setTouched(true)
            setDismissed(false)
          }}
          onChange={(event) => {
            setIndex(Number(event.target.value))
            setDismissed(false)
          }}
          onFocus={() => {
            setFocused(true)
            setDismissed(false)
          }}
          onBlur={() => setFocused(false)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setDismissed(true)
              event.stopPropagation()
            } else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key))
              setDismissed(false)
          }}
        />
        <span id={`${id}-help`} className="sr-only">
          Use arrow keys to inspect 30-minute samples, Home or End to jump, and Escape to dismiss details.
        </span>
        {open ? (
          <div
            role="tooltip"
            id={`${id}-tooltip`}
            className={styles.chartTooltip}
            data-side={!calls || position < 50 ? 'end' : 'start'}
          >
            <p>{bucket.time}</p>
            <dl>
              <div>
                <dt>api {calls ? 'calls' : 'failures'}</dt>
                <dd>{calls ? bucket.apiCalls : bucket.apiFailures}</dd>
              </div>
              <div>
                <dt>database {calls ? 'calls' : 'failures'}</dt>
                <dd>{calls ? bucket.databaseCalls : bucket.databaseFailures}</dd>
              </div>
              <div className={styles.tooltipTotal}>
                <dt>{calls ? 'Total calls' : 'Failure rate'}</dt>
                <dd>{calls ? bucket.calls : `${bucket.failureRate.toFixed(1)}%`}</dd>
              </div>
            </dl>
            {calls ? (
              <small>
                {bucket.completed} completed · {bucket.failed} failed
              </small>
            ) : (
              <small>
                {bucket.failed} failed / {bucket.calls} calls
              </small>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function ChartSeries({ path, className }: { path: string; className: string }) {
  return (
    <g className={className}>
      <path d={`${path} L300 100 L0 100 Z`} className={styles.area} />
      <path d={path} className={styles.line} vectorEffect="non-scaling-stroke" />
    </g>
  )
}
