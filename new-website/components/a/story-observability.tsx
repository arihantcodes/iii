import { IconActivity } from '@/components/icons/iconly'

import { cn } from '@/lib/utils'
import shared from './story.module.css'
import { OBSERVE_ELAPSED, STORY_TRACE, storyBeatDuration } from './story-model'
import styles from './story-observability.module.css'
import { ObservabilityChart } from './story-observability-chart'
import { OBSERVABILITY_TOTALS } from './story-observability-data'
import { TraceWaterfall } from './trace-waterfall'

/** The observability chapter replaces the worker graph with inspectable function metrics and traces. */
export function ObserveActivity({
  beat,
  running,
  onInspectChange,
}: {
  beat: number
  running: boolean
  onInspectChange: (id: string, active: boolean) => void
}) {
  const complete = beat >= 5
  const failureRate = ((OBSERVABILITY_TOTALS.failed / OBSERVABILITY_TOTALS.calls) * 100).toFixed(1)
  return (
    <figure
      className={cn(shared.activity, styles.dashboard)}
      data-stage="observe"
      data-beat={beat}
      data-running={running}
    >
      <figcaption className={shared.activityHeader}>
        <span className={shared.activityIcon}>
          <IconActivity className="size-4" />
        </span>
        <span className={shared.activityLabel}>Observability</span>
        <span className={shared.activityStatus}>Sample iii workload · 24h</span>
      </figcaption>
      <div className={styles.metrics}>
        <figure className={styles.metric}>
          <figcaption className={styles.metricHeading}>
            <span>Function calls</span>
            <strong>{OBSERVABILITY_TOTALS.calls.toLocaleString('en-US')}</strong>
          </figcaption>
          <ul className={styles.legend}>
            <li className={styles.success}>
              <span aria-hidden />
              <span>Completed</span>
            </li>
            <li className={styles.serverError}>
              <span aria-hidden />
              <span>Failed</span>
            </li>
          </ul>
          <ObservabilityChart kind="calls" beat={beat} running={running} onInspectChange={onInspectChange} />
          <ChartRange />
        </figure>
        <figure className={cn(styles.metric, styles.errorMetric)}>
          <figcaption className={styles.metricHeading}>
            <span>Failed calls</span>
            <strong>{OBSERVABILITY_TOTALS.failed}</strong>
          </figcaption>
          <p className={styles.errorDescription}>{failureRate}% of function calls</p>
          <ObservabilityChart kind="failures" beat={beat} running={running} onInspectChange={onInspectChange} />
          <ChartRange />
        </figure>
      </div>
      <div className={styles.request}>
        <TraceWaterfall
          compact
          title="Request trace"
          meta={
            <span className={styles.requestStatus} data-complete={complete}>
              <code>POST /orders</code>
              <span aria-hidden>·</span>
              {complete ? '128 ms total' : beat >= 2 ? 'Tracing' : 'Waiting for a request'}
            </span>
          }
          ticks={['0', '32 ms', '64 ms', '96 ms', '128 ms']}
          total={128}
          spans={STORY_TRACE}
          elapsed={OBSERVE_ELAPSED[beat] ?? 128}
          active={complete ? undefined : STORY_TRACE.find((span) => span.at + 2 === beat)?.id}
          running={running}
          stepMs={storyBeatDuration('observe', beat)}
        >
          <p className={styles.traceSummary}>3 spans · 2 languages · local + cloud · one trace id</p>
        </TraceWaterfall>
      </div>
      <div className={cn(shared.activityFooter, styles.footer)}>
        <span>Exported over OTLP to your observability stack</span>
        <span className={styles.inspectHint}>Hover or tap a chart to inspect</span>
      </div>
    </figure>
  )
}

function ChartRange() {
  return (
    <div className={styles.chartRange} aria-hidden>
      <span>00:00</span>
      <span>UTC</span>
      <span>24:00</span>
    </div>
  )
}
