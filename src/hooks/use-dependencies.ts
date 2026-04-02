import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { TaskDependency } from '@/types/database'

export function useDependencies(taskId: string | null) {
  return useQuery<{ waitingOn: TaskDependency[]; blocks: TaskDependency[] }>({
    queryKey: ['dependencies', taskId],
    enabled: !!taskId,
    queryFn: async () => {
      const [waitingRes, blocksRes] = await Promise.all([
        supabase.from('task_dependencies').select('*').eq('waiting_task_id', taskId!),
        supabase.from('task_dependencies').select('*').eq('blocking_task_id', taskId!),
      ])
      if (waitingRes.error) throw waitingRes.error
      if (blocksRes.error) throw blocksRes.error
      return {
        waitingOn: waitingRes.data as TaskDependency[],
        blocks: blocksRes.data as TaskDependency[],
      }
    },
  })
}

export function useAllDependencies() {
  return useQuery<TaskDependency[]>({
    queryKey: ['all-dependencies'],
    queryFn: async () => {
      const { data, error } = await supabase.from('task_dependencies').select('*')
      if (error) throw error
      return data as TaskDependency[]
    },
  })
}

export function useAddDependency() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ blockingTaskId, waitingTaskId }: { blockingTaskId: string; waitingTaskId: string }) => {
      const { data, error } = await supabase
        .from('task_dependencies')
        .insert({ blocking_task_id: blockingTaskId, waiting_task_id: waitingTaskId } as unknown as Record<string, unknown>)
        .select()
        .single()
      if (error) throw error
      return data as TaskDependency
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dependencies'] })
      qc.invalidateQueries({ queryKey: ['all-dependencies'] })
    },
  })
}

export function useRemoveDependency() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('task_dependencies').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dependencies'] })
      qc.invalidateQueries({ queryKey: ['all-dependencies'] })
    },
  })
}
