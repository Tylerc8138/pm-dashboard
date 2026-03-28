import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Team } from '@/types/database'

export function useTeams() {
  return useQuery<Team[]>({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .order('name')
      if (error) throw error
      return data
    },
  })
}
