import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { logActivity } from './use-activity-log'
import type { Task, TaskInsert, TaskUpdate } from '@/types/database'

interface TaskFilters {
  sprintId?: string | null
  teamId?: string | null
}

export function useTasks(filters: TaskFilters = {}) {
  return useQuery<Task[]>({
    queryKey: ['tasks', filters],
    queryFn: async () => {
      let query = supabase
        .from('tasks')
        .select('*')
        .order('position', { ascending: true })

      if (filters.sprintId) {
        query = query.eq('sprint_id', filters.sprintId)
      }
      if (filters.teamId) {
        query = query.eq('team_id', filters.teamId)
      }

      const { data, error } = await query
      if (error) throw error
      return data as Task[]
    },
  })
}

export function useCreateTask() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (task: TaskInsert) => {
      const { data, error } = await supabase
        .from('tasks')
        .insert(task as unknown as Record<string, unknown>)
        .select()
        .single()
      if (error) throw error
      return data as Task
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      logActivity({
        task_id: data.id,
        actor_id: data.assigned_by_id,
        action: 'created',
      })
    },
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ update, previousTask, actorId }: {
      update: TaskUpdate
      previousTask?: Task | null
      actorId?: string | null
    }) => {
      const { id, ...updates } = update
      const { data, error } = await supabase
        .from('tasks')
        .update(updates as unknown as Record<string, unknown>)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return { task: data as Task, previousTask: previousTask ?? null, actorId: actorId ?? null }
    },
    onSuccess: ({ task, previousTask, actorId }) => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      if (!previousTask) return
      const actor = actorId ?? task.assigned_by_id
      // Log specific changes
      if (previousTask.status !== task.status) {
        logActivity({ task_id: task.id, actor_id: actor, action: 'status_changed', detail: { from: previousTask.status, to: task.status } })
      }
      if (previousTask.priority !== task.priority) {
        logActivity({ task_id: task.id, actor_id: actor, action: 'priority_changed', detail: { from: previousTask.priority, to: task.priority } })
      }
      if (!previousTask.is_blocked && task.is_blocked) {
        logActivity({ task_id: task.id, actor_id: actor, action: 'blocked', detail: { reason: task.blocked_reason } })
      }
      if (previousTask.is_blocked && !task.is_blocked) {
        logActivity({ task_id: task.id, actor_id: actor, action: 'unblocked' })
      }
      // Generic edit for title/description changes
      const editedFields: string[] = []
      if (previousTask.title !== task.title) editedFields.push('title')
      if (previousTask.description !== task.description) editedFields.push('description')
      if (previousTask.due_date !== task.due_date) editedFields.push('due_date')
      if (editedFields.length > 0 && previousTask.status === task.status) {
        logActivity({ task_id: task.id, actor_id: actor, action: 'edited', detail: { fields: editedFields } })
      }
    },
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}
