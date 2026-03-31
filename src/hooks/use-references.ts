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
      qc.invalidateQueries({ queryKey: ['all-references'] })
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
      qc.invalidateQueries({ queryKey: ['all-references'] })
    },
  })
}

export async function uploadImage(file: File, taskId: string): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'png'
  const path = `${taskId}/${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from('task-attachments')
    .upload(path, file, { contentType: file.type })

  if (error) throw error

  const { data } = supabase.storage
    .from('task-attachments')
    .getPublicUrl(path)

  return data.publicUrl
}
