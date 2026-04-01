import { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useMembers } from '@/hooks/use-members'
import { useSprints } from '@/hooks/use-sprints'
import { useAllAssignees } from '@/hooks/use-assignees'
import { AlertCircle, Clock } from 'lucide-react'
import type { Task, TaskStatus, TaskPriority } from '@/types/database'

interface StatusConfig {
  key: TaskStatus
  label: string
  color: string
  dotColor: string
}

interface PortalTaskListProps {
  tasks: Task[]
  statusConfig: StatusConfig[]
  onEditTask: (task: Task) => void
}

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-gray-100 text-gray-600',
}

function getDaysInStatus(task: Task): number {
  const updated = new Date(task.updated_at)
  const now = new Date()
  return Math.floor((now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24))
}

export function PortalTaskList({ tasks, statusConfig, onEditTask }: PortalTaskListProps) {
  const { data: members } = useMembers()
  const { data: sprints } = useSprints()
  const { data: allAssignees = [] } = useAllAssignees()

  const grouped = useMemo(() => {
    return statusConfig.map((config) => ({
      ...config,
      tasks: tasks
        .filter((t) => t.status === config.key)
        .sort((a, b) => a.position - b.position),
    }))
  }, [tasks, statusConfig])

  return (
    <div className="space-y-4">
      {grouped.map((group) => (
        <Card key={group.key}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className={`h-2.5 w-2.5 rounded-full ${group.dotColor}`} />
              <CardTitle className="text-sm font-semibold">{group.label}</CardTitle>
              <Badge variant="secondary" className="text-xs">{group.tasks.length}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {group.tasks.length === 0 && (
              <p className="py-3 text-center text-xs text-muted-foreground italic">No items</p>
            )}
            {group.tasks.map((task) => {
              const taskAssignees = allAssignees.filter((a) => a.task_id === task.id)
              const assigneeNames = taskAssignees.map((a) => members?.find((m) => m.id === a.member_id)?.full_name).filter(Boolean)
              const assignedBy = members?.find((m) => m.id === task.assigned_by_id)
              const sprint = sprints?.find((s) => s.id === task.sprint_id)
              const days = getDaysInStatus(task)

              return (
                <button
                  key={task.id}
                  onClick={() => onEditTask(task)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-muted/50 transition-colors ${
                    task.is_blocked ? 'border-l-3 border-l-destructive bg-destructive/5' : ''
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{task.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {assigneeNames.length > 0 && (
                        <span className="text-xs text-muted-foreground">{assigneeNames.join(', ')}</span>
                      )}
                      {assignedBy && (
                        <span className="text-xs text-muted-foreground">
                          (from {assignedBy.full_name})
                        </span>
                      )}
                      {sprint && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          Sprint {sprint.number}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${PRIORITY_COLORS[task.priority]}`}>
                      {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                    </Badge>
                    {task.is_blocked && (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    )}
                    {days > 0 && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {days}d
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
