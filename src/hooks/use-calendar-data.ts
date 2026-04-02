import { useMemo } from 'react'
import { useSprints } from './use-sprints'
import { useTasks } from './use-tasks'
import { useTeams } from './use-teams'
import { parseDate } from '@/lib/date-utils'
import type { Sprint, Task, Team } from '@/types/database'

export interface SprintWithTasks extends Sprint {
  tasks: Task[]
  doneCount: number
  totalCount: number
  hasBlocked: boolean
}

export function useCalendarData(teamId?: string | null) {
  const { data: sprints = [], isLoading: sprintsLoading } = useSprints()
  const { data: allTasks = [], isLoading: tasksLoading } = useTasks()
  const { data: teams = [], isLoading: teamsLoading } = useTeams()

  // Filter tasks by team if selected
  const tasks = useMemo(() =>
    teamId ? allTasks.filter(t => t.team_id === teamId) : allTasks,
    [allTasks, teamId]
  )

  // Map team_id → Team for color lookups
  const teamMap = useMemo(() => {
    const map = new Map<string, Team>()
    for (const t of teams) map.set(t.id, t)
    return map
  }, [teams])

  const sprintsWithTasks = useMemo(() =>
    sprints
      .filter((s): s is Sprint & { start_date: string; end_date: string } =>
        s.start_date !== null && s.end_date !== null
      )
      .map(s => {
        const sprintTasks = tasks.filter(t => t.sprint_id === s.id)
        return {
          ...s,
          tasks: sprintTasks,
          doneCount: sprintTasks.filter(t => t.status === 'done').length,
          totalCount: sprintTasks.length,
          hasBlocked: sprintTasks.some(t => t.is_blocked),
        }
      })
      .sort((a, b) => a.start_date.localeCompare(b.start_date)),
    [sprints, tasks]
  )

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const task of tasks) {
      const sprint = sprints.find(s => s.id === task.sprint_id)
      if (!sprint?.end_date) continue
      const key = sprint.end_date
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(task)
    }
    return map
  }, [tasks, sprints])

  const dateRange = useMemo(() => {
    const dated = sprintsWithTasks
    if (dated.length === 0) return null

    const starts = dated.map(s => parseDate(s.start_date).getTime())
    const ends = dated.map(s => parseDate(s.end_date).getTime())

    const padding = 14 * 86400000
    return {
      start: new Date(Math.min(...starts) - padding),
      end: new Date(Math.max(...ends) + padding),
    }
  }, [sprintsWithTasks])

  return {
    sprintsWithTasks,
    tasksByDate,
    dateRange,
    teams,
    teamMap,
    isLoading: sprintsLoading || tasksLoading || teamsLoading,
  }
}
