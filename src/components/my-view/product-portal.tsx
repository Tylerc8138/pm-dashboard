import { useMemo } from 'react'
import { PortalLayout } from './portal-layout'
import { PortalSummaryCard } from './portal-summary-card'
import { PortalTaskList } from './portal-task-list'
import { useTasks } from '@/hooks/use-tasks'
import { useFilters } from '@/contexts/filter-context'
import { Layers, ArrowRight, Code, Rocket } from 'lucide-react'
import type { Task } from '@/types/database'

const STATUS_CONFIG = [
  { key: 'backlog' as const, label: 'Backlog', color: 'bg-gray-100 text-gray-600', dotColor: 'bg-gray-400' },
  { key: 'todo' as const, label: 'Up Next', color: 'bg-blue-100 text-blue-600', dotColor: 'bg-blue-500' },
  { key: 'in_progress' as const, label: 'In Progress', color: 'bg-amber-100 text-amber-700', dotColor: 'bg-amber-500' },
  { key: 'done' as const, label: 'Shipped', color: 'bg-green-100 text-green-600', dotColor: 'bg-green-500' },
]

interface ProductPortalProps {
  teamId: string
  onEditTask: (task: Task) => void
}

export function ProductPortal({ teamId, onEditTask }: ProductPortalProps) {
  const { sprintId } = useFilters()
  const { data: tasks = [] } = useTasks({ sprintId, teamId })

  const stats = useMemo(() => ({
    backlog: tasks.filter((t) => t.status === 'backlog').length,
    upNext: tasks.filter((t) => t.status === 'todo').length,
    inProgress: tasks.filter((t) => t.status === 'in_progress').length,
    shipped: tasks.filter((t) => t.status === 'done').length,
  }), [tasks])

  return (
    <PortalLayout title="Product Portal" subtitle="Visa CLI development, documentation, and developer experience">
      <div className="grid grid-cols-4 gap-4">
        <PortalSummaryCard label="Backlog" count={stats.backlog} icon={Layers} color="default" />
        <PortalSummaryCard label="Up Next" count={stats.upNext} icon={ArrowRight} color="blue" />
        <PortalSummaryCard label="In Progress" count={stats.inProgress} icon={Code} color="amber" />
        <PortalSummaryCard label="Shipped" count={stats.shipped} icon={Rocket} color="green" />
      </div>
      <PortalTaskList tasks={tasks} statusConfig={STATUS_CONFIG} onEditTask={onEditTask} />
    </PortalLayout>
  )
}
