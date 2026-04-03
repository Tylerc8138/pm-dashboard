/** @purpose PM Email Command Center — auto-generate editable drafts from task data, manage recipients, track history */
import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { useTasks } from '@/hooks/use-tasks'
import { useTeams } from '@/hooks/use-teams'
import { useMembers } from '@/hooks/use-members'
import { useSprints } from '@/hooks/use-sprints'
import { useCurrentMember } from '@/hooks/use-current-member'
import { useAllDependencies } from '@/hooks/use-dependencies'
import { useAllAssignees } from '@/hooks/use-assignees'
import { useEmailRecipients, useAddEmailRecipient, useUpdateEmailRecipient, useRemoveEmailRecipient, useEmailHistory, useSendEmail } from '@/hooks/use-email'
import { Mail, Send, Users, Plus, History, Eye, Sparkles, UserPlus, ToggleLeft, ToggleRight, Check, Trash2, AlertTriangle, Clock, CheckCircle2, ArrowLeft } from 'lucide-react'

type Tab = 'compose' | 'recipients' | 'history'

// ===== Convert plain text draft → styled HTML email =====
function draftToHtml(_subject: string, draftText: string, _sprintName: string): string {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  // Convert plain text to HTML paragraphs, preserving structure
  const bodyHtml = draftText
    .split('\n\n')
    .map(block => {
      const trimmed = block.trim()
      if (!trimmed) return ''

      // Headers (lines starting with ## or all-caps short lines)
      if (trimmed.startsWith('## ')) {
        return `<p style="font-size:14px;font-weight:700;color:#09090b;margin:24px 0 8px;border-bottom:1px solid #e4e4e7;padding-bottom:6px;">${trimmed.slice(3)}</p>`
      }

      // Bullet lists
      if (trimmed.split('\n').every(line => line.trim().startsWith('- ') || line.trim().startsWith('• '))) {
        const items = trimmed.split('\n').map(line => {
          const text = line.trim().replace(/^[-•]\s*/, '')
          // Highlight overdue/blocked keywords
          const styled = text
            .replace(/\(overdue\)/gi, '<span style="color:#dc2626;font-weight:600;">(overdue)</span>')
            .replace(/\(blocked\)/gi, '<span style="color:#d97706;font-weight:600;">(blocked)</span>')
            .replace(/\(high priority\)/gi, '<span style="color:#dc2626;font-weight:600;">(high priority)</span>')
          return `<li style="margin-bottom:4px;">${styled}</li>`
        }).join('')
        return `<ul style="margin:0 0 12px;padding-left:20px;font-size:13px;color:#3f3f46;line-height:1.7;">${items}</ul>`
      }

      // Regular paragraphs
      return `<p style="font-size:14px;color:#3f3f46;margin:0 0 12px;line-height:1.7;">${trimmed.replace(/\n/g, '<br>')}</p>`
    })
    .join('')

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:32px 16px;">

<div style="background:#09090b;border-radius:12px 12px 0 0;padding:24px 28px;">
  <table width="100%"><tr>
    <td><span style="font-size:15px;font-weight:700;color:#fafafa;">pm-dashboard</span></td>
    <td style="text-align:right;"><span style="font-size:11px;color:#71717a;">${today}</span></td>
  </tr></table>
</div>

<div style="background:#ffffff;padding:28px;border:1px solid #e4e4e7;border-top:none;">
${bodyHtml}
<div style="text-align:center;margin:28px 0 0;">
  <a href="https://pm-dashboard-nine-nu.vercel.app" style="display:inline-block;background:#1a56db;color:#ffffff;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;text-decoration:none;">Open Dashboard</a>
</div>
</div>

<div style="background:#f9fafb;border-radius:0 0 12px 12px;border:1px solid #e4e4e7;border-top:none;padding:16px 28px;text-align:center;">
  <p style="font-size:11px;color:#a1a1aa;margin:0;">pm-dashboard — Visa Internal</p>
</div>

</div>
</body></html>`
}

export function EmailManager() {
  const [activeTab, setActiveTab] = useState<Tab>('compose')
  const { data: tasks = [] } = useTasks()
  const { data: teams = [] } = useTeams()
  const { data: members = [] } = useMembers()
  const { data: sprints = [] } = useSprints()
  const { data: currentMember } = useCurrentMember()
  const { data: allDeps = [] } = useAllDependencies()
  const { data: allAssignees = [] } = useAllAssignees()
  const { data: recipients = [] } = useEmailRecipients()
  const { data: history = [] } = useEmailHistory()
  const addRecipient = useAddEmailRecipient()
  const updateRecipient = useUpdateEmailRecipient()
  const removeRecipient = useRemoveEmailRecipient()
  const sendEmail = useSendEmail()

  // Compose state
  const [subject, setSubject] = useState('')
  const [draft, setDraft] = useState('')
  const [selectedSprintId, setSelectedSprintId] = useState<string>('')
  const [showPreview, setShowPreview] = useState(false)
  const [sendSuccess, setSendSuccess] = useState(false)
  const [hasGenerated, setHasGenerated] = useState(false)

  // Recipient state
  const [showAddForm, setShowAddForm] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newName, setNewName] = useState('')
  const [newTeamId, setNewTeamId] = useState('')

  const teamMap = useMemo(() => new Map(teams.map(t => [t.id, t.name])), [teams])
  const memberMap = useMemo(() => new Map(members.map(m => [m.id, m])), [members])
  const activeRecipients = recipients.filter(r => r.is_active)

  const filteredTasks = useMemo(() =>
    selectedSprintId ? tasks.filter(t => t.sprint_id === selectedSprintId) : tasks,
    [tasks, selectedSprintId]
  )

  const selectedSprint = sprints.find(s => s.id === selectedSprintId)

  const stats = useMemo(() => {
    const t = filteredTasks
    return {
      total: t.length,
      done: t.filter(x => x.status === 'done').length,
      inProgress: t.filter(x => x.status === 'in_progress').length,
      todo: t.filter(x => x.status === 'todo').length,
      overdue: t.filter(x => x.due_date && new Date(x.due_date) < new Date() && x.status !== 'done').length,
      blocked: t.filter(x => x.is_blocked).length,
    }
  }, [filteredTasks])

  // Auto-set current sprint
  useEffect(() => {
    if (!selectedSprintId && sprints.length > 0) {
      const current = sprints.find(s => s.end_date && new Date(s.end_date) >= new Date() && s.start_date && new Date(s.start_date) <= new Date())
      if (current) setSelectedSprintId(current.id)
    }
  }, [sprints, selectedSprintId])

  // ===== AUTO-GENERATE DRAFT =====
  const generateDraft = () => {
    const today = new Date()
    const dayName = today.toLocaleDateString('en-US', { weekday: 'long' })
    const pmName = currentMember?.full_name?.split(' ')[0] ?? 'PM'

    const activeTasks = filteredTasks.filter(t => t.status !== 'done')
    const overdue = activeTasks.filter(t => t.due_date && new Date(t.due_date) < today)
    const blocked = activeTasks.filter(t => t.is_blocked)
    const inProgress = activeTasks.filter(t => t.status === 'in_progress')
    const todo = activeTasks.filter(t => t.status === 'todo')
    const done = filteredTasks.filter(t => t.status === 'done')
    const highPriority = activeTasks.filter(t => t.priority === 'high')
    const dueSoon = activeTasks.filter(t => t.due_date && new Date(t.due_date) >= today && new Date(t.due_date) <= new Date(Date.now() + 7 * 86400000))

    // Build assignee lookup: task_id → member first names
    const taskAssignees = new Map<string, string[]>()
    for (const a of allAssignees) {
      const m = memberMap.get(a.member_id)
      if (m) {
        if (!taskAssignees.has(a.task_id)) taskAssignees.set(a.task_id, [])
        taskAssignees.get(a.task_id)!.push(m.full_name.split(' ')[0])
      }
    }

    // Build dependency info: task_id → blocking task titles
    const taskDepsMap = new Map<string, string[]>()
    for (const dep of allDeps) {
      const blockingTask = filteredTasks.find(t => t.id === dep.blocking_task_id)
      if (blockingTask && blockingTask.status !== 'done') {
        if (!taskDepsMap.has(dep.waiting_task_id)) taskDepsMap.set(dep.waiting_task_id, [])
        taskDepsMap.get(dep.waiting_task_id)!.push(blockingTask.title)
      }
    }

    // Cross-team deps
    const crossTeamDeps = allDeps.filter(d => {
      const blocking = filteredTasks.find(t => t.id === d.blocking_task_id)
      const waiting = filteredTasks.find(t => t.id === d.waiting_task_id)
      return blocking && waiting && blocking.team_id !== waiting.team_id && blocking.status !== 'done'
    })

    // Group in-progress by team
    const teamGroups = new Map<string, typeof inProgress>()
    for (const t of inProgress) {
      const name = teamMap.get(t.team_id) ?? 'Other'
      if (!teamGroups.has(name)) teamGroups.set(name, [])
      teamGroups.get(name)!.push(t)
    }

    const formatTask = (t: typeof activeTasks[0], showTeam = false) => {
      const assignees = taskAssignees.get(t.id)
      const deps = taskDepsMap.get(t.id)
      const parts = [t.title]
      if (showTeam) parts.push(`(${teamMap.get(t.team_id) ?? 'Unknown'})`)
      if (assignees?.length) parts.push(`→ ${assignees.join(', ')}`)
      if (t.due_date) {
        const isOverdue = new Date(t.due_date) < today
        parts.push(isOverdue ? '(overdue)' : `due ${new Date(t.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`)
      }
      if (t.priority === 'high') parts.push('(high priority)')
      if (deps?.length) parts.push(`— blocked by: ${deps.join(', ')}`)
      return `- ${parts.join(' ')}`
    }

    const lines: string[] = []
    const progressPct = filteredTasks.length > 0 ? Math.round((done.length / filteredTasks.length) * 100) : 0

    // ==================
    // INTRO
    // ==================
    lines.push(`Happy ${dayName} team,`)
    lines.push('')
    lines.push(`Here's your ${selectedSprint ? selectedSprint.name : 'project'} update. We're currently at ${progressPct}% completion — ${done.length} tasks done out of ${filteredTasks.length} total, with ${inProgress.length} actively in progress.`)
    if (overdue.length > 0 || blocked.length > 0) {
      const alerts: string[] = []
      if (overdue.length > 0) alerts.push(`${overdue.length} overdue item${overdue.length > 1 ? 's' : ''}`)
      if (blocked.length > 0) alerts.push(`${blocked.length} blocker${blocked.length > 1 ? 's' : ''}`)
      lines.push(`Heads up — we have ${alerts.join(' and ')} that need attention.`)
    }

    // ==================
    // BODY
    // ==================

    // --- Completed ---
    if (done.length > 0) {
      lines.push('')
      lines.push(`## What's Been Completed`)
      lines.push('')
      const recentDone = done.slice(0, 8)
      for (const t of recentDone) {
        const assignees = taskAssignees.get(t.id)
        lines.push(`- ${t.title} (${teamMap.get(t.team_id) ?? ''})${assignees?.length ? ` — ${assignees.join(', ')}` : ''}`)
      }
      if (done.length > 8) lines.push(`- ...and ${done.length - 8} more`)
    }

    // --- In Progress by Team ---
    if (teamGroups.size > 0) {
      lines.push('')
      lines.push(`## Currently In Progress`)
      lines.push('')
      for (const [teamName, tTasks] of teamGroups) {
        lines.push(`${teamName}:`)
        for (const t of tTasks) lines.push(formatTask(t))
        lines.push('')
      }
    }

    // --- To-Do / Up Next ---
    if (todo.length > 0) {
      lines.push(`## To Do`)
      lines.push('')
      for (const t of todo.slice(0, 10)) lines.push(formatTask(t, true))
      if (todo.length > 10) lines.push(`- ...and ${todo.length - 10} more in the backlog`)
      lines.push('')
    }

    // --- Call-Outs ---
    const hasCallouts = overdue.length > 0 || blocked.length > 0 || crossTeamDeps.length > 0 || highPriority.length > 0
    if (hasCallouts) {
      lines.push(`## Call-Outs`)
      lines.push('')

      if (overdue.length > 0) {
        lines.push(`Overdue:`)
        for (const t of overdue) lines.push(formatTask(t, true))
        lines.push('')
      }

      if (blocked.length > 0) {
        lines.push(`Blocked:`)
        for (const t of blocked) {
          const reason = t.blocked_reason ? ` — "${t.blocked_reason}"` : ''
          const assignees = taskAssignees.get(t.id)
          lines.push(`- ${t.title} (${teamMap.get(t.team_id) ?? ''})${assignees?.length ? ` → ${assignees.join(', ')}` : ''}${reason}`)
        }
        lines.push('')
      }

      if (crossTeamDeps.length > 0) {
        lines.push(`Cross-Team Dependencies:`)
        for (const dep of crossTeamDeps) {
          const blocking = filteredTasks.find(t => t.id === dep.blocking_task_id)!
          const waiting = filteredTasks.find(t => t.id === dep.waiting_task_id)!
          lines.push(`- "${blocking.title}" (${teamMap.get(blocking.team_id)}) is blocking "${waiting.title}" (${teamMap.get(waiting.team_id)})`)
        }
        lines.push('')
      }

      if (highPriority.length > 0 && overdue.length === 0) {
        lines.push(`High Priority:`)
        for (const t of highPriority.slice(0, 5)) lines.push(formatTask(t, true))
        lines.push('')
      }
    }

    // --- Goals for This Week ---
    lines.push(`## Goals for This Week`)
    lines.push('')
    if (dueSoon.length > 0) {
      for (const t of dueSoon) lines.push(formatTask(t, true))
    } else if (inProgress.length > 0) {
      lines.push(`- Complete the ${inProgress.length} in-progress items`)
      if (blocked.length > 0) lines.push(`- Resolve the ${blocked.length} blocker${blocked.length > 1 ? 's' : ''} holding up progress`)
      if (todo.length > 0) lines.push(`- Pull the next ${Math.min(todo.length, 3)} items from the backlog`)
    } else {
      lines.push(`- Review backlog and prioritize next tasks`)
    }

    // ==================
    // SIGN-OFF
    // ==================
    lines.push('')
    lines.push(`If anything looks off or priorities need to shift, let me know. You can always check the live dashboard for the latest.`)
    lines.push('')
    lines.push(`Best,`)
    lines.push(`${pmName}`)

    // Set subject
    if (overdue.length > 0) {
      setSubject(`${selectedSprint?.name ?? 'Project'} Update — ${overdue.length} overdue, needs attention`)
    } else {
      setSubject(`${selectedSprint?.name ?? 'Weekly'} Update — ${progressPct}% complete, ${inProgress.length} in progress`)
    }

    setDraft(lines.join('\n'))
    setHasGenerated(true)
  }

  const generatedHtml = useMemo(() => draftToHtml(subject, draft, selectedSprint?.name ?? ''), [subject, draft, selectedSprint])

  const handleSend = async () => {
    if (!subject || !draft.trim() || activeRecipients.length === 0) return
    try {
      await sendEmail.mutateAsync({
        subject,
        body_html: generatedHtml,
        recipients: activeRecipients.map(r => ({ email: r.email, name: r.name })),
        sent_by: currentMember?.id ?? null,
      })
      setSendSuccess(true)
      setTimeout(() => setSendSuccess(false), 4000)
    } catch (err) {
      alert(`Failed to send: ${(err as Error).message}`)
    }
  }

  const handleAddRecipient = async () => {
    if (!newEmail.trim() || !newName.trim()) return
    await addRecipient.mutateAsync({ email: newEmail.trim(), name: newName.trim(), team_id: newTeamId || null, added_by: currentMember?.id ?? null })
    setNewEmail(''); setNewName(''); setNewTeamId(''); setShowAddForm(false)
  }

  const handleImportMembers = async () => {
    for (const m of members) {
      if (!recipients.some(r => r.email === m.email)) {
        await addRecipient.mutateAsync({ email: m.email, name: m.full_name, team_id: m.team_id, added_by: currentMember?.id ?? null })
      }
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl p-6 pb-12 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2"><Mail className="h-5 w-5" />Email Manager</h1>
            <p className="text-sm text-muted-foreground mt-1">Compose and send project updates to your team</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1"><Users className="h-3 w-3" />{activeRecipients.length} recipients</Badge>
            <Badge variant="secondary" className="gap-1"><History className="h-3 w-3" />{history.length} sent</Badge>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5">
          {([['compose', 'Compose', Send], ['recipients', 'Recipients', Users], ['history', 'History', History]] as const).map(([key, label, Icon]) => (
            <Button key={key} variant={activeTab === key ? 'default' : 'ghost'} size="sm" onClick={() => setActiveTab(key as Tab)} className="gap-1.5">
              <Icon className="h-4 w-4" />{label}
            </Button>
          ))}
        </div>

        {/* ===== COMPOSE TAB ===== */}
        {activeTab === 'compose' && !showPreview && (
          <div className="space-y-5">

            {/* Sprint selector + auto-generate */}
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="font-semibold">Sprint</Label>
                    <Select value={selectedSprintId || 'all'} onValueChange={(v: string | null) => setSelectedSprintId(!v || v === 'all' ? '' : v)}>
                      <SelectTrigger className="w-[240px]">
                        <span>{selectedSprint ? `Sprint ${selectedSprint.number}: ${selectedSprint.name}` : 'All Sprints'}</span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sprints</SelectItem>
                        {sprints.map(s => <SelectItem key={s.id} value={s.id}>Sprint {s.number}: {s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={generateDraft} className="gap-1.5">
                    <Sparkles className="h-4 w-4" />
                    {hasGenerated ? 'Regenerate Draft' : 'Auto-Generate Draft'}
                  </Button>
                </div>

                {/* Live stats */}
                <div className="flex items-center gap-2 flex-wrap">
                  {stats.overdue > 0 && <Badge variant="secondary" className="gap-1 bg-red-100 text-red-700"><AlertTriangle className="h-3 w-3" />{stats.overdue} overdue</Badge>}
                  {stats.blocked > 0 && <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-700"><Clock className="h-3 w-3" />{stats.blocked} blocked</Badge>}
                  <Badge variant="secondary" className="gap-1 bg-blue-100 text-blue-700">{stats.inProgress} in progress</Badge>
                  <Badge variant="secondary" className="gap-1">{stats.todo} to do</Badge>
                  <Badge variant="secondary" className="gap-1 bg-green-100 text-green-700"><CheckCircle2 className="h-3 w-3" />{stats.done} done</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="email-subject">Subject Line</Label>
              <Input id="email-subject" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Click 'Auto-Generate Draft' to populate, or type your own" />
            </div>

            {/* Draft editor */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="email-draft">Email Body</Label>
                {draft.trim() && (
                  <Button variant="ghost" size="sm" onClick={() => setShowPreview(true)} className="gap-1 text-xs">
                    <Eye className="h-3 w-3" />Preview Styled Email
                  </Button>
                )}
              </div>
              {!hasGenerated && !draft.trim() ? (
                <Card>
                  <CardContent className="py-16 text-center">
                    <Sparkles className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                    <p className="font-medium text-sm mb-1">Generate your email from task data</p>
                    <p className="text-xs text-muted-foreground mb-4 max-w-sm mx-auto">
                      Select a sprint above and click "Auto-Generate Draft". It'll pull in tasks, assignments, dependencies, and blockers into a ready-to-edit email.
                    </p>
                    <Button onClick={generateDraft} className="gap-1.5">
                      <Sparkles className="h-4 w-4" />Auto-Generate Draft
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Textarea
                  id="email-draft"
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  placeholder="Write your email here..."
                  className="min-h-[400px] text-sm leading-relaxed"
                  rows={20}
                />
              )}
              {hasGenerated && (
                <p className="text-xs text-muted-foreground">
                  Auto-generated from {stats.total} tasks. Edit freely — lines starting with "## " become section headers, lines starting with "- " become bullet points.
                </p>
              )}
            </div>

            {/* Send bar */}
            {draft.trim() && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Sending to <strong className="text-foreground">{activeRecipients.length}</strong> recipient{activeRecipients.length !== 1 ? 's' : ''}
                      {activeRecipients.length > 0 && (
                        <span className="ml-1 text-xs">({activeRecipients.slice(0, 4).map(r => r.name.split(' ')[0]).join(', ')}{activeRecipients.length > 4 ? `, +${activeRecipients.length - 4}` : ''})</span>
                      )}
                    </span>
                    <div className="flex items-center gap-2">
                      {sendSuccess && <span className="text-sm text-green-600 flex items-center gap-1"><Check className="h-4 w-4" />Sent!</span>}
                      <Button onClick={handleSend} disabled={!subject || !draft.trim() || activeRecipients.length === 0 || sendEmail.isPending} className="gap-1.5">
                        <Send className="h-4 w-4" />{sendEmail.isPending ? 'Sending...' : 'Send Email'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ===== PREVIEW MODE ===== */}
        {activeTab === 'compose' && showPreview && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => setShowPreview(false)} className="gap-1.5"><ArrowLeft className="h-4 w-4" />Back to Editor</Button>
              <div className="flex items-center gap-2">
                {sendSuccess && <span className="text-sm text-green-600 flex items-center gap-1"><Check className="h-4 w-4" />Sent!</span>}
                <Button onClick={handleSend} disabled={!subject || !draft.trim() || activeRecipients.length === 0 || sendEmail.isPending} className="gap-1.5">
                  <Send className="h-4 w-4" />{sendEmail.isPending ? 'Sending...' : `Send to ${activeRecipients.length} people`}
                </Button>
              </div>
            </div>
            <Card>
              <CardContent className="p-1">
                <div className="rounded-lg overflow-hidden bg-[#f4f4f5]">
                  <div className="px-4 py-2 bg-muted/50 border-b flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">Subject:</span>
                    <span className="text-xs">{subject}</span>
                  </div>
                  <iframe srcDoc={generatedHtml} className="w-full border-0" style={{ height: '600px' }} title="Email preview" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ===== RECIPIENTS TAB ===== */}
        {activeTab === 'recipients' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{recipients.length} total, {activeRecipients.length} active</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleImportMembers} className="gap-1.5 text-xs"><UserPlus className="h-3.5 w-3.5" />Import All Team Members</Button>
                <Button size="sm" onClick={() => setShowAddForm(true)} className="gap-1.5 text-xs"><Plus className="h-3.5 w-3.5" />Add Recipient</Button>
              </div>
            </div>

            {showAddForm && (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <p className="font-semibold text-sm">Add Recipient</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1"><Label className="text-xs">Name</Label><Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Full name" className="text-sm" /></div>
                    <div className="space-y-1"><Label className="text-xs">Email</Label><Input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="name@visa.com" className="text-sm" /></div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Team (optional)</Label>
                    <Select value={newTeamId || 'none'} onValueChange={(v: string | null) => setNewTeamId(!v || v === 'none' ? '' : v)}>
                      <SelectTrigger><span>{newTeamId ? teamMap.get(newTeamId) : 'No team'}</span></SelectTrigger>
                      <SelectContent><SelectItem value="none">No team</SelectItem>{teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => { setShowAddForm(false); setNewEmail(''); setNewName(''); setNewTeamId('') }}>Cancel</Button>
                    <Button size="sm" onClick={handleAddRecipient} disabled={!newEmail.trim() || !newName.trim()}>Add</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="p-0">
                <table className="w-full">
                  <thead><tr className="border-b bg-muted/30">
                    <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Name</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Email</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Team</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Active</th>
                    <th className="px-4 py-2 w-10"></th>
                  </tr></thead>
                  <tbody>
                    {recipients.map(r => (
                      <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-2.5 text-sm font-medium">{r.name}</td>
                        <td className="px-4 py-2.5 text-sm text-muted-foreground">{r.email}</td>
                        <td className="px-4 py-2.5 text-sm text-muted-foreground">{r.team_id ? teamMap.get(r.team_id) ?? '—' : '—'}</td>
                        <td className="px-4 py-2.5 text-center">
                          <button onClick={() => updateRecipient.mutate({ id: r.id, is_active: !r.is_active })} className="inline-flex items-center">
                            {r.is_active ? <ToggleRight className="h-5 w-5 text-green-600" /> : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
                          </button>
                        </td>
                        <td className="px-4 py-2.5"><button onClick={() => removeRecipient.mutate(r.id)} className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button></td>
                      </tr>
                    ))}
                    {recipients.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">No recipients yet. Import team members or add manually.</td></tr>}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ===== HISTORY TAB ===== */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            {history.length === 0 ? (
              <Card><CardContent className="py-12 text-center"><History className="h-8 w-8 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">No emails sent yet.</p></CardContent></Card>
            ) : history.map(entry => {
              const sentByMember = entry.sent_by ? members.find(m => m.id === entry.sent_by) : null
              return (
                <Card key={entry.id}><CardContent className="p-4"><div className="flex items-start justify-between gap-4"><div className="flex-1 min-w-0"><p className="font-semibold text-sm truncate">{entry.subject}</p><div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground"><span>{new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span><span>·</span><span>{entry.recipient_count} recipient{entry.recipient_count !== 1 ? 's' : ''}</span>{sentByMember && <><span>·</span><span>by {sentByMember.full_name}</span></>}</div></div><Badge variant="secondary" className="gap-1 shrink-0"><Check className="h-3 w-3" />Sent</Badge></div></CardContent></Card>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}
