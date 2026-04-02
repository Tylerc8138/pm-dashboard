import { dateToX, parseDate } from '@/lib/date-utils'
import type { SprintWithTasks } from '@/hooks/use-calendar-data'

interface TimelineRowProps {
  sprint: SprintWithTasks
  startDate: Date
  dayWidth: number
  yPosition: number
  rowHeight: number
}

export function TimelineRow({ sprint, startDate, dayWidth, yPosition, rowHeight }: TimelineRowProps) {
  const barX = dateToX(parseDate(sprint.start_date ?? ''), startDate, dayWidth)
  const barEnd = dateToX(parseDate(sprint.end_date ?? ''), startDate, dayWidth)
  const barWidth = Math.max(barEnd - barX, 8)
  const progress = sprint.totalCount > 0 ? sprint.doneCount / sprint.totalCount : 0
  const barY = yPosition + 8
  const barH = rowHeight - 16

  // Color based on status
  let fillColor = '#3b82f6' // blue — in progress
  let progressColor = '#2563eb'
  if (progress === 1) {
    fillColor = '#22c55e' // green — complete
    progressColor = '#16a34a'
  } else if (sprint.hasBlocked) {
    fillColor = '#f59e0b' // amber — has blocked
    progressColor = '#d97706'
  }

  return (
    <g>
      {/* Background bar */}
      <rect
        x={barX}
        y={barY}
        width={barWidth}
        height={barH}
        rx={6}
        fill={fillColor}
        opacity={0.15}
        stroke={fillColor}
        strokeWidth={1}
        strokeOpacity={0.3}
      />

      {/* Progress fill */}
      {progress > 0 && (
        <rect
          x={barX}
          y={barY}
          width={barWidth * progress}
          height={barH}
          rx={6}
          fill={progressColor}
          opacity={0.5}
        />
      )}

      {/* Remaining portion dashed outline (if not complete) */}
      {progress > 0 && progress < 1 && (
        <rect
          x={barX + barWidth * progress}
          y={barY}
          width={barWidth * (1 - progress)}
          height={barH}
          rx={0}
          fill="none"
          stroke={fillColor}
          strokeWidth={1}
          strokeDasharray="4 2"
          strokeOpacity={0.4}
        />
      )}

      {/* Task count label */}
      <text
        x={barX + 10}
        y={barY + barH / 2 + 4}
        fontSize={11}
        fontWeight={500}
        className="fill-foreground"
      >
        {sprint.doneCount}/{sprint.totalCount} tasks
      </text>
    </g>
  )
}
