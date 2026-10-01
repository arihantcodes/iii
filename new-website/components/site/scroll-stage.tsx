import { cn } from '@/lib/utils'

/**
 * Keeps a wide diagram legible on phones: below `sm` it holds a minimum width and scrolls sideways, bleeding into
 * the page gutters; from `sm` up it is a plain block. Prefer this over shrinking SVG text to 7px.
 */
export function ScrollStage({
  children,
  minWidth = 560,
  className,
}: {
  children: React.ReactNode
  minWidth?: number
  className?: string
}) {
  return (
    <div
      className={cn(
        '-mx-5 overflow-x-auto overscroll-x-contain px-5 [scrollbar-width:none] sm:mx-0 sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden',
        className,
      )}
    >
      <div style={{ minWidth: `min(${minWidth}px, 100%)` }} className="sm:!min-w-0">
        <div style={{ minWidth: `${minWidth}px` }} className="sm:!min-w-0">
          {children}
        </div>
      </div>
    </div>
  )
}
