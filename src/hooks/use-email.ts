/** @purpose Hooks for email recipient management, history, and sending */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface EmailRecipient {
  id: string
  email: string
  name: string
  team_id: string | null
  is_active: boolean
  added_by: string | null
  created_at: string
}

export interface EmailHistoryEntry {
  id: string
  subject: string
  body_html: string
  sent_by: string | null
  recipient_count: number
  recipients: { email: string; name: string }[]
  created_at: string
}

export function useEmailRecipients() {
  return useQuery<EmailRecipient[]>({
    queryKey: ['email-recipients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_recipients')
        .select('*')
        .order('name')
      if (error) throw error
      return data as EmailRecipient[]
    },
  })
}

export function useAddEmailRecipient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (r: { email: string; name: string; team_id?: string | null; added_by?: string | null }) => {
      const { data, error } = await supabase
        .from('email_recipients')
        .upsert({ ...r, is_active: true } as unknown as Record<string, unknown>, { onConflict: 'email' })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['email-recipients'] }) },
  })
}

export function useUpdateEmailRecipient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; is_active?: boolean; name?: string; email?: string }) => {
      const { error } = await supabase
        .from('email_recipients')
        .update(updates as unknown as Record<string, unknown>)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['email-recipients'] }) },
  })
}

export function useRemoveEmailRecipient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('email_recipients').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['email-recipients'] }) },
  })
}

export function useEmailHistory() {
  return useQuery<EmailHistoryEntry[]>({
    queryKey: ['email-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data as EmailHistoryEntry[]
    },
  })
}

export function useSendEmail() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { subject: string; body_html: string; recipients: { email: string; name: string }[]; sent_by: string | null }) => {
      // Send via API route
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to send email')
      }
      const result = await res.json()

      // Save history from frontend (has auth session, RLS works)
      await supabase.from('email_history').insert({
        subject: payload.subject,
        body_html: payload.body_html,
        sent_by: payload.sent_by,
        recipient_count: payload.recipients.length,
        recipients: payload.recipients,
      } as unknown as Record<string, unknown>)

      return result
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email-history'] })
    },
  })
}
