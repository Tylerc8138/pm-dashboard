import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Member } from '@/types/database'

export function useMembers(teamId?: string | null) {
  return useQuery<Member[]>({
    queryKey: ['members', teamId],
    queryFn: async () => {
      let query = supabase.from('members').select('*').order('full_name')
      if (teamId) {
        query = query.eq('team_id', teamId)
      }
      const { data, error } = await query
      if (error) throw error
      return data
    },
  })
}
