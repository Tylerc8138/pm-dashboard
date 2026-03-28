import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth-context'
import type { Member } from '@/types/database'

export function useCurrentMember() {
  const { user } = useAuth()

  return useQuery<Member | null>({
    queryKey: ['current-member', user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return null
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('auth_user_id', user.id)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}
