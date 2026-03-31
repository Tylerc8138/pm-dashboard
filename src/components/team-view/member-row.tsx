import { Badge } from '@/components/ui/badge'
import { HealthIndicator, getMemberHealth } from './health-indicator'
import type { Member, Task, TaskPriority } from '@/types/database'

const STATUS_LABELS: Record<string, string> = {
  backlog: 'Backlog',
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
}

const STATUS_COLORS: Record<string, string> = {
  backlog: 'bg-gray-100 text-gray-600',
  todo: 'bg-blue-100 text-blue-600',
  in_progress: 'bg-amber-100 text-amber-700',
  done: 'bg-green-100 text-green-600',
}

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-gray-100 text-gray-600',
}

interface MemberRowProps {
  member: Member | null
  tasks: Task[]
  onEditTask: (task: Task) => void
}

export function MemberRow({ member, tasks, onEditTask }: MemberRowProps) {
  const activeTasks = tasks.filter((t) => t.status !== 'done')
  const health = getMemberHealth(tasks)

  return (
    <div className="flex items-start gap-3 rounded-lg px-3 py-2 hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-2 w-[200px] shrink-0 pt-0.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-medium">
          {member ? member.full_name.split(' ').map((n) => n[0]).join('') : '?'}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{member?.full_name ?? 'Unassigned'}</p>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">{activeTasks.length} active</span>
            <HealthIndicator health={health} size="sm" />
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-wrap gap-1.5">
        {tasks.map((task) => (
          <button
            key={task.id}
            onClick={() => onEditTask(task)}
            className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs hover:shadow-sm transition-shadow ${
              task.is_blocked ? 'border-destructive/50 bg-destructive/5' : 'bg-white'
            }`}
          >
            <Badge variant="secondary" className={`text-[9px] px-1 py-0 ${STATUS_COLORS[task.status] ?? ''}`}>
              {STATUS_LABELS[task.status]}
            </Badge>
            <span className="max-w-[200px] truncate">{task.title}</span>
            <Badge variant="secondary" className={`text-[9px] px-1 py-0 ${PRIORITY_COLORS[task.priority]}`}>
              {task.priority.charAt(0).toUpperCase()}
            </Badge>
          </button>
        ))}
        {tasks.length === 0 && (
          <span className="text-xs text-muted-foreground italic py-1">No tasks assigned</span>
        )}
      </div>
    </div>
  )
}
