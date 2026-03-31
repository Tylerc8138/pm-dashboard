import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Sprint } from '@/types/database'

export function useSprints() {
  return useQuery<Sprint[]>({
    queryKey: ['sprints'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sprints')
        .select('*')
        .order('number')
      if (error) throw error
      return data as Sprint[]
    },
  })
}

export function useCreateSprint() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (sprint: { number: number; name: string; goal?: string; start_date?: string; end_date?: string }) => {
      const { data, error } = await supabase
        .from('sprints')
        .insert(sprint as unknown as Record<string, unknown>)
        .select()
        .single()
      if (error) throw error
      return data as Sprint
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sprints'] })
    },
  })
}

export function useUpdateSprint() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; goal?: string; start_date?: string | null; end_date?: string | null }) => {
      const { data, error } = await supabase
        .from('sprints')
        .update(updates as unknown as Record<string, unknown>)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Sprint
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sprints'] })
    },
  })
}
