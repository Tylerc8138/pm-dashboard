import { useEffect, useState, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useTeams } from '@/hooks/use-teams'
import { useMembers } from '@/hooks/use-members'
import { useSprints } from '@/hooks/use-sprints'
import { useCurrentMember } from '@/hooks/use-current-member'
import { useCreateTask, useUpdateTask, useDeleteTask } from '@/hooks/use-tasks'
import { useReferences, useCreateReference, useDeleteReference, uploadImage } from '@/hooks/use-references'
import { useAssignees, useAddAssignee, useUpdateAssignee, useRemoveAssignee } from '@/hooks/use-assignees'
import { useDependencies, useAddDependency, useRemoveDependency } from '@/hooks/use-dependencies'
import { useTasks } from '@/hooks/use-tasks'
import type { Task, TaskStatus, TaskPriority } from '@/types/database'
import { TaskActivity } from './task-activity'
import { Trash2, Plus, ExternalLink, Link, X, User, ImagePlus, Upload, UserPlus, GitBranch, CheckCircle2, Clock } from 'lucide-react'
import React from 'react'

const STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: 'Backlog', todo: 'To Do', in_progress: 'In Progress', done: 'Done',
}
const PRIORITY_LABELS: Record<TaskPriority, string> = {
  high: 'High', medium: 'Medium', low: 'Low',
}

interface TaskDialogProps {
  open: boolean
  onClose: () => void
  task?: Task | null
  defaultStatus?: TaskStatus
}

