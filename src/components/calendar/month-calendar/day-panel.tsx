/** @purpose Slide-out day detail panel showing all tasks for a selected day with edit capabilities */
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getTeamColor } from '@/lib/utils'
import { formatDateKey } from '@/lib/date-utils'
import { X, Plus, CheckCircle2, Clock, AlertTriangle, Calendar } from 'lucide-react'
import type { Task, Team, TaskStatus } from '@/types/database'

interface DayPanelProps {
  date: Date
  tasks: Task[]
  teamMap: Map<string, Team>
  onClose: () => void
  onEditTask?: (task: Task) => void
  onNewTask?: (status: TaskStatus, dueDate?: string) => void
}

const STATUS_ICONS: Record<string, typeof CheckCircle2> = {
  done: CheckCircle2,
  in_progress: Clock,
  todo: AlertTriangle,
  backlog: Calendar,
}

const STATUS_LABELS: Record<string, string> = {
  done: 'Done',
  in_progress: 'In Progress',
  todo: 'To Do',
  backlog: 'Backlog',
}

export function DayPanel({ date, tasks, teamMap, onClose, onEditTask, onNewTask }: DayPanelProps) {
  const dateStr = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const isToday = formatDateKey(date) === formatDateKey(new Date())

  return (
    <div className="w-[340px] shrink-0 border-l bg-background overflow-y-auto animate-in slide-in-from-right-5 duration-200">
      {/* Header */}
      <div className="sticky top-0 bg-background border-b px-4 py-3 flex items-center justify-between z-10">
        <div>
          <h3 className="font-semibold text-sm">{dateStr}</h3>
          <p className="text-xs text-muted-foreground">
            {tasks.length} task{tasks.length !== 1 ? 's' : ''}
            {isToday && <span className="ml-1 text-primary font-medium">· Today</span>}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Task list */}
      <div className="p-3 space-y-2">
        {tasks.length === 0 && (
          <div className="py-8 text-center">
            <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-40" />
            <p className="text-sm text-muted-foreground">No tasks on this day</p>
          </div>
        )}

        {tasks.map(task => {
          const teamName = teamMap.get(task.team_id)?.name ?? ''
          const color = getTeamColor(teamName)
          const StatusIcon = STATUS_ICONS[task.status] ?? Calendar
          const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'

          return (
            <div
              key={task.id}
              className="rounded-lg border p-3 cursor-pointer hover:bg-muted/30 transition-colors space-y-2"
              onClick={() => onEditTask?.(task)}
            >
              <div className="flex items-start justify-between gap-2">
                <p className={`text-sm font-medium leading-snug ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
                  {task.title}
                </p>
                {task.is_blocked && (
                  <Badge variant="secondary" className="shrink-0 text-[10px] bg-amber-100 text-amber-700">Blocked</Badge>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Team badge */}
                <span
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: `${color.bar}15`, color: color.bar }}
                >
                  {teamName}
                </span>

                {/* Status */}
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <StatusIcon className="h-3 w-3" />
                  {STATUS_LABELS[task.status]}
                </span>

                {/* Priority */}
                <span className={`text-[10px] font-medium ${
                  task.priority === 'high' ? 'text-red-600' :
                  task.priority === 'medium' ? 'text-amber-600' :
                  'text-muted-foreground'
                }`}>
                  {task.priority}
                </span>

                {/* Overdue indicator */}
                {isOverdue && (
                  <span className="text-[10px] font-semibold text-red-600">overdue</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Add task button */}
      <div className="sticky bottom-0 bg-background border-t p-3">
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1.5"
          onClick={() => onNewTask?.('todo', formatDateKey(date))}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Task on {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </Button>
      </div>
    </div>
  )
}
