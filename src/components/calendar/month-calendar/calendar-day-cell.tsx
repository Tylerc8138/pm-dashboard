import { isSameDay } from '@/lib/date-utils'
import { getTeamColor } from '@/lib/utils'
import type { Task, Team } from '@/types/database'

interface CalendarDayCellProps {
  date: Date
  tasks: Task[]
  isCurrentMonth: boolean
  teamMap: Map<string, Team>
}

export function CalendarDayCell({ date, tasks, isCurrentMonth, teamMap }: CalendarDayCellProps) {
  const isToday = isSameDay(date, new Date())
  const maxVisible = 3
  const overflow = tasks.length - maxVisible

  return (
    <div
      className={`min-h-28 border-r border-b border-border/50 p-1.5 transition-colors ${
        isCurrentMonth
          ? 'bg-background hover:bg-muted/20'
          : 'bg-muted/10'
      }`}
    >
      {/* Day number */}
      <div className="mb-1.5 flex items-center justify-between">
        <span
          className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
            isToday
              ? 'bg-primary text-primary-foreground shadow-sm'
              : isCurrentMonth
                ? 'text-foreground'
                : 'text-muted-foreground/40'
          }`}
        >
          {date.getDate()}
        </span>
        {tasks.length > 0 && isCurrentMonth && (
          <span className="text-[9px] text-muted-foreground/60 tabular-nums">
            {tasks.length}
          </span>
        )}
      </div>

      {/* Task chips */}
      <div className="flex flex-col gap-[3px]">
        {tasks.slice(0, maxVisible).map(task => {
          const teamName = teamMap.get(task.team_id)?.name ?? ''
          const color = getTeamColor(teamName)
          return (
            <div
              key={task.id}
              className="flex items-center gap-1 rounded-md px-1.5 py-[3px] group cursor-default"
              style={{ backgroundColor: `${color.bar}12` }}
              title={`${task.title} (${teamName})`}
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
          <span className="text-[10px] text-muted-foreground/60 pl-1 font-medium">
            +{overflow} more
          </span>
        )}
      </div>
    </div>
  )
}
