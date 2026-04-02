import { isSameDay } from '@/lib/date-utils'
import type { Task } from '@/types/database'

interface CalendarDayCellProps {
  date: Date
  tasks: Task[]
  isCurrentMonth: boolean
}

const priorityColors: Record<string, string> = {
  high: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  low: 'bg-blue-100 text-blue-700 border-blue-200',
}

export function CalendarDayCell({ date, tasks, isCurrentMonth }: CalendarDayCellProps) {
  const isToday = isSameDay(date, new Date())
  const maxVisible = 3
  const overflow = tasks.length - maxVisible

  return (
    <div
      className={`min-h-24 border-r border-b p-1.5 ${
        isCurrentMonth ? 'bg-background' : 'bg-muted/20'
      }`}
    >
      {/* Day number */}
      <div className="mb-1">
        <span
          className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
            isToday
              ? 'bg-primary text-primary-foreground'
              : isCurrentMonth
                ? 'text-foreground'
                : 'text-muted-foreground/50'
          }`}
        >
          {date.getDate()}
        </span>
      </div>

      {/* Task chips */}
      <div className="flex flex-col gap-0.5">
        {tasks.slice(0, maxVisible).map(task => (
          <div
            key={task.id}
            className={`truncate rounded border px-1.5 py-0.5 text-[10px] leading-tight ${
              priorityColors[task.priority] ?? 'bg-muted text-foreground border-border'
            }`}
            title={task.title}
          >
            {task.title}
          </div>
        ))}
        {overflow > 0 && (
          <span className="text-[10px] text-muted-foreground pl-1">
            +{overflow} more
          </span>
        )}
      </div>
    </div>
  )
}
