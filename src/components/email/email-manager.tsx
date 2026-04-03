/** @purpose PM Email Command Center — compose, preview, send, manage recipients, view history */
import { useState, useMemo } from 'react'
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
import type { Task } from '@/types/database' // used in generateTemplate
import { Mail, Send, Users, Plus, History, Eye, Sparkles, UserPlus, ToggleLeft, ToggleRight, Check, Trash2 } from 'lucide-react'

type Tab = 'compose' | 'recipients' | 'history'

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

  // Compose state
  const [subject, setSubject] = useState('')
  const [bodyHtml, setBodyHtml] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [sendSuccess, setSendSuccess] = useState(false)

  // Add recipient state
  const [showAddForm, setShowAddForm] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newName, setNewName] = useState('')
  const [newTeamId, setNewTeamId] = useState('')

  const teamMap = useMemo(() => new Map(teams.map(t => [t.id, t.name])), [teams])

  const activeRecipients = recipients.filter(r => r.is_active)

  // ===== TEMPLATE GENERATION =====
  const generateTemplate = () => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    const activeTasks = tasks.filter(t => t.status !== 'done')
    const overdue = activeTasks.filter(t => t.due_date && new Date(t.due_date) < new Date())
    const blocked = activeTasks.filter(t => t.is_blocked)
    const inProgress = activeTasks.filter(t => t.status === 'in_progress')
    const todo = activeTasks.filter(t => t.status === 'todo')
    const doneTasks = tasks.filter(t => t.status === 'done')
    const currentSprint = sprints.find(s => s.end_date && new Date(s.end_date) >= new Date() && s.start_date && new Date(s.start_date) <= new Date())

    // Group tasks by team
    const teamTasks = new Map<string, Task[]>()
    for (const task of inProgress) {
      const name = teamMap.get(task.team_id) ?? 'Other'
      if (!teamTasks.has(name)) teamTasks.set(name, [])
      teamTasks.get(name)!.push(task)
    }

    const subjectLine = overdue.length > 0
      ? `Daily Update — ${overdue.length} overdue items need attention`
      : `Daily Update — ${inProgress.length} tasks in progress${currentSprint ? ` (${currentSprint.name})` : ''}`

    setSubject(subjectLine)

    const teamSections = [...teamTasks.entries()].map(([teamName, tTasks]) =>
      `<tr><td style="padding:12px 16px;background:#f9fafb;font-weight:600;font-size:13px;color:#09090b;border-bottom:1px solid #e4e4e7;" colspan="3">${teamName}</td></tr>` +
      tTasks.map(t => {
        const due = t.due_date ? new Date(t.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''
        const isOverdue = t.due_date && new Date(t.due_date) < new Date()
        return `<tr>
          <td style="padding:8px 16px;border-bottom:1px solid #f0f0f0;font-size:13px;">${t.title}</td>
          <td style="padding:8px 16px;border-bottom:1px solid #f0f0f0;font-size:12px;color:${t.priority === 'high' ? '#dc2626' : t.priority === 'medium' ? '#d97706' : '#71717a'};font-weight:600;">${t.priority}</td>
          <td style="padding:8px 16px;border-bottom:1px solid #f0f0f0;font-size:12px;color:${isOverdue ? '#dc2626' : '#71717a'};">${due}${isOverdue ? ' (overdue)' : ''}</td>
        </tr>`
      }).join('')
    ).join('')

    const html = `<!DOCTYPE html>
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
<p style="font-size:14px;color:#71717a;margin:0 0 20px;">Here's where we stand today.${currentSprint ? ` Currently in ${currentSprint.name}.` : ''}</p>

<!-- Summary -->
<div style="margin-bottom:24px;">
  <span style="display:inline-block;background:#f0fdf4;color:#16a34a;font-size:12px;font-weight:600;padding:4px 10px;border-radius:100px;margin:0 6px 6px 0;">${doneTasks.length} done</span>
  <span style="display:inline-block;background:#eff6ff;color:#2563eb;font-size:12px;font-weight:600;padding:4px 10px;border-radius:100px;margin:0 6px 6px 0;">${inProgress.length} in progress</span>
  <span style="display:inline-block;background:#f4f4f5;color:#71717a;font-size:12px;font-weight:600;padding:4px 10px;border-radius:100px;margin:0 6px 6px 0;">${todo.length} to do</span>
  ${overdue.length > 0 ? `<span style="display:inline-block;background:#fef2f2;color:#dc2626;font-size:12px;font-weight:600;padding:4px 10px;border-radius:100px;margin:0 6px 6px 0;">${overdue.length} overdue</span>` : ''}
  ${blocked.length > 0 ? `<span style="display:inline-block;background:#fffbeb;color:#d97706;font-size:12px;font-weight:600;padding:4px 10px;border-radius:100px;margin:0 6px 6px 0;">${blocked.length} blocked</span>` : ''}
</div>

${overdue.length > 0 ? `
<p style="font-size:13px;font-weight:600;color:#dc2626;margin:0 0 8px;">Needs Attention</p>
<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #fecaca;border-radius:8px;border-collapse:separate;overflow:hidden;margin-bottom:20px;">
${overdue.map(t => `<tr><td style="padding:8px 16px;border-bottom:1px solid #fef2f2;font-size:13px;">${t.title}</td><td style="padding:8px 16px;border-bottom:1px solid #fef2f2;font-size:12px;color:#71717a;">${teamMap.get(t.team_id) ?? ''}</td><td style="padding:8px 16px;border-bottom:1px solid #fef2f2;font-size:12px;color:#dc2626;">Due ${t.due_date ? new Date(t.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</td></tr>`).join('')}
</table>` : ''}

${blocked.length > 0 ? `
<p style="font-size:13px;font-weight:600;color:#d97706;margin:0 0 8px;">Blocked</p>
<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #fde68a;border-radius:8px;border-collapse:separate;overflow:hidden;margin-bottom:20px;">
${blocked.map(t => `<tr><td style="padding:8px 16px;border-bottom:1px solid #fffbeb;font-size:13px;">${t.title}</td><td style="padding:8px 16px;border-bottom:1px solid #fffbeb;font-size:12px;color:#71717a;">${teamMap.get(t.team_id) ?? ''}</td><td style="padding:8px 16px;border-bottom:1px solid #fffbeb;font-size:12px;color:#d97706;">${t.blocked_reason ?? 'No reason given'}</td></tr>`).join('')}
</table>` : ''}

<!-- In Progress by Team -->
${teamSections ? `
<p style="font-size:13px;font-weight:600;color:#09090b;margin:0 0 8px;">In Progress by Team</p>
<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e4e4e7;border-radius:8px;border-collapse:separate;overflow:hidden;margin-bottom:20px;">
<tr style="background:#f9fafb;"><th style="padding:8px 16px;text-align:left;font-size:11px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #e4e4e7;">Task</th><th style="padding:8px 16px;text-align:left;font-size:11px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #e4e4e7;">Priority</th><th style="padding:8px 16px;text-align:left;font-size:11px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #e4e4e7;">Due</th></tr>
${teamSections}
</table>` : ''}

<div style="text-align:center;margin:28px 0 0;">
  <a href="https://pm-dashboard-nine-nu.vercel.app" style="display:inline-block;background:#1a56db;color:#ffffff;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;text-decoration:none;">Open Dashboard</a>
</div>

</div>

<div style="background:#f9fafb;border-radius:0 0 12px 12px;border:1px solid #e4e4e7;border-top:none;padding:16px 28px;text-align:center;">
  <p style="font-size:11px;color:#a1a1aa;margin:0;">pm-dashboard — Visa Internal</p>
</div>

</div>
</body></html>`

    setBodyHtml(html)
  }

  const handleSend = async () => {
    if (!subject || !bodyHtml || activeRecipients.length === 0) return
    try {
      await sendEmail.mutateAsync({
        subject,
        body_html: bodyHtml,
        recipients: activeRecipients.map(r => ({ email: r.email, name: r.name })),
        sent_by: currentMember?.id ?? null,
      })
      setSendSuccess(true)
      setTimeout(() => setSendSuccess(false), 3000)
    } catch (err) {
      alert(`Failed to send: ${(err as Error).message}`)
    }
  }

  const handleAddRecipient = async () => {
    if (!newEmail.trim() || !newName.trim()) return
    await addRecipient.mutateAsync({
      email: newEmail.trim(),
      name: newName.trim(),
      team_id: newTeamId || null,
      added_by: currentMember?.id ?? null,
    })
    setNewEmail(''); setNewName(''); setNewTeamId(''); setShowAddForm(false)
  }

  const handleImportMembers = async () => {
    for (const m of members) {
      if (!recipients.some(r => r.email === m.email)) {
        await addRecipient.mutateAsync({
          email: m.email,
          name: m.full_name,
          team_id: m.team_id,
          added_by: currentMember?.id ?? null,
        })
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
            <Button
              key={key}
              variant={activeTab === key ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab(key as Tab)}
              className="gap-1.5"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Button>
          ))}
        </div>

        {/* ===== COMPOSE TAB ===== */}
        {activeTab === 'compose' && (
          <div className="space-y-4">
            {/* Quick actions */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">Quick Compose</p>
                    <p className="text-xs text-muted-foreground">Auto-generate an email based on current task data</p>
                  </div>
                  <Button onClick={generateTemplate} className="gap-1.5">
                    <Sparkles className="h-4 w-4" />
                    Generate Update
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="email-subject">Subject</Label>
              <Input
                id="email-subject"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="e.g. Daily Update — Sprint 3 Progress"
              />
            </div>

            {/* Body editor / preview toggle */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Email Body</Label>
                <Button variant="ghost" size="sm" onClick={() => setShowPreview(!showPreview)} className="gap-1 text-xs">
                  <Eye className="h-3 w-3" />{showPreview ? 'Edit' : 'Preview'}
                </Button>
              </div>

              {showPreview ? (
                <Card>
                  <CardContent className="p-0">
                    <div className="rounded-lg overflow-hidden border">
                      <iframe
                        srcDoc={bodyHtml}
                        className="w-full border-0"
                        style={{ height: '500px' }}
                        title="Email preview"
                      />
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Textarea
                  value={bodyHtml}
                  onChange={e => setBodyHtml(e.target.value)}
                  placeholder="Paste or generate HTML email content..."
                  className="min-h-[300px] font-mono text-xs"
                  rows={15}
                />
              )}
            </div>

            {/* Send bar */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Sending to <strong className="text-foreground">{activeRecipients.length}</strong> recipient{activeRecipients.length !== 1 ? 's' : ''}
                    {activeRecipients.length > 0 && (
                      <span className="ml-2 text-xs">
                        ({activeRecipients.slice(0, 3).map(r => r.name.split(' ')[0]).join(', ')}{activeRecipients.length > 3 ? `, +${activeRecipients.length - 3}` : ''})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {sendSuccess && (
                      <span className="text-sm text-green-600 flex items-center gap-1"><Check className="h-4 w-4" />Sent!</span>
                    )}
                    <Button
                      onClick={handleSend}
                      disabled={!subject || !bodyHtml || activeRecipients.length === 0 || sendEmail.isPending}
                      className="gap-1.5"
                    >
                      <Send className="h-4 w-4" />
                      {sendEmail.isPending ? 'Sending...' : 'Send Email'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ===== RECIPIENTS TAB ===== */}
        {activeTab === 'recipients' && (
          <div className="space-y-4">
            {/* Actions bar */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{recipients.length} total, {activeRecipients.length} active</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleImportMembers} className="gap-1.5 text-xs">
                  <UserPlus className="h-3.5 w-3.5" />Import All Team Members
                </Button>
                <Button size="sm" onClick={() => setShowAddForm(true)} className="gap-1.5 text-xs">
                  <Plus className="h-3.5 w-3.5" />Add Recipient
                </Button>
              </div>
            </div>

            {/* Add form */}
            {showAddForm && (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <p className="font-semibold text-sm">Add Recipient</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Name</Label>
                      <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Full name" className="text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Email</Label>
                      <Input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="name@visa.com" className="text-sm" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Team (optional)</Label>
                    <Select value={newTeamId || 'none'} onValueChange={(v: string | null) => setNewTeamId(!v || v === 'none' ? '' : v)}>
                      <SelectTrigger><span>{newTeamId ? teamMap.get(newTeamId) : 'No team'}</span></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No team</SelectItem>
                        {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => { setShowAddForm(false); setNewEmail(''); setNewName(''); setNewTeamId('') }}>Cancel</Button>
                    <Button size="sm" onClick={handleAddRecipient} disabled={!newEmail.trim() || !newName.trim()}>Add</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recipient list */}
            <Card>
              <CardContent className="p-0">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Name</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Email</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Team</th>
                      <th className="px-4 py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Active</th>
                      <th className="px-4 py-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {recipients.map(r => (
                      <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-2.5 text-sm font-medium">{r.name}</td>
                        <td className="px-4 py-2.5 text-sm text-muted-foreground">{r.email}</td>
                        <td className="px-4 py-2.5 text-sm text-muted-foreground">{r.team_id ? teamMap.get(r.team_id) ?? '—' : '—'}</td>
                        <td className="px-4 py-2.5 text-center">
                          <button
                            onClick={() => updateRecipient.mutate({ id: r.id, is_active: !r.is_active })}
                            className="inline-flex items-center"
                          >
                            {r.is_active
                              ? <ToggleRight className="h-5 w-5 text-green-600" />
                              : <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                            }
                          </button>
                        </td>
                        <td className="px-4 py-2.5">
                          <button
                            onClick={() => removeRecipient.mutate(r.id)}
                            className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {recipients.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">No recipients yet. Import team members or add manually.</td></tr>
                    )}
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
              <Card>
                <CardContent className="py-12 text-center">
                  <History className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No emails sent yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">Compose and send your first update.</p>
                </CardContent>
              </Card>
            ) : (
              history.map(entry => {
                const sentByMember = entry.sent_by ? members.find(m => m.id === entry.sent_by) : null
                return (
                  <Card key={entry.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{entry.subject}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span>{new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                            <span>·</span>
                            <span>{entry.recipient_count} recipient{entry.recipient_count !== 1 ? 's' : ''}</span>
                            {sentByMember && <><span>·</span><span>by {sentByMember.full_name}</span></>}
                          </div>
                        </div>
                        <Badge variant="secondary" className="gap-1 shrink-0">
                          <Check className="h-3 w-3" />Sent
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        )}

      </div>
    </div>
  )
}
