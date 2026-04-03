/** @purpose API route for PM-triggered email sends — records to email_history */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!
)
const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { subject, body_html, recipients, sent_by } = req.body as {
    subject: string
    body_html: string
    recipients: { email: string; name: string }[]
    sent_by: string | null
  }

  if (!subject || !body_html || !recipients?.length) {
    return res.status(400).json({ error: 'Missing subject, body_html, or recipients' })
  }

  const results: { email: string; status: string }[] = []

  for (const r of recipients) {
    try {
      await resend.emails.send({
        from: 'pm-dashboard <digest@updates.visa.com>',
        to: r.email,
        subject,
        html: body_html,
      })
      results.push({ email: r.email, status: 'sent' })
    } catch (err) {
      results.push({ email: r.email, status: `error: ${(err as Error).message}` })
    }
  }

  // Record in email_history
  await supabase.from('email_history').insert({
    subject,
    body_html,
    sent_by,
    recipient_count: recipients.length,
    recipients,
  } as unknown as Record<string, unknown>)

  return res.status(200).json({ success: true, results })
}
