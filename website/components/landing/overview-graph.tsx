'use client'

import { motion } from 'motion/react'
import { useEffect, useState } from 'react'

import { cn } from '@/lib/utils'

import { EngineHub, Flow, Node, Runner, STROKE, T, Wire } from './graph/kit'
import type { Point } from './graph/model'

/**
 * The Overview graph, laid out the way the 2026-10-05 sync asked for: it reads left to right. A request on the
 * left, the iii engine in the middle, and every worker together in one group on the right. It starts with the
 * engine alone, workers join one or two at a time (a dependency chain arrives together), then one request is
 * served by calls that all pass through the engine. Names, functions and languages are real registry workers
 * (iii-hq/workers); the clouds are a sample deployment, spread across AWS, GCP and Azure.
 */

/** A compact frame: 900 wide, so the type renders near its written size. The column of seven sets the height and
    the request → engine axis runs through its middle row. */
const VIEW = { y: 26, w: 900, h: 500 } as const
const ENGINE_BOX = { x: 326, y: 276, w: 220, h: 72 } as const
const REQUEST = { x: 70, y: 276, w: 124, h: 44 } as const
/** Where the request → engine axis sits, as a share of the drawn height (the Overview lines it up with the text). */
export const AXIS_RATIO = (REQUEST.y - VIEW.y) / VIEW.h
const COLUMN = { x: 714, w: 352, h: 58, firstRow: 66, pitch: 70 } as const

type Worker = Point & { id: string; fn: string; lang: string; cloud: 'AWS' | 'GCP' | 'Azure' }

const row = (i: number): Point => ({ x: COLUMN.x, y: COLUMN.firstRow + i * COLUMN.pitch })

/** Seven registry workers, top to bottom in the order they join, each tagged with its language and where it runs. */
export const WORKERS: Worker[] = [
  { id: 'http', fn: 'trigger · http', lang: 'Rust', cloud: 'AWS', ...row(0) },
  { id: 'database', fn: 'database::execute', lang: 'Rust', cloud: 'GCP', ...row(1) },
  { id: 'harness', fn: 'agent::events', lang: 'Rust', cloud: 'AWS', ...row(2) },
  { id: 'llm-router', fn: 'router::chat', lang: 'Rust', cloud: 'Azure', ...row(3) },
  { id: 'provider-anthropic', fn: 'provider::anthropic::stream', lang: 'Rust', cloud: 'GCP', ...row(4) },
  { id: 'claude-code', fn: 'claude::run', lang: 'TypeScript', cloud: 'Azure', ...row(5) },
  { id: 'hermes', fn: 'hermes::send', lang: 'Python', cloud: 'AWS', ...row(6) },
]
/** The card's tag: language, then where it is deployed. */
const placeOf = (w: Worker) => `${w.lang} · ${w.cloud}`
const byId = Object.fromEntries(WORKERS.map((w) => [w.id, w])) as Record<string, Worker>

type Beat =
  | { kind: 'engine'; caption: string }
  | { kind: 'join'; ids: string[]; caption: string }
  | { kind: 'call'; from: string; to: string; caption: string }
  | { kind: 'done'; caption: string }

/** The script: the engine alone, workers build up on the right, then a request is routed through the engine. */
export const SCRIPT: Beat[] = [
  { kind: 'engine', caption: 'one iii engine · nothing attached yet' },
  { kind: 'join', ids: ['http'], caption: 'http joins and registers its functions with the engine' },
  { kind: 'join', ids: ['database'], caption: 'database joins · the engine now knows both' },
  {
    kind: 'join',
    ids: ['harness', 'llm-router', 'provider-anthropic'],
    caption: 'harness joins · its dependencies llm-router and provider-anthropic come with it',
  },
  {
    kind: 'join',
    ids: ['claude-code', 'hermes'],
    caption: 'claude-code (TypeScript) and hermes (Python) join · seven workers, one engine',
  },
  { kind: 'call', from: 'request', to: 'harness', caption: 'a request arrives → iii engine → harness' },
  { kind: 'call', from: 'harness', to: 'llm-router', caption: 'harness → iii engine → llm-router (router::chat)' },
  {
    kind: 'call',
    from: 'llm-router',
    to: 'provider-anthropic',
    caption: 'llm-router → iii engine → provider-anthropic · dependencies route through the engine too',
  },
  { kind: 'call', from: 'harness', to: 'database', caption: 'harness → iii engine → database (database::execute)' },
  { kind: 'call', from: 'harness', to: 'claude-code', caption: 'harness → iii engine → claude-code (claude::run)' },
  { kind: 'call', from: 'harness', to: 'hermes', caption: 'harness → iii engine → hermes (hermes::send)' },
  {
    kind: 'call',
    from: 'harness',
    to: 'request',
    caption: 'the response goes back the same way: harness → iii engine → caller',
  },
  { kind: 'done', caption: 'every call went through the engine · no worker talked to another directly' },
]
/** How long each kind of beat holds. Setup beats are quick, a call gets room for its reply to land, and the
    finished graph rests longest so the whole system can be read before the loop starts over. */
