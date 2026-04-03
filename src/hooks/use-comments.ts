/** @purpose Comment CRUD hooks for task discussion threads */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { logActivity } from './use-activity-log'
import type { Comment, CommentInsert } from '@/types/database'

export function useComments(taskId: string | null) {
  return useQuery<Comment[]>({
    queryKey: ['comments', taskId],
    queryFn: async () => {
      if (!taskId) return []
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as Comment[]
    },
    enabled: !!taskId,
  })
}

export function useCreateComment() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (comment: CommentInsert) => {
      const { data, error } = await supabase
        .from('comments')
        .insert(comment as unknown as Record<string, unknown>)
        .select()
        .single()
      if (error) throw error
      return data as Comment
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['comments', data.task_id] })
      qc.invalidateQueries({ queryKey: ['activity-log', data.task_id] })
      logActivity({
        task_id: data.task_id,
        actor_id: data.author_id,
        action: 'comment',
        detail: { body: data.body.slice(0, 100) },
      })
    },
  })
}

export function useDeleteComment() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, taskId }: { id: string; taskId: string }) => {
      const { error } = await supabase.from('comments').delete().eq('id', id)
      if (error) throw error
      return { taskId }
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['comments', data.taskId] })
    },
  })
}
