import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { TaskCard } from './task-card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import type { Task, TaskStatus } from '@/types/database'

const STATUS_COLORS: Record<TaskStatus, string> = {
  backlog: 'bg-gray-400',
  todo: 'bg-blue-500',
  in_progress: 'bg-amber-500',
  done: 'bg-green-500',
}

interface KanbanColumnProps {
  id: TaskStatus
  label: string
  tasks: Task[]
  onEditTask: (task: Task) => void
  onNewTask: () => void
}

export function KanbanColumn({ id, label, tasks, onEditTask, onNewTask }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({ id })
  const highCount = tasks.filter((t) => t.priority === 'high').length

  return (
    <div className="flex min-w-[280px] max-w-[320px] flex-1 flex-col rounded-xl bg-muted/50 border">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <div className={`h-2.5 w-2.5 rounded-full ${STATUS_COLORS[id]}`} />
          <h3 className="text-sm font-semibold">{label}</h3>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {tasks.length}
          </span>
        </div>
        {highCount > 0 && <span className="text-xs text-red-600">{highCount} high</span>}
      </div>

      <div ref={setNodeRef} className="flex flex-1 flex-col gap-2 overflow-y-auto p-3 min-h-[300px]">
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={() => onEditTask(task)} />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <p className="py-8 text-center text-xs text-muted-foreground">
            No tasks
          </p>
        )}
      </div>

      <div className="p-3 pt-0">
        <Button variant="ghost" size="sm" className="w-full gap-1.5 text-muted-foreground" onClick={onNewTask}>
          <Plus className="h-4 w-4" />
          Add task
        </Button>
      </div>
    </div>
  )
}
