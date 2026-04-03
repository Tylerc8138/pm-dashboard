/** @purpose Vercel serverless function for automated daily email digests via Gmail SMTP */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!
)

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

const DASHBOARD_URL = process.env.DASHBOARD_URL || 'https://pm-dashboard-nine-nu.vercel.app'

interface Member { id: string; full_name: string; email: string; team_id: string }
interface Task { id: string; title: string; status: string; priority: string; due_date: string | null; team_id: string; is_blocked: boolean; blocked_reason: string | null }
interface TaskAssignee { task_id: string; member_id: string }
interface Team { id: string; name: string }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers.authorization
  const expectedToken = process.env.DIGEST_SECRET
  if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return res.status(500).json({ error: 'Gmail credentials not configured' })
  }

  try {
    const [membersRes, tasksRes, assigneesRes, teamsRes] = await Promise.all([
      supabase.from('members').select('id, full_name, email, team_id'),
      supabase.from('tasks').select('id, title, status, priority, due_date, team_id, is_blocked, blocked_reason'),
      supabase.from('task_assignees').select('task_id, member_id'),
      supabase.from('teams').select('id, name'),
    ])

    const members = (membersRes.data ?? []) as Member[]
    const tasks = (tasksRes.data ?? []) as Task[]
    const assignees = (assigneesRes.data ?? []) as TaskAssignee[]
    const teams = (teamsRes.data ?? []) as Team[]
    const teamMap = new Map(teams.map(t => [t.id, t.name]))

    const memberTasks = new Map<string, Set<string>>()
    for (const a of assignees) {
      if (!memberTasks.has(a.member_id)) memberTasks.set(a.member_id, new Set())
      memberTasks.get(a.member_id)!.add(a.task_id)
    }

    const today = new Date()
    const threeDaysOut = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    const results: { email: string; status: string }[] = []

    for (const member of members) {
      const assignedTaskIds = memberTasks.get(member.id) ?? new Set()
      const teamTaskIds = new Set(tasks.filter(t => t.team_id === member.team_id).map(t => t.id))
      const relevantTaskIds = new Set([...assignedTaskIds, ...teamTaskIds])
      const myTasks = tasks.filter(t => relevantTaskIds.has(t.id) && t.status !== 'done')

      if (myTasks.length === 0) {
        results.push({ email: member.email, status: 'skipped (no active tasks)' })
        continue
      }

      const dueSoon = myTasks.filter(t => t.due_date && new Date(t.due_date) <= threeDaysOut && new Date(t.due_date) >= today)
      const overdue = myTasks.filter(t => t.due_date && new Date(t.due_date) < today)
      const blocked = myTasks.filter(t => t.is_blocked)

      const taskRows = myTasks.map(t => {
        const team = teamMap.get(t.team_id) ?? ''
        const due = t.due_date ? new Date(t.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''
        const isOverdue = t.due_date && new Date(t.due_date) < today
        return `<tr><td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;">${t.title}</td><td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:12px;color:#71717a;">${team}</td><td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:12px;color:${isOverdue ? '#dc2626' : '#71717a'};">${due}</td></tr>`
      }).join('')

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:32px 16px;">
<div style="background:#09090b;border-radius:12px 12px 0 0;padding:24px 28px;">
<span style="font-size:15px;font-weight:700;color:#fafafa;">pm-dashboard</span></div>
<div style="background:#fff;padding:28px;border:1px solid #e4e4e7;border-top:none;">
<p style="font-size:16px;margin:0 0 4px;"><strong>Hey ${member.full_name.split(' ')[0]}</strong></p>
<p style="font-size:14px;color:#71717a;margin:0 0 20px;">Here's your daily update.</p>
<div style="margin-bottom:20px;">
${overdue.length > 0 ? `<span style="display:inline-block;background:#fef2f2;color:#dc2626;font-size:12px;font-weight:600;padding:4px 10px;border-radius:100px;margin:0 6px 6px 0;">${overdue.length} overdue</span>` : ''}
${blocked.length > 0 ? `<span style="display:inline-block;background:#fffbeb;color:#d97706;font-size:12px;font-weight:600;padding:4px 10px;border-radius:100px;margin:0 6px 6px 0;">${blocked.length} blocked</span>` : ''}
${dueSoon.length > 0 ? `<span style="display:inline-block;background:#eff6ff;color:#2563eb;font-size:12px;font-weight:600;padding:4px 10px;border-radius:100px;margin:0 6px 6px 0;">${dueSoon.length} due soon</span>` : ''}
<span style="display:inline-block;background:#f4f4f5;color:#71717a;font-size:12px;font-weight:600;padding:4px 10px;border-radius:100px;">${myTasks.length} active</span>
</div>
<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e4e4e7;border-radius:8px;border-collapse:separate;overflow:hidden;">
<tr style="background:#f9fafb;"><th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:600;color:#71717a;text-transform:uppercase;border-bottom:1px solid #e4e4e7;">Task</th><th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:600;color:#71717a;text-transform:uppercase;border-bottom:1px solid #e4e4e7;">Team</th><th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:600;color:#71717a;text-transform:uppercase;border-bottom:1px solid #e4e4e7;">Due</th></tr>
${taskRows}</table>
<div style="text-align:center;margin:28px 0 0;"><a href="${DASHBOARD_URL}" style="display:inline-block;background:#1a56db;color:#fff;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;text-decoration:none;">Open Dashboard</a></div>
</div>
<div style="background:#f9fafb;border-radius:0 0 12px 12px;border:1px solid #e4e4e7;border-top:none;padding:16px 28px;text-align:center;">
<p style="font-size:11px;color:#a1a1aa;margin:0;">pm-dashboard — Visa Internal</p></div>
</div></body></html>`

      try {
        await transporter.sendMail({
          from: `pm-dashboard <${process.env.GMAIL_USER}>`,
          to: `${member.full_name} <${member.email}>`,
          subject: `${member.full_name.split(' ')[0]}, here's your daily update`,
          html,
        })
        results.push({ email: member.email, status: 'sent' })
      } catch (emailErr) {
        results.push({ email: member.email, status: `error: ${(emailErr as Error).message}` })
      }
    }

    return res.status(200).json({ success: true, results })
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message })
  }
}