const BEAT_MS: Record<Beat['kind'], number> = { engine: 1000, join: 1100, call: 1300, done: 2400 }
export const captionFor = (step: number) => SCRIPT[Math.min(step, SCRIPT.length - 1)].caption

/** Counts beats on a loop while active; rests on the last beat (the complete graph) when idle. */
export function useBeat(active: boolean) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    setTick(0)
    if (!active) return
    let current = 0
    let id = 0
    const schedule = () => {
      id = window.setTimeout(
        () => {
          current += 1
          setTick(current)
          schedule()
        },
        BEAT_MS[SCRIPT[current % SCRIPT.length].kind],
      )
    }
    schedule()
    return () => window.clearTimeout(id)
  }, [active])
  return { step: active ? tick % SCRIPT.length : SCRIPT.length - 1, cycle: Math.floor(tick / SCRIPT.length) }
}

/* ---------- Geometry: the request feeds the engine's left edge; each worker fans out from its right edge. ---------- */

const engineLeft: Point = { x: ENGINE_BOX.x - ENGINE_BOX.w / 2, y: ENGINE_BOX.y }
const engineRight: Point = { x: ENGINE_BOX.x + ENGINE_BOX.w / 2, y: ENGINE_BOX.y }
const engineCentre: Point = { x: ENGINE_BOX.x, y: ENGINE_BOX.y }
const requestRight: Point = { x: REQUEST.x + REQUEST.w / 2, y: REQUEST.y }
const workerLeft = (w: Worker): Point => ({ x: w.x - COLUMN.w / 2, y: w.y })

/** Engine → worker wire: a short run out of the engine, then a gentle curve into the worker's row. */
const fan = (w: Worker) => {
  const a = engineRight
  const b = workerLeft(w)
  const mid = (a.x + b.x) / 2
  return `M ${a.x} ${a.y} C ${mid} ${a.y}, ${mid} ${b.y}, ${b.x} ${b.y}`
}
/** The same curve as `fan`, sampled into points so a packet and its trail can ride the drawn wire exactly. */
const fanPoints = (w: Worker, samples = 28): Point[] => {
  const a = engineRight
  const b = workerLeft(w)
  const mid = (a.x + b.x) / 2
  return Array.from({ length: samples + 1 }, (_, i) => {
    const t = i / samples
    const u = 1 - t
    return {
      x: u * u * u * a.x + 3 * u * u * t * mid + 3 * u * t * t * mid + t * t * t * b.x,
      y: u * u * u * a.y + 3 * u * u * t * a.y + 3 * u * t * t * b.y + t * t * t * b.y,
    }
  })
}
/** engine centre → the participant's own wire. The request's wire is straight; a worker's follows its curve, so the
    trail lights the wire that is already there instead of cutting a second, straight one across the fan. */
const leg = (id: string): Point[] =>
  id === 'request' ? [engineCentre, engineLeft, requestRight] : [engineCentre, ...fanPoints(byId[id])]
/** The path a packet follows for one call: the caller's wire in, through the engine's centre, the callee's wire out. */
const route = (from: string, to: string): Point[] => [...leg(from).reverse(), ...leg(to).slice(1)]

const joinedAt = (id: string) => SCRIPT.findIndex((b) => b.kind === 'join' && b.ids.includes(id))

type Props = { step: number; cycle: number; active: boolean; className?: string; label: string }

