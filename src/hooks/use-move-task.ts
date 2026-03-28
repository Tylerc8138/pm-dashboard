import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Task, TaskStatus } from '@/types/database'

interface MoveTaskInput {
  taskId: string
  status: TaskStatus
  position: number
}

export function useMoveTask() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ taskId, status, position }: MoveTaskInput) => {
      const { data, error } = await supabase
        .from('tasks')
        .update({ status, position })
        .eq('id', taskId)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onMutate: async ({ taskId, status, position }) => {
      await qc.cancelQueries({ queryKey: ['tasks'] })

      const previousQueries = qc.getQueriesData<Task[]>({ queryKey: ['tasks'] })

      qc.setQueriesData<Task[]>({ queryKey: ['tasks'] }, (old) => {
        if (!old) return old
        return old.map((t) =>
          t.id === taskId ? { ...t, status, position } : t
        )
      })

      return { previousQueries }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousQueries) {
        for (const [key, data] of context.previousQueries) {
          qc.setQueryData(key, data)
        }
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}
