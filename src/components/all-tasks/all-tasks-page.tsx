import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { useSprints } from '@/hooks/use-sprints'
import { useTeams } from '@/hooks/use-teams'
import { useFilters } from '@/contexts/filter-context'
import { KanbanBoard } from '@/components/kanban/kanban-board'
import { TeamView } from '@/components/team-view/team-view'
import { LayoutGrid, Users } from 'lucide-react'
import type { Task, TaskStatus } from '@/types/database'

interface AllTasksPageProps {
  onEditTask: (task: Task) => void
  onNewTask: (status: TaskStatus) => void
}

export function AllTasksPage({ onEditTask, onNewTask }: AllTasksPageProps) {
  const [subView, setSubView] = useState<'kanban' | 'teams'>('kanban')
  const { data: sprints } = useSprints()
  const { data: teams } = useTeams()
  const { sprintId, setSprintId, teamId, setTeamId } = useFilters()

  const sprintLabel = sprintId
    ? sprints?.find((s) => s.id === sprintId)
      ? `Sprint ${sprints.find((s) => s.id === sprintId)!.number}: ${sprints.find((s) => s.id === sprintId)!.name}`
      : 'Loading...'
    : 'All Sprints'

  const teamLabel = teamId
    ? teams?.find((t) => t.id === teamId)?.name ?? 'Loading...'
    : 'All Teams'

  return (
    <div className="flex h-full flex-col">
      {/* Inline filter bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 px-6 py-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5">
            <Button
              variant={subView === 'kanban' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSubView('kanban')}
              className="gap-1.5"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Kanban
            </Button>
            <Button
              variant={subView === 'teams' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSubView('teams')}
              className="gap-1.5"
            >
              <Users className="h-3.5 w-3.5" />
              By Team
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select value={sprintId ?? 'all'} onValueChange={(v: string | null) => setSprintId(!v || v === 'all' ? null : v)}>
            <SelectTrigger className="w-[200px] h-8 text-sm">
              <span className="truncate">{sprintLabel}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sprints</SelectItem>
              {sprints?.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  Sprint {s.number}: {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={teamId ?? 'all'} onValueChange={(v: string | null) => setTeamId(!v || v === 'all' ? null : v)}>
            <SelectTrigger className="w-[140px] h-8 text-sm">
              <span className="truncate">{teamLabel}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              {teams?.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {subView === 'kanban' ? (
          <KanbanBoard onEditTask={onEditTask} onNewTask={onNewTask} />
        ) : (
          <TeamView onEditTask={onEditTask} />
        )}
      </div>
    </div>
  )
}
