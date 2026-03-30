import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { TaskReference, TaskReferenceInsert } from '@/types/database'

export function useReferences(taskId: string | null) {
  return useQuery<TaskReference[]>({
    queryKey: ['references', taskId],
    enabled: !!taskId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_references')
        .select('*')
        .eq('task_id', taskId!)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as TaskReference[]
    },
  })
}

export function useCreateReference() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (ref: TaskReferenceInsert) => {
      const { data, error } = await supabase
        .from('task_references')
        .insert(ref as unknown as Record<string, unknown>)
        .select()
        .single()
      if (error) throw error
      return data as TaskReference
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['references', variables.task_id] })
    },
  })
}

export function useDeleteReference() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, taskId }: { id: string; taskId: string }) => {
      const { error } = await supabase.from('task_references').delete().eq('id', id)
      if (error) throw error
      return taskId
    },
    onSuccess: (taskId) => {
      qc.invalidateQueries({ queryKey: ['references', taskId] })
    },
  })
}