export function OverviewGraph({ step, cycle, active, className, label }: Props) {
  const beat = SCRIPT[step]
  const call = beat.kind === 'call' ? beat : null
  const joined = (id: string) => !active || step >= joinedAt(id)
  const joiningNow = (id: string) => active && beat.kind === 'join' && beat.ids.includes(id)
  const joinDelay = (id: string) => (beat.kind === 'join' && joiningNow(id) ? beat.ids.indexOf(id) * 0.1 : 0)
  const joinedCount = WORKERS.filter((w) => joined(w.id)).length
  /* The request slot is always drawn so the frame never shifts; it is a ghost until the request fires. */
  const requestLive = !active || step >= 5
  const lit = (id: string) => call?.from === id || call?.to === id
  const done = beat.kind === 'done' && active
  const key = `${cycle}-${step}`

  return (
    <svg
      viewBox={`0 ${VIEW.y} ${VIEW.w} ${VIEW.h}`}
      role="img"
      aria-label={label}
      className={cn('h-auto w-full overflow-visible', className)}
    >
      {/* Request → engine */}
      <Wire
        d={`M ${requestRight.x} ${requestRight.y} H ${engineLeft.x}`}
        dashed={!requestLive}
        tone={done || lit('request') ? 'lit' : requestLive ? 'idle' : 'ghost'}
      />

      {/* Engine → each worker: one wire per worker, all fanning out on the right. */}
      {WORKERS.map((w) => (
        <Wire
          key={w.id}
          d={fan(w)}
          visible={joined(w.id)}
          delay={joinDelay(w.id)}
          tone={done || lit(w.id) ? 'lit' : 'idle'}
        />
      ))}

      {/* The call in flight: out of the caller, through the engine, into the callee, then the reply. */}
      {call && active ? (
        <g key={key}>
          <Flow points={route(call.from, call.to)} duration={0.6} />
          {call.to !== 'request' ? (
            <Runner points={[...route(call.from, call.to)].reverse()} delay={0.72} duration={0.42} />
          ) : null}
        </g>
      ) : null}

      <EngineHub
        box={ENGINE_BOX}
        pulseKey={active && (call || done) ? key : undefined}
        lit={Boolean(call) || done}
        environments={joinedCount ? `${joinedCount} worker${joinedCount === 1 ? '' : 's'} registered` : undefined}
      />

      <Node
        cx={REQUEST.x}
        cy={REQUEST.y}
        w={REQUEST.w}
        h={REQUEST.h}
        title="Request"
        center
        dashed={!requestLive}
        tone={lit('request') ? 'lit' : requestLive ? 'idle' : 'ghost'}
      />

      {WORKERS.map((w) => (
        <g key={w.id}>
          <Node
            cx={w.x}
            cy={w.y}
            w={COLUMN.w}
            h={COLUMN.h}
            title={w.id}
            sub={w.fn}
            meta={placeOf(w)}
            metaTone={joiningNow(w.id) ? 'accent' : 'muted'}
            tone={lit(w.id) ? 'lit' : 'idle'}
            visible={joined(w.id)}
            delay={joinDelay(w.id)}
            label={`${w.id}: ${w.fn}`}
          />
          {/* A ready dot the moment the worker registers. */}
          {joiningNow(w.id) ? (
            <motion.circle
              key={key}
              cx={w.x + COLUMN.w / 2}
              cy={w.y - COLUMN.h / 2}
              r={4}
              fill="var(--hero-accent)"
              stroke="var(--background)"
              strokeWidth={STROKE + 0.75}
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: [0, 1, 1, 0], scale: [0.4, 1, 1, 1] }}
              transition={{ duration: 0.9 * T, delay: 0.25 + joinDelay(w.id), times: [0, 0.2, 0.8, 1] }}
              style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            />
          ) : null}
        </g>
      ))}
    </svg>
  )
}

/**
 * The same graph for phones, stacked top to bottom as HTML: request, engine, then the worker column. Every slot
 * is always present (dimmed until it joins) so the block keeps one height, and it shares the beats with the SVG.
 */
export function OverviewStack({ step, active, className }: { step: number; active: boolean; className?: string }) {
  const beat = SCRIPT[step]
  const call = beat.kind === 'call' ? beat : null
  const joined = (id: string) => !active || step >= joinedAt(id)
  const joinedCount = WORKERS.filter((w) => joined(w.id)).length
  const requestLive = !active || step >= 5
  const lit = (id: string) => call?.from === id || call?.to === id
  const done = beat.kind === 'done' && active
  const slot = (on: boolean, hot: boolean) =>
    cn(
      'flex min-w-0 items-center gap-3 rounded-[10px] border bg-card px-3.5 py-2.5 transition-[opacity,border-color,background-color] duration-200',
      hot ? 'border-hero-accent bg-hero-accent/8' : done ? 'border-hero-accent/50' : 'border-line',
      on ? 'opacity-100' : 'border-dashed opacity-40',
    )
  const rail = (on: boolean) =>
    cn('ml-5 h-3 w-px transition-colors duration-200', on || done ? 'bg-hero-accent' : 'bg-line')

  return (
    <div className={cn('flex flex-col font-sans text-[13px]', className)}>
      <div className={slot(requestLive, lit('request'))}>
        <span className="font-medium text-foreground">Request</span>
      </div>
      <div className={rail(lit('request'))} />
      <div className={cn(slot(true, Boolean(call) || done), !call && !done && 'border-foreground/35')}>
        <span aria-hidden className="flex items-end gap-px">
          {[0, 1, 2].map((i) => (
            <span key={i} className="flex flex-col items-center gap-px">
              <span className="size-[3px] bg-foreground" />
              <span className="h-2 w-[3px] bg-foreground" />
            </span>
          ))}
        </span>
        <span className="font-medium text-foreground">iii engine</span>
        <span className="ml-auto truncate text-[12px] text-muted-foreground tabular-nums">
          {joinedCount ? `${joinedCount} registered` : 'empty'}
        </span>
      </div>
      <div className={rail(Boolean(call))} />
      <ol className="flex flex-col gap-1.5">
        {WORKERS.map((w) => (
          <li key={w.id} className={slot(joined(w.id), lit(w.id))}>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate font-medium text-foreground">{w.id}</span>
              <span className="truncate font-mono text-[12px] text-muted-foreground">{w.fn}</span>
            </span>
            <span className="shrink-0 text-[12px] text-muted-foreground">{placeOf(w)}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
