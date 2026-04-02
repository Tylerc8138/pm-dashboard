import { dateToX, parseDate } from '@/lib/date-utils'
import { getTeamColor } from '@/lib/utils'
import type { SprintWithTasks } from '@/hooks/use-calendar-data'
import type { Team } from '@/types/database'

interface TimelineRowProps {
  sprint: SprintWithTasks
  startDate: Date
  dayWidth: number
  yPosition: number
  rowHeight: number
  teamMap: Map<string, Team>
}

export function TimelineRow({ sprint, startDate, dayWidth, yPosition, rowHeight, teamMap }: TimelineRowProps) {
  const barX = dateToX(parseDate(sprint.start_date ?? ''), startDate, dayWidth)
  const barEnd = dateToX(parseDate(sprint.end_date ?? ''), startDate, dayWidth)
  const barWidth = Math.max(barEnd - barX, 12)
  const progress = sprint.totalCount > 0 ? sprint.doneCount / sprint.totalCount : 0
  const barY = yPosition + (rowHeight - 28) / 2
  const barH = 28

  // Get dominant team color for this sprint's tasks
  const teamCounts = new Map<string, number>()
  for (const task of sprint.tasks) {
    teamCounts.set(task.team_id, (teamCounts.get(task.team_id) ?? 0) + 1)
  }
  let dominantTeamName = ''
  let maxCount = 0
  for (const [tid, count] of teamCounts) {
    if (count > maxCount) {
      maxCount = count
      dominantTeamName = teamMap.get(tid)?.name ?? ''
    }
  }
  const color = getTeamColor(dominantTeamName)

  // Milestone markers at 25%, 50%, 75% of the bar
  const milestones = [0.25, 0.5, 0.75].map(pct => ({
    x: barX + barWidth * pct,
    passed: progress >= pct,
  }))

  return (
    <g>
      {/* Background bar */}
      <rect
        x={barX}
        y={barY}
        width={barWidth}
        height={barH}
        rx={6}
        fill={color.barBg}
        stroke={color.bar}
        strokeWidth={0.5}
        strokeOpacity={0.3}
      />

      {/* Progress fill */}
      {progress > 0 && (
        <rect
          x={barX}
          y={barY}
          width={Math.min(barWidth * progress, barWidth)}
          height={barH}
          rx={6}
          fill={color.bar}
          opacity={0.55}
        />
      )}

      {/* Remaining dashed outline */}
      {progress > 0 && progress < 1 && (
        <line
          x1={barX + barWidth * progress}
          y1={barY + barH / 2}
          x2={barX + barWidth}
          y2={barY + barH / 2}
          stroke={color.bar}
          strokeWidth={2}
          strokeDasharray="6 3"
          strokeOpacity={0.3}
        />
      )}

      {/* Milestone diamonds */}
      {milestones.map((ms, i) => (
        <g key={i} transform={`translate(${ms.x}, ${barY + barH + 10})`}>
          <polygon
            points="0,-4 4,0 0,4 -4,0"
            fill={ms.passed ? color.bar : '#3a3a5a'}
            stroke={ms.passed ? color.bar : '#4a4a6a'}
            strokeWidth={1}
          />
        </g>
      ))}

      {/* Task count inside bar */}
      {barWidth > 60 && (
        <text
          x={barX + 10}
          y={barY + barH / 2 + 4}
          fontSize={11}
          fontWeight={500}
          fill="#e0e0f0"
        >
          {sprint.doneCount}/{sprint.totalCount}
        </text>
      )}
    </g>
  )
}
