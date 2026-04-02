import { useRef, useCallback } from 'react'
import { useCalendarData } from '@/hooks/use-calendar-data'
import { daysBetween, dateToX } from '@/lib/date-utils'
import { TimelineHeader } from './timeline-header'
import { TimelineRow } from './timeline-row'

const HEADER_HEIGHT = 48
const ROW_HEIGHT = 56
const ROW_GAP = 4
const DAY_WIDTH = 4

export function TimelineView() {
  const { sprintsWithTasks, dateRange, isLoading } = useCalendarData()
  const scrollRef = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLDivElement>(null)

  const handleScroll = useCallback(() => {
    if (scrollRef.current && labelRef.current) {
      labelRef.current.scrollTop = scrollRef.current.scrollTop
    }
  }, [])

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Loading timeline...
      </div>
    )
  }

  if (!dateRange || sprintsWithTasks.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
        <p className="text-sm">No sprints with dates to display.</p>
        <p className="text-xs">Set start and end dates on your sprints to see them here.</p>
      </div>
    )
  }

  const totalDays = daysBetween(dateRange.start, dateRange.end)
  const totalWidth = totalDays * DAY_WIDTH
  const totalHeight = HEADER_HEIGHT + sprintsWithTasks.length * (ROW_HEIGHT + ROW_GAP)

  const today = new Date()
  const todayX = dateToX(today, dateRange.start, DAY_WIDTH)
  const todayVisible = todayX >= 0 && todayX <= totalWidth

  return (
    <div className="flex h-full">
      {/* Fixed sprint name column */}
      <div
        ref={labelRef}
        className="w-48 shrink-0 overflow-hidden border-r bg-background"
      >
        {/* Header spacer */}
        <div className="h-12 border-b bg-muted/30 px-3 flex items-end pb-1">
          <span className="text-xs font-medium text-muted-foreground">Sprints</span>
        </div>

        {/* Sprint labels */}
        {sprintsWithTasks.map(sprint => (
          <div
            key={sprint.id}
            className="flex items-center gap-2 px-3 border-b"
            style={{ height: ROW_HEIGHT + ROW_GAP }}
          >
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium truncate">
                {sprint.name}
              </span>
              <span className="text-xs text-muted-foreground">
                Sprint {sprint.number}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Scrollable SVG area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto"
        onScroll={handleScroll}
      >
        <svg width={totalWidth} height={totalHeight} className="block">
          <TimelineHeader
            startDate={dateRange.start}
            endDate={dateRange.end}
            dayWidth={DAY_WIDTH}
            totalWidth={totalWidth}
          />

          {/* Row background stripes */}
          {sprintsWithTasks.map((_, i) => (
            <rect
              key={i}
              x={0}
              y={HEADER_HEIGHT + i * (ROW_HEIGHT + ROW_GAP)}
              width={totalWidth}
              height={ROW_HEIGHT + ROW_GAP}
              fill={i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)'}
            />
          ))}

          {/* Sprint bars */}
          {sprintsWithTasks.map((sprint, i) => (
            <TimelineRow
              key={sprint.id}
              sprint={sprint}
              startDate={dateRange.start}
              dayWidth={DAY_WIDTH}
              yPosition={HEADER_HEIGHT + i * (ROW_HEIGHT + ROW_GAP)}
              rowHeight={ROW_HEIGHT}
            />
          ))}

          {/* Today line */}
          {todayVisible && (
            <line
              x1={todayX}
              y1={0}
              x2={todayX}
              y2={totalHeight}
              stroke="#ef4444"
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
          )}
        </svg>
      </div>
    </div>
  )
}
