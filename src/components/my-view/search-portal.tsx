import { useMemo } from 'react'
import { PortalLayout } from './portal-layout'
import { PortalSummaryCard } from './portal-summary-card'
import { PortalTaskList } from './portal-task-list'
import { useTasks } from '@/hooks/use-tasks'
import { useFilters } from '@/contexts/filter-context'
import { Search, FlaskConical, Wrench, CheckCircle2 } from 'lucide-react'
import type { Task } from '@/types/database'

const STATUS_CONFIG = [
  { key: 'backlog' as const, label: 'Queued', color: 'bg-gray-100 text-gray-600', dotColor: 'bg-gray-400' },
  { key: 'todo' as const, label: 'Researching', color: 'bg-blue-100 text-blue-600', dotColor: 'bg-blue-500' },
  { key: 'in_progress' as const, label: 'Implementing', color: 'bg-amber-100 text-amber-700', dotColor: 'bg-amber-500' },
  { key: 'done' as const, label: 'Complete', color: 'bg-green-100 text-green-600', dotColor: 'bg-green-500' },
]

interface SearchPortalProps {
  teamId: string
  onEditTask: (task: Task) => void
}

export function SearchPortal({ teamId, onEditTask }: SearchPortalProps) {
  const { sprintId } = useFilters()
  const { data: tasks = [] } = useTasks({ sprintId, teamId })

  const stats = useMemo(() => ({
    researching: tasks.filter((t) => t.status === 'todo').length,
    implementing: tasks.filter((t) => t.status === 'in_progress').length,
    complete: tasks.filter((t) => t.status === 'done').length,
    queued: tasks.filter((t) => t.status === 'backlog').length,
  }), [tasks])

  return (
    <PortalLayout title="Search Strategy Portal" subtitle="GEO/AEO keyword research, structured data, and LLM citation tracking">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <PortalSummaryCard label="Queued" count={stats.queued} icon={Search} color="default" />
        <PortalSummaryCard label="Researching" count={stats.researching} icon={FlaskConical} color="blue" />
        <PortalSummaryCard label="Implementing" count={stats.implementing} icon={Wrench} color="amber" />
        <PortalSummaryCard label="Complete" count={stats.complete} icon={CheckCircle2} color="green" />
      </div>
      <PortalTaskList tasks={tasks} statusConfig={STATUS_CONFIG} onEditTask={onEditTask} />
    </PortalLayout>
  )
}
