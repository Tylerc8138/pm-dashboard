/** @purpose Realtime subscriptions for tasks, assignees, dependencies, and comments */
import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useRealtime() {
  const qc = useQueryClient()

  useEffect(() => {
    const channel = supabase
      .channel('realtime-all')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        () => { qc.invalidateQueries({ queryKey: ['tasks'] }) }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'task_assignees' },
        () => {
          qc.invalidateQueries({ queryKey: ['assignees'] })
          qc.invalidateQueries({ queryKey: ['all-assignees'] })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'task_dependencies' },
        () => {
          qc.invalidateQueries({ queryKey: ['dependencies'] })
          qc.invalidateQueries({ queryKey: ['all-dependencies'] })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments' },
        () => { qc.invalidateQueries({ queryKey: ['comments'] }) }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [qc])
}
