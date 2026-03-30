import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useTasks } from './use-tasks'
import { useTeams } from './use-teams'
import { useMembers } from './use-members'
import type { TaskReference } from '@/types/database'

export interface EnrichedReference {
  id: string
  label: string
  url: string
  created_at: string
  task_id: string
  task_title: string
  team_id: string
  team_name: string
  added_by: string | null
}

export function useAllReferences(sprintId?: string | null) {
  const { data: tasks = [] } = useTasks({ sprintId })
  const { data: teams = [] } = useTeams()
  const { data: members = [] } = useMembers()

  return useQuery<EnrichedReference[]>({
    queryKey: ['all-references', sprintId, tasks.length],
    enabled: tasks.length > 0,
    queryFn: async () => {
      const taskIds = tasks.map((t) => t.id)

      // Fetch in batches if needed (Supabase IN filter limit)
      const { data, error } = await supabase
        .from('task_references')
        .select('*')
        .in('task_id', taskIds)
        .order('created_at', { ascending: false })

      if (error) throw error
      const refs = data as TaskReference[]

      return refs.map((ref) => {
        const task = tasks.find((t) => t.id === ref.task_id)
        const team = teams.find((t) => t.id === task?.team_id)
        const addedBy = members.find((m) => m.id === ref.created_by)

        return {
          id: ref.id,
          label: ref.label,
          url: ref.url,
          created_at: ref.created_at,
          task_id: ref.task_id,
          task_title: task?.title ?? 'Unknown task',
          team_id: task?.team_id ?? '',
          team_name: team?.name ?? 'Unknown team',
          added_by: addedBy?.full_name ?? null,
        }
      })
    },
  })
}
