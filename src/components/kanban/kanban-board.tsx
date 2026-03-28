import { useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  closestCorners,
} from '@dnd-kit/core'
import { KanbanColumn } from './kanban-column'
import { TaskCard } from './task-card'
import { useTasks } from '@/hooks/use-tasks'
import { useMoveTask } from '@/hooks/use-move-task'
import { useFilters } from '@/contexts/filter-context'
import type { Task, TaskStatus } from '@/types/database'

const COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: 'backlog', label: 'Backlog' },
  { id: 'todo', label: 'To Do' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'done', label: 'Done' },
]

interface KanbanBoardProps {
  onEditTask: (task: Task) => void
  onNewTask: (status: TaskStatus) => void
}

export function KanbanBoard({ onEditTask, onNewTask }: KanbanBoardProps) {
  const { sprintId, teamId } = useFilters()
  const { data: tasks = [], isLoading } = useTasks({ sprintId, teamId })
  const moveTask = useMoveTask()
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const grouped = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = {
      backlog: [],
      todo: [],
      in_progress: [],
      done: [],
    }
    for (const t of tasks) {
      map[t.status]?.push(t)
    }
    for (const key of Object.keys(map) as TaskStatus[]) {
      map[key].sort((a, b) => a.position - b.position)
    }
    return map
  }, [tasks])

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((t) => t.id === event.active.id)
    setActiveTask(task ?? null)
  }

  function handleDragOver(event: DragOverEvent) {
    // handled in drag end
    void event
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null)
    const { active, over } = event
    if (!over) return

    const taskId = active.id as string
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return

    // Determine the target column: the over target is either a column or a task in a column
    let targetStatus: TaskStatus
    const overTask = tasks.find((t) => t.id === over.id)
    if (overTask) {
      targetStatus = overTask.status
    } else {
      targetStatus = over.id as TaskStatus
    }

    // Calculate position
    const targetTasks = grouped[targetStatus].filter((t) => t.id !== taskId)
    let newPosition: number

    if (overTask && overTask.id !== taskId) {
      const overIndex = targetTasks.findIndex((t) => t.id === overTask.id)
      if (overIndex === 0) {
        newPosition = overTask.position - 500
      } else {
        const prevTask = targetTasks[overIndex - 1]
        newPosition = Math.floor((prevTask.position + overTask.position) / 2)
      }
    } else {
      const lastTask = targetTasks[targetTasks.length - 1]
      newPosition = lastTask ? lastTask.position + 1000 : 1000
    }

    if (task.status === targetStatus && task.position === newPosition) return

    moveTask.mutate({ taskId, status: targetStatus, position: newPosition })
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Loading board...
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto p-6 h-full">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            id={col.id}
            label={col.label}
            tasks={grouped[col.id]}
            onEditTask={onEditTask}
            onNewTask={() => onNewTask(col.id)}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? <TaskCard task={activeTask} isOverlay /> : null}
      </DragOverlay>
    </DndContext>
  )
}
