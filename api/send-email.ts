/** @purpose API route for PM-triggered email sends via Gmail SMTP */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import nodemailer from 'nodemailer'

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

  const gmailUser = process.env.GMAIL_USER
  const gmailPass = process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, '')

  if (!gmailUser || !gmailPass) {
    return res.status(500).json({ error: 'Gmail credentials not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD env vars.' })
  }

  // Create transporter fresh each invocation (serverless best practice)
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: gmailUser, pass: gmailPass },
  })

  // Verify SMTP connection first
  try {
    await transporter.verify()
  } catch (verifyErr) {
    return res.status(500).json({
      error: 'SMTP connection failed',
      detail: (verifyErr as Error).message,
      hint: 'Check GMAIL_USER and GMAIL_APP_PASSWORD env vars. Ensure 2-Step Verification is enabled and the app password is correct.',
    })
  }

  const results: { email: string; status: string; messageId?: string; response?: string }[] = []

  for (const r of recipients) {
    try {
      const info = await transporter.sendMail({
        from: `pm-dashboard <${gmailUser}>`,
        to: r.email,
        subject,
        html: body_html,
      })
      results.push({
        email: r.email,
        status: 'sent',
        messageId: info.messageId,
        response: info.response,
      })
    } catch (err) {
      results.push({ email: r.email, status: `error: ${(err as Error).message}` })
    }
  }

  return res.status(200).json({ success: true, results })
}
