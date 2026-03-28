import { useQuery } from '@tanstack/react-query'
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
