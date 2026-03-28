import { useMemo } from 'react'
import { PortalLayout } from './portal-layout'
import { PortalSummaryCard } from './portal-summary-card'
import { PortalTaskList } from './portal-task-list'
import { useTasks } from '@/hooks/use-tasks'
import { useFilters } from '@/contexts/filter-context'
import { FileText, Eye, Send, AlertTriangle } from 'lucide-react'
import type { Task } from '@/types/database'

const STATUS_CONFIG = [
  { key: 'backlog' as const, label: 'Planned', color: 'bg-gray-100 text-gray-600', dotColor: 'bg-gray-400' },
  { key: 'todo' as const, label: 'Drafting', color: 'bg-blue-100 text-blue-600', dotColor: 'bg-blue-500' },
  { key: 'in_progress' as const, label: 'In Review', color: 'bg-amber-100 text-amber-700', dotColor: 'bg-amber-500' },
  { key: 'done' as const, label: 'Published', color: 'bg-green-100 text-green-600', dotColor: 'bg-green-500' },
]

interface CommsPortalProps {
  teamId: string
  onEditTask: (task: Task) => void
}

export function CommsPortal({ teamId, onEditTask }: CommsPortalProps) {
  const { sprintId } = useFilters()
  const { data: tasks = [] } = useTasks({ sprintId, teamId })

  const stats = useMemo(() => ({
    drafting: tasks.filter((t) => t.status === 'todo').length,
    inReview: tasks.filter((t) => t.status === 'in_progress').length,
    published: tasks.filter((t) => t.status === 'done').length,
    blocked: tasks.filter((t) => t.is_blocked).length,
  }), [tasks])

  return (
    <PortalLayout title="Comms Portal" subtitle="Press releases, media pitches, and thought leadership">
      <div className="grid grid-cols-4 gap-4">
        <PortalSummaryCard label="Drafting" count={stats.drafting} icon={FileText} color="blue" />
        <PortalSummaryCard label="In Review" count={stats.inReview} icon={Eye} color="amber" />
        <PortalSummaryCard label="Published" count={stats.published} icon={Send} color="green" />
        <PortalSummaryCard label="Blocked" count={stats.blocked} icon={AlertTriangle} color={stats.blocked > 0 ? 'red' : 'default'} />
      </div>
      <PortalTaskList tasks={tasks} statusConfig={STATUS_CONFIG} onEditTask={onEditTask} />
    </PortalLayout>
  )
}
