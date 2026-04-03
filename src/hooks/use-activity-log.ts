/** @purpose Activity log queries and logActivity helper for tracking task events */
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ActivityLog, ActivityLogInsert } from '@/types/database'

export function useActivityLog(taskId: string | null) {
  return useQuery<ActivityLog[]>({
    queryKey: ['activity-log', taskId],
    queryFn: async () => {
      if (!taskId) return []
      const { data, error } = await supabase
        .from('activity_log')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as ActivityLog[]
    },
    enabled: !!taskId,
  })
}

export async function logActivity(entry: ActivityLogInsert) {
  const { error } = await supabase
    .from('activity_log')
    .insert(entry as unknown as Record<string, unknown>)
  if (error) console.error('Failed to log activity:', error)
}

export function useInvalidateActivityLog() {
  const qc = useQueryClient()
  return (taskId: string) => {
    qc.invalidateQueries({ queryKey: ['activity-log', taskId] })
  }
}
