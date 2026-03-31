import { useMemo } from 'react'
import { PortalLayout } from './portal-layout'
import { PortalSummaryCard } from './portal-summary-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useTasks } from '@/hooks/use-tasks'
import { useTeams } from '@/hooks/use-teams'
import { useMembers } from '@/hooks/use-members'
import { useSprints } from '@/hooks/use-sprints'
import { useFilters } from '@/contexts/filter-context'
import { CheckCircle2, AlertTriangle, Flame, Users, Clock } from 'lucide-react'
import type { Task } from '@/types/database'

const TEAM_HEALTH_COLORS: Record<string, string> = {
  on_track: 'bg-green-500',
  behind: 'bg-amber-500',
  blocked: 'bg-red-500',
}

function getDaysAgo(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
}

interface PmCommandCenterProps {
  onEditTask: (task: Task) => void
}

export function PmCommandCenter({ onEditTask }: PmCommandCenterProps) {
  const { sprintId } = useFilters()
  const { data: tasks = [] } = useTasks({ sprintId })
  const { data: teams = [] } = useTeams()
  const { data: members = [] } = useMembers()
  const { data: sprints = [] } = useSprints()

  const currentSprint = sprints.find((s) => s.id === sprintId) ?? sprints[0]

  const stats = useMemo(() => {
    const done = tasks.filter((t) => t.status === 'done')
    const blocked = tasks.filter((t) => t.is_blocked)
    const inProgress = tasks.filter((t) => t.status === 'in_progress')
    const highPriority = tasks.filter((t) => t.priority === 'high' && t.status !== 'done')
    return { done, blocked, inProgress, highPriority, total: tasks.length }
  }, [tasks])

  const teamHealth = useMemo(() => {
    return teams.map((team) => {
      const teamTasks = tasks.filter((t) => t.team_id === team.id)
      const blocked = teamTasks.some((t) => t.is_blocked)
      const total = teamTasks.length
      const done = teamTasks.filter((t) => t.status === 'done').length
      const progress = total > 0 ? done / total : 0

      let health: 'on_track' | 'behind' | 'blocked' = 'on_track'
      if (blocked) health = 'blocked'
      else if (total > 0 && progress < 0.2) health = 'behind'

      return { team, teamTasks, health, done, total }
    })
  }, [teams, tasks])

  const blockers = useMemo(() => {
    return tasks
      .filter((t) => t.is_blocked)
      .map((t) => ({
        task: t,
        team: teams.find((tm) => tm.id === t.team_id),
        owner: members.find((m) => m.id === t.owner_id),
        days: getDaysAgo(t.updated_at),
      }))
      .sort((a, b) => b.days - a.days)
  }, [tasks, teams, members])

  return (
    <PortalLayout
      title="PM Command Center"
      subtitle={currentSprint ? `Sprint ${currentSprint.number}: ${currentSprint.name}` : 'All Sprints'}
    >
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <PortalSummaryCard
          label="Tasks Completed"
          count={stats.done.length}
          total={stats.total}
          icon={CheckCircle2}
          color="green"
        />
        <PortalSummaryCard
          label="Blocked Items"
          count={stats.blocked.length}
          icon={AlertTriangle}
          color={stats.blocked.length > 0 ? 'red' : 'default'}
        />
        <PortalSummaryCard
          label="High Priority"
          count={stats.highPriority.length}
          icon={Flame}
          color={stats.highPriority.length > 0 ? 'red' : 'default'}
        />
        <PortalSummaryCard
          label="In Progress"
          count={stats.inProgress.length}
          icon={Clock}
          color="amber"
        />
      </div>

      {/* Team Health */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Team Sprint Progress</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {teamHealth.map(({ team, health, done, total }) => (
            <div key={team.id} className="flex items-center gap-3">
              <div className="w-[120px] shrink-0 flex items-center gap-2">
                <div className={`h-2.5 w-2.5 rounded-full ${TEAM_HEALTH_COLORS[health]}`} />
                <span className="text-sm font-medium">{team.name}</span>
              </div>
              <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                {total > 0 && (
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${(done / total) * 100}%` }}
                  />
                )}
              </div>
              <span className="text-xs text-muted-foreground w-[60px] text-right">
                {done}/{total} done
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Blockers Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <CardTitle className="text-sm font-semibold">
              Blockers & Escalations
            </CardTitle>
            {blockers.length > 0 && (
              <Badge variant="destructive" className="text-xs">{blockers.length}</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {blockers.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No blockers — all clear.</p>
          ) : (
            <div className="space-y-1 overflow-x-auto">
              <div className="grid grid-cols-[1fr_100px_100px_1fr_60px] gap-2 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                <span>Task</span>
                <span>Team</span>
                <span>Assigned To</span>
                <span>Reason</span>
                <span className="text-right">Age</span>
              </div>
              {blockers.map(({ task, team, owner, days }) => (
                <button
                  key={task.id}
                  onClick={() => onEditTask(task)}
                  className={`grid w-full grid-cols-[1fr_100px_100px_1fr_60px] gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors ${
                    days >= 2 ? 'bg-destructive/5' : ''
                  }`}
                >
                  <span className="truncate font-medium">{task.title}</span>
                  <span className="text-muted-foreground">{team?.name ?? '—'}</span>
                  <span className="text-muted-foreground">{owner?.full_name ?? 'Unassigned'}</span>
                  <span className="text-muted-foreground truncate">{task.blocked_reason ?? '—'}</span>
                  <span className={`text-right font-medium ${days >= 2 ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {days}d
                  </span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PortalLayout>
  )
}
