import { useMemo } from 'react'
import { useTeams } from '@/hooks/use-teams'
import { useMembers } from '@/hooks/use-members'
import { useTasks } from '@/hooks/use-tasks'
import { useFilters } from '@/contexts/filter-context'
import { TeamSection } from './team-section'
import type { Task } from '@/types/database'

interface TeamViewProps {
  onEditTask: (task: Task) => void
}

export function TeamView({ onEditTask }: TeamViewProps) {
  const { data: teams = [], isLoading: teamsLoading } = useTeams()
  const { data: members = [] } = useMembers()
  const { sprintId, teamId } = useFilters()
  const { data: tasks = [], isLoading: tasksLoading } = useTasks({ sprintId, teamId })

  const teamData = useMemo(() => {
    return teams
      .filter((t) => !teamId || t.id === teamId)
      .map((team) => ({
        team,
        members: members.filter((m) => m.team_id === team.id),
        tasks: tasks.filter((t) => t.team_id === team.id),
      }))
  }, [teams, members, tasks, teamId])

  if (teamsLoading || tasksLoading) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Loading teams...
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6 overflow-y-auto">
      {teamData.map(({ team, members, tasks }) => (
        <TeamSection
          key={team.id}
          team={team}
          members={members}
          tasks={tasks}
          onEditTask={onEditTask}
        />
      ))}
    </div>
  )
}
