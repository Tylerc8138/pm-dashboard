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
  const barWidth = Math.max(barEnd - barX, 20)
  const progress = sprint.totalCount > 0 ? sprint.doneCount / sprint.totalCount : 0
  const barH = 36
  const barY = yPosition + (rowHeight - barH) / 2

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

  return (
    <g>
      {/* Background bar */}
      <rect
        x={barX}
        y={barY}
        width={barWidth}
        height={barH}
        rx={8}
        fill={color.barBg}
        stroke={color.bar}
        strokeWidth={1}
        strokeOpacity={0.15}
      />

      {/* Progress fill */}
      {progress > 0 && (
        <rect
          x={barX}
          y={barY}
          width={Math.min(barWidth * progress, barWidth)}
          height={barH}
          rx={8}
          fill={color.bar}
          opacity={0.3}
        />
      )}

      {/* Remaining dashed line */}
      {progress > 0 && progress < 1 && (
        <line
          x1={barX + barWidth * progress}
          y1={barY + barH / 2}
          x2={barX + barWidth}
          y2={barY + barH / 2}
          stroke={color.bar}
          strokeWidth={2}
          strokeDasharray="6 4"
          strokeOpacity={0.25}
        />
      )}

      {/* Task count label — show next to bar if bar is too small, otherwise inside */}
      <text
        x={barWidth > 80 ? barX + 12 : barX + barWidth + 8}
        y={barY + barH / 2 + 5}
        fontSize={13}
        fontWeight={600}
        fill={barWidth > 80 ? color.bar : '#6b7280'}
      >
        {sprint.doneCount}/{sprint.totalCount} tasks
      </text>

      {/* Due date markers — diamond for each task with a due_date */}
      {sprint.tasks
        .filter(t => t.due_date)
        .map(t => {
          const dx = dateToX(parseDate(t.due_date!), startDate, dayWidth)
          const isDone = t.status === 'done'
          const isOverdue = !isDone && new Date(t.due_date!) < new Date()
          const fill = isDone ? '#22c55e' : isOverdue ? '#ef4444' : color.bar
          return (
            <g key={`due-${t.id}`}>
              <polygon
                points={`${dx},${barY - 2} ${dx + 5},${barY + 4} ${dx},${barY + 10} ${dx - 5},${barY + 4}`}
                fill={fill}
                opacity={0.85}
              />
              <title>{t.title} — due {t.due_date}{isOverdue ? ' (overdue)' : ''}</title>
            </g>
          )
        })}
    </g>
  )
}
