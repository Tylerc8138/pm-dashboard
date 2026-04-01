import { useMemo } from 'react'
import { PortalLayout } from './portal-layout'
import { PortalSummaryCard } from './portal-summary-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useTasks } from '@/hooks/use-tasks'
import { useTeams } from '@/hooks/use-teams'
import { useFilters } from '@/contexts/filter-context'
import { Inbox, Scale, CheckCircle2, AlertTriangle, Clock } from 'lucide-react'
import type { Task } from '@/types/database'

function getDaysInStatus(task: Task): number {
  return Math.floor((Date.now() - new Date(task.updated_at).getTime()) / (1000 * 60 * 60 * 24))
}

function getSlaColor(days: number): string {
  if (days <= 2) return 'text-green-600 bg-green-100'
  if (days <= 5) return 'text-amber-700 bg-amber-100'
  return 'text-red-700 bg-red-100'
}

interface LegalPortalProps {
  teamId: string
  onEditTask: (task: Task) => void
}

export function LegalPortal({ teamId, onEditTask }: LegalPortalProps) {
  const { sprintId } = useFilters()
  const { data: tasks = [] } = useTasks({ sprintId, teamId })
  const { data: teams = [] } = useTeams()

  const stats = useMemo(() => ({
    submitted: tasks.filter((t) => t.status === 'todo').length,
    underReview: tasks.filter((t) => t.status === 'in_progress').length,
    approved: tasks.filter((t) => t.status === 'done').length,
    overdue: tasks.filter((t) => (t.status === 'todo' || t.status === 'in_progress') && getDaysInStatus(t) > 5).length,
  }), [tasks])

  const reviewQueue = useMemo(() => {
    return tasks
      .filter((t) => t.status === 'todo' || t.status === 'in_progress')
      .map((t) => ({
        task: t,
        submittingTeam: teams.find((tm) => tm.id === t.team_id),
        days: getDaysInStatus(t),
      }))
      .sort((a, b) => b.days - a.days)
  }, [tasks, teams])

  return (
    <PortalLayout title="Legal Portal" subtitle="Content review queue and compliance approvals">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <PortalSummaryCard label="Submitted for Review" count={stats.submitted} icon={Inbox} color="blue" />
        <PortalSummaryCard label="Under Review" count={stats.underReview} icon={Scale} color="amber" />
        <PortalSummaryCard label="Approved" count={stats.approved} icon={CheckCircle2} color="green" />
        <PortalSummaryCard label="Past SLA (>5 days)" count={stats.overdue} icon={AlertTriangle} color={stats.overdue > 0 ? 'red' : 'default'} />
      </div>

      {/* Review Queue */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Inbox className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Review Queue</CardTitle>
            <Badge variant="secondary" className="text-xs">{reviewQueue.length} pending</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {reviewQueue.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Queue is empty — all caught up.</p>
          ) : (
            <div className="space-y-1">
              <div className="grid grid-cols-[1fr_80px_70px_50px] md:grid-cols-[1fr_100px_80px_60px] gap-2 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                <span>Content</span>
                <span>From Team</span>
                <span>Status</span>
                <span className="text-right">SLA</span>
              </div>
              {reviewQueue.map(({ task, submittingTeam, days }) => (
                <button
                  key={task.id}
                  onClick={() => onEditTask(task)}
                  className="grid w-full grid-cols-[1fr_100px_80px_60px] gap-2 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-muted/50 transition-colors"
                >
                  <span className="truncate font-medium">{task.title}</span>
                  <span className="text-muted-foreground">{submittingTeam?.name ?? '—'}</span>
                  <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 w-fit ${task.status === 'todo' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                    {task.status === 'todo' ? 'Submitted' : 'Reviewing'}
                  </Badge>
                  <div className="flex justify-end">
                    <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${getSlaColor(days)}`}>
                      <Clock className="h-2.5 w-2.5 mr-0.5" />
                      {days}d
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approved items */}
      {tasks.filter((t) => t.status === 'done').length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <CardTitle className="text-sm font-semibold">Approved</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {tasks.filter((t) => t.status === 'done').map((task) => (
              <button
                key={task.id}
                onClick={() => onEditTask(task)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors"
              >
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                <span className="truncate">{task.title}</span>
              </button>
            ))}
          </CardContent>
        </Card>
      )}
    </PortalLayout>
  )
}