export function TaskDialog({ open, onClose, task, defaultStatus }: TaskDialogProps) {
  const isEdit = !!task
  const { data: teams } = useTeams()
  const { data: members } = useMembers()
  const { data: sprints } = useSprints()
  const { data: currentMember } = useCurrentMember()
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()

  const { data: references = [] } = useReferences(task?.id ?? null)
  const createReference = useCreateReference()
  const deleteReference = useDeleteReference()

  const { data: assignees = [] } = useAssignees(task?.id ?? null)
  const addAssignee = useAddAssignee()
  const updateAssigneeHook = useUpdateAssignee()
  const removeAssignee = useRemoveAssignee()

  const { data: deps } = useDependencies(task?.id ?? null)
  const addDep = useAddDependency()
  const removeDep = useRemoveDependency()
  const { data: allTasks = [] } = useTasks()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TaskStatus>('todo')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [sprintId, setSprintId] = useState('')
  const [teamId, setTeamId] = useState('')
  const [isBlocked, setIsBlocked] = useState(false)
  const [blockedReason, setBlockedReason] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Reference state
  const [showRefForm, setShowRefForm] = useState(false)
  const [refLabel, setRefLabel] = useState('')
  const [refUrl, setRefUrl] = useState('')
  const [showImageForm, setShowImageForm] = useState(false)
  const [imageLabel, setImageLabel] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)

  // Assignee state
  const [showAssigneeForm, setShowAssigneeForm] = useState(false)
  const [newAssigneeMemberId, setNewAssigneeMemberId] = useState('')
  const [newAssigneeDesc, setNewAssigneeDesc] = useState('')

  // Dependency state
  const [showDepForm, setShowDepForm] = useState(false)
  const [depType, setDepType] = useState<'waiting' | 'blocks'>('waiting')
  const [depTaskId, setDepTaskId] = useState('')

  useEffect(() => {
    if (task) {
      setTitle(task.title); setDescription(task.description ?? '')
      setStatus(task.status); setPriority(task.priority ?? 'medium')
      setSprintId(task.sprint_id); setTeamId(task.team_id)
      setIsBlocked(task.is_blocked); setBlockedReason(task.blocked_reason ?? '')
      setDueDate(task.due_date ?? '')
    } else {
      setTitle(''); setDescription(''); setStatus(defaultStatus ?? 'todo')
      setPriority('medium'); setSprintId(sprints?.[0]?.id ?? '')
      setTeamId(teams?.[0]?.id ?? ''); setIsBlocked(false); setBlockedReason('')
      setDueDate('')
    }
    setConfirmDelete(false); setShowRefForm(false); setShowImageForm(false)
    setRefLabel(''); setRefUrl(''); setImageLabel(''); setImageFile(null); setImagePreview(null)
    setShowAssigneeForm(false); setNewAssigneeMemberId(''); setNewAssigneeDesc('')
    setShowDepForm(false); setDepTaskId('')
  }, [task, open, defaultStatus, sprints, teams])

  const sprintLabel = sprints?.find((s) => s.id === sprintId)
    ? `Sprint ${sprints.find((s) => s.id === sprintId)!.number}: ${sprints.find((s) => s.id === sprintId)!.name}`
    : 'Select sprint'
  const teamLabel = teams?.find((t) => t.id === teamId)?.name ?? 'Select team'
  const assignedByMember = task?.assigned_by_id ? members?.find((m) => m.id === task.assigned_by_id) : null

  // Members not yet assigned to this task
  const availableMembers = members?.filter((m) => !assignees.some((a) => a.member_id === m.id)) ?? []

  const newAssigneeMemberLabel = newAssigneeMemberId
    ? members?.find((m) => m.id === newAssigneeMemberId)?.full_name ?? 'Select person'
    : 'Select person'

  const handleSave = async () => {
    if (!title.trim() || !sprintId || !teamId) return
    const payload = {
      title: title.trim(), description, status, priority,
      sprint_id: sprintId, team_id: teamId,
      is_blocked: isBlocked, blocked_reason: isBlocked ? blockedReason : null,
      due_date: dueDate || null,
    }
    try {
      if (isEdit) {
        await updateTask.mutateAsync({ update: { id: task.id, ...payload }, previousTask: task, actorId: currentMember?.id })
      } else {
        await createTask.mutateAsync({
          ...payload, assigned_by_id: currentMember?.id ?? null,
          position: Math.floor(Date.now() / 1000) % 1000000 + 100000,
        })
      }
      onClose()
    } catch (err: unknown) {
      const e = err as Record<string, unknown>
      alert(`Error saving task: ${e?.message ?? e?.details ?? e?.hint ?? JSON.stringify(err)}`)
    }
  }

  const handleDelete = async () => {
    if (!task) return
    if (!confirmDelete) { setConfirmDelete(true); return }
    await deleteTask.mutateAsync(task.id); onClose()
  }

  // Assignee handlers
  const handleAddAssignee = async () => {
    if (!task || !newAssigneeMemberId) return
    try {
      await addAssignee.mutateAsync({
        task_id: task.id, member_id: newAssigneeMemberId, description: newAssigneeDesc.trim(),
      })
      setNewAssigneeMemberId(''); setNewAssigneeDesc(''); setShowAssigneeForm(false)
    } catch (err: unknown) {
      const e = err as Record<string, unknown>
      alert(`Error adding assignee: ${e?.message ?? JSON.stringify(err)}`)
    }
  }

  const handleUpdateAssigneeDesc = async (assigneeId: string, desc: string) => {
    if (!task) return
    await updateAssigneeHook.mutateAsync({ id: assigneeId, description: desc, taskId: task.id })
  }

  const handleRemoveAssignee = async (assigneeId: string) => {
    if (!task) return
    await removeAssignee.mutateAsync({ id: assigneeId, taskId: task.id })
  }

  // Reference handlers
  const handleAddReference = async () => {
    if (!task || !refLabel.trim() || !refUrl.trim()) return
    let url = refUrl.trim()
    if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url
    try {
      await createReference.mutateAsync({ task_id: task.id, label: refLabel.trim(), url, type: 'link', created_by: currentMember?.id ?? null })
      setRefLabel(''); setRefUrl(''); setShowRefForm(false)
    } catch (err: unknown) { const e = err as Record<string, unknown>; alert(`Error: ${e?.message ?? JSON.stringify(err)}`) }
  }

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) { alert('Please select an image file'); return }
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = (e) => setImagePreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragOver(false); if (e.dataTransfer.files[0]) handleFileSelect(e.dataTransfer.files[0]) }, [])
  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true) }, [])
  const handleDragLeave = useCallback(() => { setIsDragOver(false) }, [])

  const handleUploadImage = async () => {
    if (!task || !imageFile || !imageLabel.trim()) return
    setUploading(true)
    try {
      const url = await uploadImage(imageFile, task.id)
      await createReference.mutateAsync({ task_id: task.id, label: imageLabel.trim(), url, type: 'image', created_by: currentMember?.id ?? null })
      setImageLabel(''); setImageFile(null); setImagePreview(null); setShowImageForm(false)
    } catch (err: unknown) { const e = err as Record<string, unknown>; alert(`Error: ${e?.message ?? JSON.stringify(err)}`) }
    finally { setUploading(false) }
  }

  const handleDeleteReference = async (refId: string) => { if (task) await deleteReference.mutateAsync({ id: refId, taskId: task.id }) }

  // Dependency handlers
  const handleAddDep = async () => {
    if (!task || !depTaskId) return
    try {
      if (depType === 'waiting') {
        await addDep.mutateAsync({ blockingTaskId: depTaskId, waitingTaskId: task.id })
      } else {
        await addDep.mutateAsync({ blockingTaskId: task.id, waitingTaskId: depTaskId })
      }
      setDepTaskId(''); setShowDepForm(false)
    } catch (err: unknown) {
      const e = err as Record<string, unknown>
      alert(`Error adding dependency: ${e?.message ?? JSON.stringify(err)}`)
    }
  }

  const handleRemoveDep = async (depId: string) => {
    await removeDep.mutateAsync(depId)
  }

  const waitingOn = deps?.waitingOn ?? []
  const blocks = deps?.blocks ?? []

  // Tasks available for dependency linking (exclude self and already linked)
  const linkedTaskIds = new Set([
    ...waitingOn.map(d => d.blocking_task_id),
    ...blocks.map(d => d.waiting_task_id),
    task?.id ?? '',
  ])
  const availableDepTasks = allTasks.filter(t => !linkedTaskIds.has(t.id))

  const linkRefs = references.filter((r) => r.type === 'link' || !r.type)
  const imageRefs = references.filter((r) => r.type === 'image')

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Task' : 'New Task'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional details" rows={2} style={{ fieldSizing: 'fixed' } as React.CSSProperties} className="resize-vertical min-h-[60px] max-h-[200px] overflow-y-auto whitespace-pre-wrap break-words" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v: string | null) => v && setStatus(v as TaskStatus)}>
                <SelectTrigger><span>{STATUS_LABELS[status]}</span></SelectTrigger>
                <SelectContent>
                  <SelectItem value="backlog">Backlog</SelectItem><SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v: string | null) => v && setPriority(v as TaskPriority)}>
                <SelectTrigger><span>{PRIORITY_LABELS[priority]}</span></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Sprint</Label>
            <Select value={sprintId} onValueChange={(v: string | null) => setSprintId(v ?? '')}>
              <SelectTrigger className="w-full"><span className="truncate">{sprintLabel}</span></SelectTrigger>
              <SelectContent>{sprints?.map((s) => (<SelectItem key={s.id} value={s.id}>Sprint {s.number}: {s.name}</SelectItem>))}</SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Team</Label>
            <Select value={teamId} onValueChange={(v: string | null) => setTeamId(v ?? '')}>
              <SelectTrigger className="w-full"><span className="truncate">{teamLabel}</span></SelectTrigger>
              <SelectContent>{teams?.map((t) => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))}</SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="due-date">Due Date</Label>
            <Input id="due-date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>

          {isEdit && assignedByMember && (
            <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Assigned by:</span>
              <span className="text-sm font-medium">{assignedByMember.full_name}</span>
            </div>
          )}

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isBlocked} onChange={(e) => setIsBlocked(e.target.checked)} className="rounded" />
              Blocked
            </label>
            {isBlocked && <Input value={blockedReason} onChange={(e) => setBlockedReason(e.target.value)} placeholder="Reason for block" className="flex-1" />}
          </div>

          {/* Assignees Section */}
          {isEdit && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5"><UserPlus className="h-4 w-4" />Assignees</Label>
                  <Button variant="ghost" size="sm" onClick={() => setShowAssigneeForm(!showAssigneeForm)} className="gap-1 text-xs">
                    <Plus className="h-3 w-3" />Add Person
                  </Button>
                </div>

                {assignees.length > 0 && (
                  <div className="space-y-2">
                    {assignees.map((a) => {
                      const m = members?.find((mem) => mem.id === a.member_id)
                      const t = teams?.find((tm) => tm.id === m?.team_id)
                      return (
                        <div key={a.id} className="rounded-md border bg-muted/20 p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-medium">
                                {m?.full_name?.split(' ').map((n) => n[0]).join('') ?? '?'}
                              </div>
                              <span className="text-sm font-medium">{m?.full_name ?? 'Unknown'}</span>
                              {t && <span className="text-xs text-muted-foreground">({t.name})</span>}
                            </div>
                            <button onClick={() => handleRemoveAssignee(a.id)} className="rounded p-0.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <Textarea
                            value={a.description}
                            onChange={() => {}}
                            onBlur={(e) => handleUpdateAssigneeDesc(a.id, e.target.value)}
                            onInput={(e) => {
                              const target = e.target as HTMLTextAreaElement
                              // Update local display immediately
                              target.defaultValue = target.value
                            }}
                            defaultValue={a.description}
                            placeholder="What should this person contribute to this task?"
                            rows={1}
                            style={{ fieldSizing: 'fixed' } as React.CSSProperties}
                            className="resize-none min-h-[32px] text-xs bg-white"
                          />
                        </div>
                      )
                    })}
                  </div>
                )}

                {assignees.length === 0 && !showAssigneeForm && (
                  <p className="text-xs text-muted-foreground italic">No one assigned yet. Add people and describe their contribution.</p>
                )}

                {showAssigneeForm && (
                  <div className="space-y-2 rounded-md border bg-muted/20 p-3">
                    <Select value={newAssigneeMemberId || 'none'} onValueChange={(v: string | null) => setNewAssigneeMemberId(v === 'none' ? '' : v ?? '')}>
                      <SelectTrigger className="w-full"><span className="truncate">{newAssigneeMemberLabel}</span></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Select person</SelectItem>
                        {availableMembers.map((m) => {
                          const t = teams?.find((tm) => tm.id === m.team_id)
                          return <SelectItem key={m.id} value={m.id}>{m.full_name} ({t?.name})</SelectItem>
                        })}
                      </SelectContent>
                    </Select>
                    <Textarea
                      value={newAssigneeDesc} onChange={(e) => setNewAssigneeDesc(e.target.value)}
                      placeholder="Describe what this person should contribute..."
                      rows={2} style={{ fieldSizing: 'fixed' } as React.CSSProperties}
                      className="resize-none min-h-[48px] text-sm"
                    />
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => { setShowAssigneeForm(false); setNewAssigneeMemberId(''); setNewAssigneeDesc('') }}>Cancel</Button>
                      <Button size="sm" onClick={handleAddAssignee} disabled={!newAssigneeMemberId}>Add</Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Dependencies Section */}
          {isEdit && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5"><GitBranch className="h-4 w-4" />Dependencies</Label>
                  <Button variant="ghost" size="sm" onClick={() => setShowDepForm(!showDepForm)} className="gap-1 text-xs">
                    <Plus className="h-3 w-3" />Add Dependency
                  </Button>
                </div>

                {/* Waiting On */}
                {waitingOn.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">Waiting on:</p>
                    {waitingOn.map((dep) => {
                      const blockingTask = allTasks.find(t => t.id === dep.blocking_task_id)
                      const blockingTeam = teams?.find(t => t.id === blockingTask?.team_id)
                      const isResolved = blockingTask?.status === 'done'
                      return (
                        <div key={dep.id} className={`flex items-center gap-2 rounded-md border px-3 py-2 ${isResolved ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                          {isResolved ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" /> : <Clock className="h-3.5 w-3.5 text-amber-600 shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate">{blockingTask?.title ?? 'Unknown task'}</p>
                            {blockingTeam && <p className="text-[10px] text-muted-foreground">{blockingTeam.name}</p>}
                          </div>
                          <span className={`text-[10px] font-medium ${isResolved ? 'text-green-600' : 'text-amber-600'}`}>{isResolved ? 'Done' : 'Pending'}</span>
                          <button onClick={() => handleRemoveDep(dep.id)} className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"><X className="h-3.5 w-3.5" /></button>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Blocks */}
                {blocks.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">Blocks:</p>
                    {blocks.map((dep) => {
                      const waitingTask = allTasks.find(t => t.id === dep.waiting_task_id)
                      const waitingTeam = teams?.find(t => t.id === waitingTask?.team_id)
                      return (
                        <div key={dep.id} className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
                          <GitBranch className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate">{waitingTask?.title ?? 'Unknown task'}</p>
                            {waitingTeam && <p className="text-[10px] text-muted-foreground">{waitingTeam.name}</p>}
                          </div>
                          <button onClick={() => handleRemoveDep(dep.id)} className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"><X className="h-3.5 w-3.5" /></button>
                        </div>
                      )
                    })}
                  </div>
                )}

                {waitingOn.length === 0 && blocks.length === 0 && !showDepForm && (
                  <p className="text-xs text-muted-foreground italic">No dependencies. Link tasks that depend on each other.</p>
                )}

                {showDepForm && (
                  <div className="space-y-2 rounded-md border bg-muted/20 p-3">
                    <div className="flex gap-2">
                      <Button variant={depType === 'waiting' ? 'default' : 'outline'} size="sm" onClick={() => setDepType('waiting')} className="text-xs">This task is waiting on...</Button>
                      <Button variant={depType === 'blocks' ? 'default' : 'outline'} size="sm" onClick={() => setDepType('blocks')} className="text-xs">This task blocks...</Button>
                    </div>
                    <Select value={depTaskId || 'none'} onValueChange={(v: string | null) => setDepTaskId(v === 'none' ? '' : v ?? '')}>
                      <SelectTrigger className="w-full">
                        <span className="truncate">{depTaskId ? (allTasks.find(t => t.id === depTaskId)?.title ?? 'Select task') : 'Select task'}</span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Select task</SelectItem>
                        {availableDepTasks.map((t) => {
                          const tm = teams?.find(team => team.id === t.team_id)
                          return <SelectItem key={t.id} value={t.id}>{t.title} ({tm?.name})</SelectItem>
                        })}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => { setShowDepForm(false); setDepTaskId('') }}>Cancel</Button>
                      <Button size="sm" onClick={handleAddDep} disabled={!depTaskId}>Add</Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* References Section */}
          {isEdit && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5"><Link className="h-4 w-4" />References</Label>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => { setShowRefForm(!showRefForm); setShowImageForm(false) }} className="gap-1 text-xs"><Plus className="h-3 w-3" />Link</Button>
                    <Button variant="ghost" size="sm" onClick={() => { setShowImageForm(!showImageForm); setShowRefForm(false) }} className="gap-1 text-xs"><ImagePlus className="h-3 w-3" />Screenshot</Button>
                  </div>
                </div>

                {linkRefs.length > 0 && (
                  <div className="space-y-1.5">
                    {linkRefs.map((ref) => (
                      <div key={ref.id} className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <a href={ref.url} target="_blank" rel="noopener noreferrer" className="flex-1 text-sm text-primary hover:underline truncate" onClick={(e) => e.stopPropagation()}>{ref.label}</a>
                        <button onClick={() => handleDeleteReference(ref.id)} className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"><X className="h-3.5 w-3.5" /></button>
                      </div>
                    ))}
                  </div>
                )}

                {imageRefs.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {imageRefs.map((ref) => (
                      <div key={ref.id} className="relative group rounded-md border overflow-hidden">
                        <a href={ref.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}><img src={ref.url} alt={ref.label} className="w-full h-32 object-cover" /></a>
                        <div className="px-2 py-1.5 bg-muted/50 flex items-center justify-between">
                          <span className="text-xs font-medium truncate">{ref.label}</span>
                          <button onClick={() => handleDeleteReference(ref.id)} className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"><X className="h-3 w-3" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {references.length === 0 && !showRefForm && !showImageForm && (
                  <p className="text-xs text-muted-foreground italic">No references attached. Add links or screenshots.</p>
                )}

                {showRefForm && (
                  <div className="space-y-2 rounded-md border bg-muted/20 p-3">
                    <Input value={refLabel} onChange={(e) => setRefLabel(e.target.value)} placeholder="Label (e.g. Landing page draft v2)" className="text-sm" />
                    <Input value={refUrl} onChange={(e) => setRefUrl(e.target.value)} placeholder="URL (e.g. docs.google.com/...)" className="text-sm" />
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => { setShowRefForm(false); setRefLabel(''); setRefUrl('') }}>Cancel</Button>
                      <Button size="sm" onClick={handleAddReference} disabled={!refLabel.trim() || !refUrl.trim()}>Add Link</Button>
                    </div>
                  </div>
                )}

                {showImageForm && (
                  <div className="space-y-2 rounded-md border bg-muted/20 p-3">
                    <Input value={imageLabel} onChange={(e) => setImageLabel(e.target.value)} placeholder="Screenshot title" className="text-sm" />
                    {!imagePreview ? (
                      <div onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onClick={() => document.getElementById('image-upload')?.click()}
                        className={`flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-6 cursor-pointer transition-colors ${isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}`}>
                        <Upload className="h-6 w-6 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Drop a screenshot here or <span className="text-primary underline">browse</span></p>
                        <input id="image-upload" type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])} />
                      </div>
                    ) : (
                      <div className="relative rounded-md border overflow-hidden">
                        <img src={imagePreview} alt="Preview" className="w-full max-h-[200px] object-contain bg-muted/50" />
                        <button onClick={() => { setImageFile(null); setImagePreview(null) }} className="absolute top-1 right-1 rounded-full bg-black/50 p-1 text-white hover:bg-black/70 transition-colors"><X className="h-3 w-3" /></button>
                      </div>
                    )}
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => { setShowImageForm(false); setImageLabel(''); setImageFile(null); setImagePreview(null) }}>Cancel</Button>
                      <Button size="sm" onClick={handleUploadImage} disabled={!imageLabel.trim() || !imageFile || uploading}>{uploading ? 'Uploading...' : 'Upload Screenshot'}</Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Activity & Comments Section */}
          {isEdit && task && (
            <TaskActivity taskId={task.id} currentMemberId={currentMember?.id ?? null} />
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <div>{isEdit && (
            <Button variant="destructive" size="sm" onClick={handleDelete} className="gap-1.5"><Trash2 className="h-4 w-4" />{confirmDelete ? 'Confirm Delete' : 'Delete'}</Button>
          )}</div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={!title.trim()}>{isEdit ? 'Save Changes' : 'Create Task'}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
