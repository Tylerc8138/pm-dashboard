/** @purpose Timeline row with sprint bar resize handles, draggable task diamonds, and click handlers */
import { useState } from 'react'
import { dateToX, parseDate, xToDate, formatDateKey } from '@/lib/date-utils'
import { getTeamColor } from '@/lib/utils'
import { useSvgDrag } from '@/hooks/use-svg-drag'
import type { SprintWithTasks } from '@/hooks/use-calendar-data'
import type { Task, Team } from '@/types/database'

interface TimelineRowProps {
  sprint: SprintWithTasks
  startDate: Date
  dayWidth: number
  yPosition: number
  rowHeight: number
  teamMap: Map<string, Team>
  onTaskClick?: (task: Task) => void
  onSprintResize?: (sprintId: string, field: 'start_date' | 'end_date', newDate: string) => void
  onTaskReschedule?: (taskId: string, newDueDate: string) => void
}

function SprintResizeHandle({ x, y, height, startDate, dayWidth, onResize }: {
  x: number; y: number; height: number; startDate: Date; dayWidth: number
  onResize: (newDate: string) => void
}) {
  const [previewX, setPreviewX] = useState<number | null>(null)

  const { handlePointerDown } = useSvgDrag({
    onDragMove: (svgX) => setPreviewX(svgX),
    onDragEnd: (svgX) => {
      setPreviewX(null)
      const newDate = xToDate(svgX, startDate, dayWidth)
      onResize(formatDateKey(newDate))
    },
  })

  return (
    <g>
      {previewX !== null && (
        <line x1={previewX} y1={y} x2={previewX} y2={y + height} stroke="#1a56db" strokeWidth={2} strokeDasharray="4 2" />
      )}
      <rect
        x={x - 4}
        y={y}
        width={8}
        height={height}
        fill="transparent"
        className="cursor-col-resize pointer-events-auto"
        onPointerDown={handlePointerDown}
      />
    </g>
  )
}

function DraggableTaskDiamond({ task, dx, barY, fill, startDate, dayWidth, onTaskClick, onTaskReschedule }: {
  task: Task; dx: number; barY: number; fill: string; startDate: Date; dayWidth: number
  onTaskClick?: (task: Task) => void
  onTaskReschedule?: (taskId: string, newDueDate: string) => void
}) {
  const [dragX, setDragX] = useState<number | null>(null)
  const currentX = dragX ?? dx

  const { handlePointerDown } = useSvgDrag({
    onClick: () => onTaskClick?.(task),
    onDragMove: (svgX) => setDragX(svgX),
    onDragEnd: (svgX) => {
      setDragX(null)
      const newDate = xToDate(svgX, startDate, dayWidth)
      onTaskReschedule?.(task.id, formatDateKey(newDate))
    },
  })

  const isOverdue = task.due_date && !task.status.includes('done') && new Date(task.due_date) < new Date()

  return (
    <g className="cursor-grab pointer-events-auto" onPointerDown={handlePointerDown}>
      <polygon
        points={`${currentX},${barY - 2} ${currentX + 5},${barY + 4} ${currentX},${barY + 10} ${currentX - 5},${barY + 4}`}
        fill={fill}
        opacity={dragX !== null ? 1 : 0.85}
      />
      {/* Larger hit area */}
      <circle cx={currentX} cy={barY + 4} r={8} fill="transparent" />
      {/* Date tooltip during drag */}
      {dragX !== null && (
        <text x={currentX + 10} y={barY + 6} fontSize={10} fill="#1a56db" fontWeight={600}>
          {formatDateKey(xToDate(dragX, startDate, dayWidth))}
        </text>
      )}
      <title>{task.title} — due {task.due_date}{isOverdue ? ' (overdue)' : ''}</title>
    </g>
  )
}

export function TimelineRow({ sprint, startDate, dayWidth, yPosition, rowHeight, teamMap, onTaskClick, onSprintResize, onTaskReschedule }: TimelineRowProps) {
  const barX = dateToX(parseDate(sprint.start_date ?? ''), startDate, dayWidth)
  const barEnd = dateToX(parseDate(sprint.end_date ?? ''), startDate, dayWidth)
  const barWidth = Math.max(barEnd - barX, 20)
  const progress = sprint.totalCount > 0 ? sprint.doneCount / sprint.totalCount : 0
  const barH = 36
  const barY = yPosition + (rowHeight - barH) / 2

  const teamCounts = new Map<string, number>()
  for (const task of sprint.tasks) {
    teamCounts.set(task.team_id, (teamCounts.get(task.team_id) ?? 0) + 1)
  }
  let dominantTeamName = ''
  let maxCount = 0
  for (const [tid, count] of teamCounts) {
    if (count > maxCount) { maxCount = count; dominantTeamName = teamMap.get(tid)?.name ?? '' }
  }
  const color = getTeamColor(dominantTeamName)

  return (
    <g>
      {/* Background bar */}
      <rect x={barX} y={barY} width={barWidth} height={barH} rx={8} fill={color.barBg} stroke={color.bar} strokeWidth={1} strokeOpacity={0.15} />

      {/* Progress fill */}
      {progress > 0 && (
        <rect x={barX} y={barY} width={Math.min(barWidth * progress, barWidth)} height={barH} rx={8} fill={color.bar} opacity={0.3} />
      )}

      {/* Remaining dashed line */}
      {progress > 0 && progress < 1 && (
        <line x1={barX + barWidth * progress} y1={barY + barH / 2} x2={barX + barWidth} y2={barY + barH / 2} stroke={color.bar} strokeWidth={2} strokeDasharray="6 4" strokeOpacity={0.25} />
      )}

      {/* Task count label */}
      <text x={barWidth > 80 ? barX + 12 : barX + barWidth + 8} y={barY + barH / 2 + 5} fontSize={13} fontWeight={600} fill={barWidth > 80 ? color.bar : '#6b7280'}>
        {sprint.doneCount}/{sprint.totalCount} tasks
      </text>

      {/* Sprint resize handles */}
      {onSprintResize && (
        <>
          <SprintResizeHandle
            x={barX}
            y={barY}
            height={barH}
            startDate={startDate}
            dayWidth={dayWidth}
            onResize={(newDate) => onSprintResize(sprint.id, 'start_date', newDate)}
          />
          <SprintResizeHandle
            x={barX + barWidth}
            y={barY}
            height={barH}
            startDate={startDate}
            dayWidth={dayWidth}
            onResize={(newDate) => onSprintResize(sprint.id, 'end_date', newDate)}
          />
        </>
      )}

      {/* Due date markers — draggable diamonds */}
      {sprint.tasks
        .filter(t => t.due_date)
        .map(t => {
          const tdx = dateToX(parseDate(t.due_date!), startDate, dayWidth)
          const isDone = t.status === 'done'
          const isOverdue = !isDone && new Date(t.due_date!) < new Date()
          const fill = isDone ? '#22c55e' : isOverdue ? '#ef4444' : color.bar
          return (
            <DraggableTaskDiamond
              key={`due-${t.id}`}
              task={t}
              dx={tdx}
              barY={barY}
              fill={fill}
              startDate={startDate}
              dayWidth={dayWidth}
              onTaskClick={onTaskClick}
              onTaskReschedule={onTaskReschedule}
            />
          )
        })}
    </g>
  )
}
