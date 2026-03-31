import { useMemo } from 'react'
import { PortalLayout } from './portal-layout'
import { PortalSummaryCard } from './portal-summary-card'
import { PortalTaskList } from './portal-task-list'
import { useTasks } from '@/hooks/use-tasks'
import { useFilters } from '@/contexts/filter-context'
import { PenTool, Clock, Rocket, AlertTriangle } from 'lucide-react'
import type { Task } from '@/types/database'

const STATUS_CONFIG = [
  { key: 'backlog' as const, label: 'Planned', color: 'bg-gray-100 text-gray-600', dotColor: 'bg-gray-400' },
  { key: 'todo' as const, label: 'Creating', color: 'bg-blue-100 text-blue-600', dotColor: 'bg-blue-500' },
  { key: 'in_progress' as const, label: 'In Review / Approval', color: 'bg-amber-100 text-amber-700', dotColor: 'bg-amber-500' },
  { key: 'done' as const, label: 'Live', color: 'bg-green-100 text-green-600', dotColor: 'bg-green-500' },
]

interface MarketingPortalProps {
  teamId: string
  onEditTask: (task: Task) => void
}

export function MarketingPortal({ teamId, onEditTask }: MarketingPortalProps) {
  const { sprintId } = useFilters()
  const { data: tasks = [] } = useTasks({ sprintId, teamId })

  const stats = useMemo(() => ({
    creating: tasks.filter((t) => t.status === 'todo').length,
    inApproval: tasks.filter((t) => t.status === 'in_progress').length,
    live: tasks.filter((t) => t.status === 'done').length,
    blocked: tasks.filter((t) => t.is_blocked).length,
  }), [tasks])

  return (
    <PortalLayout title="Marketing Portal" subtitle="Content campaigns, developer guides, and social amplification">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <PortalSummaryCard label="Creating" count={stats.creating} icon={PenTool} color="blue" />
        <PortalSummaryCard label="Awaiting Approval" count={stats.inApproval} icon={Clock} color="amber" />
        <PortalSummaryCard label="Live" count={stats.live} icon={Rocket} color="green" />
        <PortalSummaryCard label="Blocked" count={stats.blocked} icon={AlertTriangle} color={stats.blocked > 0 ? 'red' : 'default'} />
      </div>
      <PortalTaskList tasks={tasks} statusConfig={STATUS_CONFIG} onEditTask={onEditTask} />
    </PortalLayout>
  )
}
