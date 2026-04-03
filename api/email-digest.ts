/** @purpose Vercel serverless function that sends daily email digests to team members */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!
)
const resend = new Resend(process.env.RESEND_API_KEY)

const DASHBOARD_URL = process.env.DASHBOARD_URL || 'https://pm-dashboard-nine-nu.vercel.app'

interface Member { id: string; full_name: string; email: string; team_id: string }
interface Task { id: string; title: string; status: string; priority: string; due_date: string | null; team_id: string; is_blocked: boolean }
interface TaskAssignee { task_id: string; member_id: string }
interface ActivityLog { task_id: string | null; action: string; detail: Record<string, unknown>; created_at: string; actor_id: string | null }
interface Team { id: string; name: string }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify auth — use a simple secret token
  const authHeader = req.headers.authorization
  const expectedToken = process.env.DIGEST_SECRET
  if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    // Fetch all data in parallel
    const [membersRes, tasksRes, assigneesRes, activityRes, teamsRes] = await Promise.all([
      supabase.from('members').select('id, full_name, email, team_id'),
      supabase.from('tasks').select('id, title, status, priority, due_date, team_id, is_blocked'),
      supabase.from('task_assignees').select('task_id, member_id'),
      supabase.from('activity_log').select('task_id, action, detail, created_at, actor_id')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false }),
      supabase.from('teams').select('id, name'),
    ])

    const members = (membersRes.data ?? []) as Member[]
    const tasks = (tasksRes.data ?? []) as Task[]
    const assignees = (assigneesRes.data ?? []) as TaskAssignee[]
    const activity = (activityRes.data ?? []) as ActivityLog[]
    const teams = (teamsRes.data ?? []) as Team[]

    const teamMap = new Map(teams.map(t => [t.id, t.name]))
    const memberMap = new Map(members.map(m => [m.id, m.full_name]))

    // Build assignee lookup: member_id → task_ids
    const memberTasks = new Map<string, Set<string>>()
    for (const a of assignees) {
      if (!memberTasks.has(a.member_id)) memberTasks.set(a.member_id, new Set())
      memberTasks.get(a.member_id)!.add(a.task_id)
    }

    const taskMap = new Map(tasks.map(t => [t.id, t]))
    const today = new Date()
    const threeDaysOut = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)

    const results: { email: string; status: string }[] = []

    for (const member of members) {
      const assignedTaskIds = memberTasks.get(member.id) ?? new Set()
      // Also include tasks owned by their team
      const teamTaskIds = new Set(tasks.filter(t => t.team_id === member.team_id).map(t => t.id))
      const relevantTaskIds = new Set([...assignedTaskIds, ...teamTaskIds])

      const myTasks = tasks.filter(t => relevantTaskIds.has(t.id) && t.status !== 'done')
      if (myTasks.length === 0) {
        results.push({ email: member.email, status: 'skipped (no active tasks)' })
        continue
      }

      // Categorize
      const dueSoon = myTasks.filter(t => t.due_date && new Date(t.due_date) <= threeDaysOut && new Date(t.due_date) >= today)
      const overdue = myTasks.filter(t => t.due_date && new Date(t.due_date) < today)
      const blocked = myTasks.filter(t => t.is_blocked)
      const inProgress = myTasks.filter(t => t.status === 'in_progress')
      const todo = myTasks.filter(t => t.status === 'todo')

      // Recent activity on my tasks
      const myActivity = activity.filter(a => a.task_id && relevantTaskIds.has(a.task_id)).slice(0, 10)

      const html = buildEmailHtml({
        memberName: member.full_name.split(' ')[0],
        teamName: teamMap.get(member.team_id) ?? 'Your Team',
        overdue,
        dueSoon,
        blocked,
        inProgress,
        todo,
        myActivity,
        taskMap,
        teamMap,
        memberMap,
        dashboardUrl: DASHBOARD_URL,
      })

      try {
        await resend.emails.send({
          from: 'pm-dashboard <digest@updates.visa.com>',
          to: member.email,
          subject: `${member.full_name.split(' ')[0]}, here's your daily update — ${overdue.length > 0 ? `${overdue.length} overdue` : `${myTasks.length} active tasks`}`,
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

function buildEmailHtml(opts: {
  memberName: string
  teamName: string
  overdue: Task[]
  dueSoon: Task[]
  blocked: Task[]
  inProgress: Task[]
  todo: Task[]
  myActivity: ActivityLog[]
  taskMap: Map<string, Task>
  teamMap: Map<string, string>
  memberMap: Map<string, string>
  dashboardUrl: string
}): string {
  const { memberName, teamName, overdue, dueSoon, blocked, inProgress, todo, myActivity, taskMap, teamMap, memberMap, dashboardUrl } = opts

  function taskRow(t: Task, tag?: string): string {
    const team = teamMap.get(t.team_id) ?? ''
    const due = t.due_date ? new Date(t.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''
    const priorityColor = t.priority === 'high' ? '#dc2626' : t.priority === 'medium' ? '#d97706' : '#71717a'
    return `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;">${t.title}${tag ? ` <span style="color:${tag === 'overdue' ? '#dc2626' : '#d97706'};font-size:11px;font-weight:600;">(${tag})</span>` : ''}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:12px;color:#71717a;">${team}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:12px;color:${priorityColor};font-weight:600;">${t.priority}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:12px;color:#71717a;">${due}</td>
    </tr>`
  }

  function activityRow(a: ActivityLog): string {
    const task = a.task_id ? taskMap.get(a.task_id) : null
    const actor = a.actor_id ? memberMap.get(a.actor_id) ?? 'Someone' : 'System'
    const detail = a.detail as Record<string, unknown>
    let desc = a.action
    if (a.action === 'status_changed') desc = `changed status to ${detail.to}`
    else if (a.action === 'comment') desc = 'left a comment'
    else if (a.action === 'assigned') desc = `assigned ${detail.member_name ?? 'someone'}`
    else if (a.action === 'blocked') desc = 'marked as blocked'
    const time = new Date(a.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    return `<tr>
      <td style="padding:6px 12px;border-bottom:1px solid #f8f8f8;font-size:12px;color:#71717a;"><strong style="color:#09090b;">${actor}</strong> ${desc}${task ? ` on "${task.title}"` : ''}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #f8f8f8;font-size:11px;color:#a1a1aa;text-align:right;">${time}</td>
    </tr>`
  }

  const allActionItems = [
    ...overdue.map(t => taskRow(t, 'overdue')),
    ...blocked.map(t => taskRow(t, 'blocked')),
    ...dueSoon.map(t => taskRow(t, 'due soon')),
    ...inProgress.map(t => taskRow(t)),
    ...todo.map(t => taskRow(t)),
  ]

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">

    <!-- Header -->
    <div style="background:#09090b;border-radius:12px 12px 0 0;padding:24px 28px;">
      <table width="100%"><tr>
        <td><span style="font-size:15px;font-weight:700;color:#fafafa;">pm-dashboard</span></td>
        <td style="text-align:right;"><span style="font-size:11px;color:#71717a;">${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span></td>
      </tr></table>
    </div>

    <!-- Body -->
    <div style="background:#ffffff;padding:28px;border:1px solid #e4e4e7;border-top:none;">

      <p style="font-size:16px;margin:0 0 4px;"><strong>Hey ${memberName}</strong></p>
      <p style="font-size:14px;color:#71717a;margin:0 0 24px;">Here's what needs your attention on ${teamName}.</p>

      <!-- Summary badges -->
      <div style="margin-bottom:24px;">
        ${overdue.length > 0 ? `<span style="display:inline-block;background:#fef2f2;color:#dc2626;font-size:12px;font-weight:600;padding:4px 10px;border-radius:100px;margin:0 6px 6px 0;">${overdue.length} overdue</span>` : ''}
        ${blocked.length > 0 ? `<span style="display:inline-block;background:#fffbeb;color:#d97706;font-size:12px;font-weight:600;padding:4px 10px;border-radius:100px;margin:0 6px 6px 0;">${blocked.length} blocked</span>` : ''}
        ${dueSoon.length > 0 ? `<span style="display:inline-block;background:#eff6ff;color:#2563eb;font-size:12px;font-weight:600;padding:4px 10px;border-radius:100px;margin:0 6px 6px 0;">${dueSoon.length} due soon</span>` : ''}
        <span style="display:inline-block;background:#f4f4f5;color:#71717a;font-size:12px;font-weight:600;padding:4px 10px;border-radius:100px;margin:0 6px 6px 0;">${inProgress.length + todo.length} in progress / to do</span>
      </div>

      <!-- Tasks table -->
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e4e4e7;border-radius:8px;border-collapse:separate;overflow:hidden;">
        <tr style="background:#f9fafb;">
          <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #e4e4e7;">Task</th>
          <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #e4e4e7;">Team</th>
          <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #e4e4e7;">Priority</th>
          <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #e4e4e7;">Due</th>
        </tr>
        ${allActionItems.join('')}
      </table>

      ${myActivity.length > 0 ? `
      <!-- Recent activity -->
      <p style="font-size:13px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:0.05em;margin:28px 0 8px;">Recent Activity (last 24h)</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e4e4e7;border-radius:8px;border-collapse:separate;overflow:hidden;">
        ${myActivity.map(a => activityRow(a)).join('')}
      </table>
      ` : ''}

      <!-- CTA -->
      <div style="text-align:center;margin:28px 0 0;">
        <a href="${dashboardUrl}" style="display:inline-block;background:#1a56db;color:#ffffff;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;text-decoration:none;">Open Dashboard</a>
      </div>

    </div>

    <!-- Footer -->
    <div style="background:#f9fafb;border-radius:0 0 12px 12px;border:1px solid #e4e4e7;border-top:none;padding:16px 28px;text-align:center;">
      <p style="font-size:11px;color:#a1a1aa;margin:0;">pm-dashboard daily digest — Visa Internal</p>
    </div>

  </div>
</body>
</html>`
}
