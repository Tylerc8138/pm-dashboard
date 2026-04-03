import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { logActivity } from './use-activity-log'
import type { TaskAssignee, TaskAssigneeInsert } from '@/types/database'

export function useAssignees(taskId: string | null) {
  return useQuery<TaskAssignee[]>({
    queryKey: ['assignees', taskId],
    enabled: !!taskId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_assignees')
        .select('*')
        .eq('task_id', taskId!)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as TaskAssignee[]
    },
  })
}

export function useAllAssignees() {
  return useQuery<TaskAssignee[]>({
    queryKey: ['all-assignees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_assignees')
        .select('*')
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as TaskAssignee[]
    },
  })
}

export function useAddAssignee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (assignee: TaskAssigneeInsert) => {
      const { data, error } = await supabase
        .from('task_assignees')
        .insert(assignee as unknown as Record<string, unknown>)
        .select()
        .single()
      if (error) throw error
      return data as TaskAssignee
    },
    onSuccess: (data, variables) => {
      qc.invalidateQueries({ queryKey: ['assignees', variables.task_id] })
      qc.invalidateQueries({ queryKey: ['all-assignees'] })
      qc.invalidateQueries({ queryKey: ['activity-log', variables.task_id] })
      logActivity({
        task_id: variables.task_id,
        actor_id: null,
        action: 'assigned',
        detail: { member_id: data.member_id },
      })
    },
  })
}

export function useUpdateAssignee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, description, taskId }: { id: string; description: string; taskId: string }) => {
      const { error } = await supabase
        .from('task_assignees')
        .update({ description } as unknown as Record<string, unknown>)
        .eq('id', id)
      if (error) throw error
      return taskId
    },
    onSuccess: (taskId) => {
      qc.invalidateQueries({ queryKey: ['assignees', taskId] })
      qc.invalidateQueries({ queryKey: ['all-assignees'] })
    },
  })
}

export function useRemoveAssignee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, taskId }: { id: string; taskId: string }) => {
      const { error } = await supabase.from('task_assignees').delete().eq('id', id)
      if (error) throw error
      return taskId
    },
    onSuccess: (taskId) => {
      qc.invalidateQueries({ queryKey: ['assignees', taskId] })
      qc.invalidateQueries({ queryKey: ['all-assignees'] })
    },
  })
}
