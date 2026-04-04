/** @purpose Individual day cell in month calendar — clickable tasks, hover add button, selected state */
import { isSameDay, formatDateKey } from '@/lib/date-utils'
import { getTeamColor } from '@/lib/utils'
import { Plus } from 'lucide-react'
import type { Task, Team, TaskStatus } from '@/types/database'

interface CalendarDayCellProps {
  date: Date
  tasks: Task[]
  isCurrentMonth: boolean
  teamMap: Map<string, Team>
  isSelected?: boolean
  onDayClick?: (date: Date) => void
  onTaskClick?: (task: Task) => void
  onNewTask?: (status: TaskStatus, dueDate?: string) => void
}

export function CalendarDayCell({ date, tasks, isCurrentMonth, teamMap, isSelected, onDayClick, onTaskClick, onNewTask }: CalendarDayCellProps) {
  const isToday = isSameDay(date, new Date())
  const maxVisible = 3
  const overflow = tasks.length - maxVisible

  return (
    <div
      className={`min-h-28 border-r border-b border-border/50 p-1.5 transition-colors group relative ${
        isSelected
          ? 'bg-primary/5 ring-2 ring-primary ring-inset'
          : isCurrentMonth
            ? 'bg-background hover:bg-muted/20'
            : 'bg-muted/10'
      }`}
    >
      {/* Day number — clickable to open day panel */}
      <div className="mb-1.5 flex items-center justify-between">
        <button
          onClick={() => onDayClick?.(date)}
          className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium transition-colors ${
            isToday
              ? 'bg-primary text-primary-foreground shadow-sm'
              : isCurrentMonth
                ? 'text-foreground hover:bg-muted'
                : 'text-muted-foreground/40'
          }`}
        >
          {date.getDate()}
        </button>
        <div className="flex items-center gap-1">
          {tasks.length > 0 && isCurrentMonth && (
            <span className="text-[9px] text-muted-foreground/60 tabular-nums">
              {tasks.length}
            </span>
          )}
          {/* Hover add button */}
          {isCurrentMonth && (
            <button
              onClick={(e) => { e.stopPropagation(); onNewTask?.('todo', formatDateKey(date)) }}
              className="h-5 w-5 items-center justify-center rounded text-muted-foreground/40 hover:text-primary hover:bg-primary/10 transition-colors hidden group-hover:inline-flex"
              title="Add task"
            >
              <Plus className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Task chips — clickable */}
      <div className="flex flex-col gap-[3px]">
        {tasks.slice(0, maxVisible).map(task => {
          const teamName = teamMap.get(task.team_id)?.name ?? ''
          const color = getTeamColor(teamName)
          return (
            <div
              key={task.id}
              className="flex items-center gap-1 rounded-md px-1.5 py-[3px] cursor-pointer hover:opacity-80 transition-opacity"
              style={{ backgroundColor: `${color.bar}12` }}
              title={`${task.title} (${teamName})`}
              onClick={(e) => { e.stopPropagation(); onTaskClick?.(task) }}
            >
              <div
                className="h-1.5 w-1.5 rounded-full shrink-0"
                style={{ backgroundColor: color.bar }}
              />
              <span
                className="truncate text-[10px] leading-tight font-medium"
                style={{ color: color.bar }}
              >
                {task.title}
              </span>
            </div>
          )
        })}
        {overflow > 0 && (
          <button
            onClick={() => onDayClick?.(date)}
            className="text-[10px] text-muted-foreground/60 pl-1 font-medium hover:text-primary transition-colors text-left"
          >
            +{overflow} more
          </button>
        )}
      </div>
    </div>
  )
}
