/** @purpose PM Email Command Center — friendly compose UI, recipients, history */
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
import { useEmailRecipients, useAddEmailRecipient, useUpdateEmailRecipient, useRemoveEmailRecipient, useEmailHistory, useSendEmail } from '@/hooks/use-email'
import type { Task } from '@/types/database'
import { Mail, Send, Users, Plus, History, Eye, UserPlus, ToggleLeft, ToggleRight, Check, Trash2, AlertTriangle, Clock, CheckCircle2, ArrowLeft } from 'lucide-react'

type Tab = 'compose' | 'recipients' | 'history'

// ===== HTML TEMPLATE BUILDER (hidden from PM) =====
function buildEmailHtml(opts: {
  personalNote: string
  sprintName: string
  includeOverdue: boolean
  includeBlocked: boolean
  includeInProgress: boolean
  includeTodo: boolean
  includeDone: boolean
  tasks: Task[]
  teamMap: Map<string, string>
}): string {
  const { personalNote, sprintName, includeOverdue, includeBlocked, includeInProgress, includeTodo, includeDone, tasks, teamMap } = opts
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const activeTasks = tasks.filter(t => t.status !== 'done')
  const overdue = activeTasks.filter(t => t.due_date && new Date(t.due_date) < new Date())
  const blocked = activeTasks.filter(t => t.is_blocked)
  const inProgress = activeTasks.filter(t => t.status === 'in_progress')
  const todo = activeTasks.filter(t => t.status === 'todo')
  const done = tasks.filter(t => t.status === 'done')

  const taskRow = (t: Task, extraColor?: string) => {
    const team = teamMap.get(t.team_id) ?? ''
    const due = t.due_date ? new Date(t.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''
    const pColor = t.priority === 'high' ? '#dc2626' : t.priority === 'medium' ? '#d97706' : '#71717a'
    return `<tr>
      <td style="padding:8px 16px;border-bottom:1px solid #f0f0f0;font-size:13px;">${t.title}</td>
      <td style="padding:8px 16px;border-bottom:1px solid #f0f0f0;font-size:12px;color:#71717a;">${team}</td>
      <td style="padding:8px 16px;border-bottom:1px solid #f0f0f0;font-size:12px;color:${extraColor ?? pColor};font-weight:500;">${due || t.priority}</td>
    </tr>`
  }

  const section = (title: string, items: Task[], borderColor: string, titleColor: string, extra?: string) => {
    if (items.length === 0) return ''
    return `<p style="font-size:13px;font-weight:600;color:${titleColor};margin:20px 0 8px;">${title}</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${borderColor};border-radius:8px;border-collapse:separate;overflow:hidden;margin-bottom:4px;">
    ${items.map(t => taskRow(t, extra)).join('')}
    </table>`
  }

  // Group in-progress by team
  const teamGroups = new Map<string, Task[]>()
  for (const t of inProgress) {
    const name = teamMap.get(t.team_id) ?? 'Other'
    if (!teamGroups.has(name)) teamGroups.set(name, [])
    teamGroups.get(name)!.push(t)
  }

  const inProgressSection = includeInProgress && inProgress.length > 0 ? `
    <p style="font-size:13px;font-weight:600;color:#09090b;margin:20px 0 8px;">In Progress by Team</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e4e4e7;border-radius:8px;border-collapse:separate;overflow:hidden;margin-bottom:4px;">
    <tr style="background:#f9fafb;"><th style="padding:8px 16px;text-align:left;font-size:11px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #e4e4e7;">Task</th><th style="padding:8px 16px;text-align:left;font-size:11px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #e4e4e7;">Team</th><th style="padding:8px 16px;text-align:left;font-size:11px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #e4e4e7;">Priority</th></tr>
    ${[...teamGroups.entries()].map(([teamName, tTasks]) =>
      `<tr><td style="padding:10px 16px;background:#f9fafb;font-weight:600;font-size:12px;color:#09090b;border-bottom:1px solid #e4e4e7;" colspan="3">${teamName}</td></tr>` +
      tTasks.map(t => taskRow(t)).join('')
    ).join('')}
    </table>` : ''

  const noteHtml = personalNote.trim() ? `<div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:16px;margin-bottom:20px;">
    <p style="font-size:12px;font-weight:600;color:#0284c7;margin:0 0 6px;text-transform:uppercase;letter-spacing:0.05em;">Note from PM</p>
    <p style="font-size:14px;color:#09090b;margin:0;line-height:1.6;white-space:pre-wrap;">${personalNote.trim()}</p>
  </div>` : ''

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

<p style="font-size:16px;margin:0 0 4px;"><strong>Team Update</strong></p>
<p style="font-size:14px;color:#71717a;margin:0 0 20px;">Here's where we stand today.${sprintName ? ` Currently in ${sprintName}.` : ''}</p>

<div style="margin-bottom:20px;">
  <span style="display:inline-block;background:#f0fdf4;color:#16a34a;font-size:12px;font-weight:600;padding:4px 10px;border-radius:100px;margin:0 6px 6px 0;">${done.length} done</span>
  <span style="display:inline-block;background:#eff6ff;color:#2563eb;font-size:12px;font-weight:600;padding:4px 10px;border-radius:100px;margin:0 6px 6px 0;">${inProgress.length} in progress</span>
  <span style="display:inline-block;background:#f4f4f5;color:#71717a;font-size:12px;font-weight:600;padding:4px 10px;border-radius:100px;margin:0 6px 6px 0;">${todo.length} to do</span>
  ${overdue.length > 0 ? `<span style="display:inline-block;background:#fef2f2;color:#dc2626;font-size:12px;font-weight:600;padding:4px 10px;border-radius:100px;margin:0 6px 6px 0;">${overdue.length} overdue</span>` : ''}
  ${blocked.length > 0 ? `<span style="display:inline-block;background:#fffbeb;color:#d97706;font-size:12px;font-weight:600;padding:4px 10px;border-radius:100px;margin:0 6px 6px 0;">${blocked.length} blocked</span>` : ''}
</div>

${noteHtml}
${includeOverdue ? section('Needs Attention — Overdue', overdue, '#fecaca', '#dc2626', '#dc2626') : ''}
${includeBlocked ? section('Blocked', blocked, '#fde68a', '#d97706', '#d97706') : ''}
${inProgressSection}
${includeTodo ? section('To Do', todo, '#e4e4e7', '#71717a') : ''}
${includeDone ? section('Recently Completed', done.slice(0, 10), '#bbf7d0', '#16a34a', '#16a34a') : ''}

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
  const { data: recipients = [] } = useEmailRecipients()
  const { data: history = [] } = useEmailHistory()
  const addRecipient = useAddEmailRecipient()
  const updateRecipient = useUpdateEmailRecipient()
  const removeRecipient = useRemoveEmailRecipient()
  const sendEmail = useSendEmail()

  // Compose state — PM-friendly fields
  const [subject, setSubject] = useState('')
  const [personalNote, setPersonalNote] = useState('')
  const [selectedSprintId, setSelectedSprintId] = useState<string>('')
  const [includeOverdue, setIncludeOverdue] = useState(true)
  const [includeBlocked, setIncludeBlocked] = useState(true)
  const [includeInProgress, setIncludeInProgress] = useState(true)
  const [includeTodo, setIncludeTodo] = useState(false)
  const [includeDone, setIncludeDone] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [sendSuccess, setSendSuccess] = useState(false)

  // Add recipient state
  const [showAddForm, setShowAddForm] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newName, setNewName] = useState('')
  const [newTeamId, setNewTeamId] = useState('')

  const teamMap = useMemo(() => new Map(teams.map(t => [t.id, t.name])), [teams])
  const activeRecipients = recipients.filter(r => r.is_active)

  // Filtered tasks by sprint
  const filteredTasks = useMemo(() =>
    selectedSprintId ? tasks.filter(t => t.sprint_id === selectedSprintId) : tasks,
    [tasks, selectedSprintId]
  )

  // Stats for the compose view
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

  const selectedSprint = sprints.find(s => s.id === selectedSprintId)

  // Auto-set current sprint
  useEffect(() => {
    if (!selectedSprintId && sprints.length > 0) {
      const current = sprints.find(s => s.end_date && new Date(s.end_date) >= new Date() && s.start_date && new Date(s.start_date) <= new Date())
      if (current) setSelectedSprintId(current.id)
    }
  }, [sprints, selectedSprintId])

  // Auto-generate subject when sprint changes
  useEffect(() => {
    if (stats.overdue > 0) {
      setSubject(`Daily Update — ${stats.overdue} overdue items need attention`)
    } else if (selectedSprint) {
      setSubject(`Daily Update — ${selectedSprint.name} Progress`)
    } else {
      setSubject(`Daily Update — ${stats.inProgress} tasks in progress`)
    }
  }, [stats, selectedSprint])

  // Build HTML from PM inputs
  const generatedHtml = useMemo(() => buildEmailHtml({
    personalNote,
    sprintName: selectedSprint?.name ?? '',
    includeOverdue,
    includeBlocked,
    includeInProgress,
    includeTodo,
    includeDone,
    tasks: filteredTasks,
    teamMap,
  }), [personalNote, selectedSprint, includeOverdue, includeBlocked, includeInProgress, includeTodo, includeDone, filteredTasks, teamMap])

  const handleSend = async () => {
    if (!subject || activeRecipients.length === 0) return
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

  // ===== RENDER =====
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

            {/* Sprint selector + stats */}
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold">Sprint</Label>
                  <Select value={selectedSprintId || 'all'} onValueChange={(v: string | null) => setSelectedSprintId(!v || v === 'all' ? '' : v)}>
                    <SelectTrigger className="w-[220px]">
                      <span>{selectedSprint ? `Sprint ${selectedSprint.number}: ${selectedSprint.name}` : 'All Sprints'}</span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sprints</SelectItem>
                      {sprints.map(s => <SelectItem key={s.id} value={s.id}>Sprint {s.number}: {s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Live stats from selected sprint */}
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
              <Input id="email-subject" value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Daily Update — Sprint 3 Progress" />
              <p className="text-xs text-muted-foreground">Auto-generated from task data. Edit to customize.</p>
            </div>

            {/* Personal note */}
            <div className="space-y-2">
              <Label htmlFor="personal-note">Personal Note <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea
                id="personal-note"
                value={personalNote}
                onChange={e => setPersonalNote(e.target.value)}
                placeholder="Add context for your team... e.g. 'Great progress this week. Let's focus on clearing the 2 blocked items before EOD.'"
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">This appears as a highlighted note at the top of the email.</p>
            </div>

            {/* Section toggles */}
            <div className="space-y-3">
              <Label>Include in Email</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { label: 'Overdue tasks', value: includeOverdue, set: setIncludeOverdue, count: stats.overdue, color: 'text-red-600' },
                  { label: 'Blocked tasks', value: includeBlocked, set: setIncludeBlocked, count: stats.blocked, color: 'text-amber-600' },
                  { label: 'In progress (by team)', value: includeInProgress, set: setIncludeInProgress, count: stats.inProgress, color: 'text-blue-600' },
                  { label: 'To do', value: includeTodo, set: setIncludeTodo, count: stats.todo, color: 'text-muted-foreground' },
                  { label: 'Recently completed', value: includeDone, set: setIncludeDone, count: stats.done, color: 'text-green-600' },
                ].map(toggle => (
                  <label key={toggle.label} className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/30 transition-colors">
                    <input
                      type="checkbox"
                      checked={toggle.value}
                      onChange={e => toggle.set(e.target.checked)}
                      className="rounded accent-primary"
                    />
                    <span className="text-sm flex-1">{toggle.label}</span>
                    <span className={`text-xs font-semibold ${toggle.color}`}>{toggle.count}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Preview + Send bar */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={() => setShowPreview(true)} className="gap-1.5">
                      <Eye className="h-4 w-4" />Preview Email
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Sending to <strong className="text-foreground">{activeRecipients.length}</strong> recipient{activeRecipients.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {sendSuccess && <span className="text-sm text-green-600 flex items-center gap-1"><Check className="h-4 w-4" />Sent!</span>}
                    <Button onClick={handleSend} disabled={!subject || activeRecipients.length === 0 || sendEmail.isPending} className="gap-1.5">
                      <Send className="h-4 w-4" />{sendEmail.isPending ? 'Sending...' : 'Send Email'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ===== PREVIEW MODE ===== */}
        {activeTab === 'compose' && showPreview && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => setShowPreview(false)} className="gap-1.5">
                <ArrowLeft className="h-4 w-4" />Back to Editor
              </Button>
              <div className="flex items-center gap-2">
                {sendSuccess && <span className="text-sm text-green-600 flex items-center gap-1"><Check className="h-4 w-4" />Sent!</span>}
                <Button onClick={handleSend} disabled={!subject || activeRecipients.length === 0 || sendEmail.isPending} className="gap-1.5">
                  <Send className="h-4 w-4" />{sendEmail.isPending ? 'Sending...' : 'Send to {activeRecipients.length} people'}
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
              <Card><CardContent className="py-12 text-center"><History className="h-8 w-8 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">No emails sent yet.</p><p className="text-xs text-muted-foreground mt-1">Compose and send your first update.</p></CardContent></Card>
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
