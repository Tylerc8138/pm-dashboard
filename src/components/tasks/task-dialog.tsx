import { useEffect, useState } from 'react'
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
import { useReferences, useCreateReference, useDeleteReference } from '@/hooks/use-references'
import type { Task, TaskStatus, TaskPriority } from '@/types/database'
import { Trash2, Plus, ExternalLink, Link, X, User } from 'lucide-react'

const STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
}

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
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

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TaskStatus>('todo')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [sprintId, setSprintId] = useState('')
  const [teamId, setTeamId] = useState('')
  const [ownerId, setOwnerId] = useState<string>('unassigned')
  const [isBlocked, setIsBlocked] = useState(false)
  const [blockedReason, setBlockedReason] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const [showRefForm, setShowRefForm] = useState(false)
  const [refLabel, setRefLabel] = useState('')
  const [refUrl, setRefUrl] = useState('')

  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setDescription(task.description ?? '')
      setStatus(task.status)
      setPriority(task.priority ?? 'medium')
      setSprintId(task.sprint_id)
      setTeamId(task.team_id)
      setOwnerId(task.owner_id ?? 'unassigned')
      setIsBlocked(task.is_blocked)
      setBlockedReason(task.blocked_reason ?? '')
    } else {
      setTitle('')
      setDescription('')
      setStatus(defaultStatus ?? 'todo')
      setPriority('medium')
      setSprintId(sprints?.[0]?.id ?? '')
      setTeamId(teams?.[0]?.id ?? '')
      setOwnerId('unassigned')
      setIsBlocked(false)
      setBlockedReason('')
    }
    setConfirmDelete(false)
    setShowRefForm(false)
    setRefLabel('')
    setRefUrl('')
  }, [task, open, defaultStatus, sprints, teams])

  const teamMembers = members?.filter((m) => m.team_id === teamId) ?? []

  const sprintLabel = sprints?.find((s) => s.id === sprintId)
    ? `Sprint ${sprints.find((s) => s.id === sprintId)!.number}: ${sprints.find((s) => s.id === sprintId)!.name}`
    : 'Select sprint'
  const teamLabel = teams?.find((t) => t.id === teamId)?.name ?? 'Select team'
  const ownerLabel = ownerId === 'unassigned'
    ? 'Unassigned'
    : members?.find((m) => m.id === ownerId)?.full_name ?? 'Select owner'

  const assignedByMember = task?.assigned_by_id
    ? members?.find((m) => m.id === task.assigned_by_id)
    : null

  const handleSave = async () => {
    if (!title.trim() || !sprintId || !teamId) return

    const payload = {
      title: title.trim(),
      description,
      status,
      priority,
      sprint_id: sprintId,
      team_id: teamId,
      owner_id: ownerId === 'unassigned' ? null : ownerId,
      is_blocked: isBlocked,
      blocked_reason: isBlocked ? blockedReason : null,
    }

    try {
      if (isEdit) {
        await updateTask.mutateAsync({ id: task.id, ...payload })
      } else {
        await createTask.mutateAsync({
          ...payload,
          assigned_by_id: currentMember?.id ?? null,
          position: Math.floor(Date.now() / 1000) % 1000000 + 100000,
        })
      }
      onClose()
    } catch (err: unknown) {
      const e = err as Record<string, unknown>
      const message = e?.message ?? e?.details ?? e?.hint ?? JSON.stringify(err)
      alert(`Error saving task: ${message}`)
    }
  }

  const handleDelete = async () => {
    if (!task) return
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    await deleteTask.mutateAsync(task.id)
    onClose()
  }

  const handleAddReference = async () => {
    if (!task || !refLabel.trim() || !refUrl.trim()) return
    let url = refUrl.trim()
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url
    }
    try {
      await createReference.mutateAsync({
        task_id: task.id,
        label: refLabel.trim(),
        url,
        created_by: currentMember?.id ?? null,
      })
      setRefLabel('')
      setRefUrl('')
      setShowRefForm(false)
    } catch (err: unknown) {
      const e = err as Record<string, unknown>
      alert(`Error adding reference: ${e?.message ?? JSON.stringify(err)}`)
    }
  }

  const handleDeleteReference = async (refId: string) => {
    if (!task) return
    await deleteReference.mutateAsync({ id: refId, taskId: task.id })
  }

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
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional details" rows={2} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v: string | null) => v && setStatus(v as TaskStatus)}>
                <SelectTrigger>
                  <span>{STATUS_LABELS[status]}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="backlog">Backlog</SelectItem>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v: string | null) => v && setPriority(v as TaskPriority)}>
                <SelectTrigger>
                  <span>{PRIORITY_LABELS[priority]}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Sprint</Label>
            <Select value={sprintId} onValueChange={(v: string | null) => setSprintId(v ?? '')}>
              <SelectTrigger className="w-full">
                <span className="truncate">{sprintLabel}</span>
              </SelectTrigger>
              <SelectContent>
                {sprints?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>Sprint {s.number}: {s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Team</Label>
              <Select value={teamId} onValueChange={(v: string | null) => { setTeamId(v ?? ''); setOwnerId('unassigned') }}>
                <SelectTrigger className="w-full">
                  <span className="truncate">{teamLabel}</span>
                </SelectTrigger>
                <SelectContent>
                  {teams?.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Assigned To</Label>
              <Select value={ownerId} onValueChange={(v: string | null) => setOwnerId(v ?? 'unassigned')}>
                <SelectTrigger className="w-full">
                  <span className="truncate">{ownerLabel}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {teamMembers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Assigned By - shown on edit as read-only, auto-set on create */}
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
            {isBlocked && (
              <Input
                value={blockedReason}
                onChange={(e) => setBlockedReason(e.target.value)}
                placeholder="Reason for block"
                className="flex-1"
              />
            )}
          </div>

          {/* References Section */}
          {isEdit && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5">
                    <Link className="h-4 w-4" />
                    References
                  </Label>
                  <Button variant="ghost" size="sm" onClick={() => setShowRefForm(!showRefForm)} className="gap-1 text-xs">
                    <Plus className="h-3 w-3" />
                    Add Link
                  </Button>
                </div>

                {references.length > 0 && (
                  <div className="space-y-1.5">
                    {references.map((ref) => (
                      <div key={ref.id} className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <a href={ref.url} target="_blank" rel="noopener noreferrer" className="flex-1 text-sm text-primary hover:underline truncate" onClick={(e) => e.stopPropagation()}>
                          {ref.label}
                        </a>
                        <button onClick={() => handleDeleteReference(ref.id)} className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {references.length === 0 && !showRefForm && (
                  <p className="text-xs text-muted-foreground italic">No references attached. Add links to documents, designs, or other materials.</p>
                )}

                {showRefForm && (
                  <div className="space-y-2 rounded-md border bg-muted/20 p-3">
                    <Input value={refLabel} onChange={(e) => setRefLabel(e.target.value)} placeholder="Label (e.g. Landing page draft v2)" className="text-sm" />
                    <Input value={refUrl} onChange={(e) => setRefUrl(e.target.value)} placeholder="URL (e.g. docs.google.com/...)" className="text-sm" />
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => { setShowRefForm(false); setRefLabel(''); setRefUrl('') }}>Cancel</Button>
                      <Button size="sm" onClick={handleAddReference} disabled={!refLabel.trim() || !refUrl.trim()}>Add</Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <div>
            {isEdit && (
              <Button variant="destructive" size="sm" onClick={handleDelete} className="gap-1.5">
                <Trash2 className="h-4 w-4" />
                {confirmDelete ? 'Confirm Delete' : 'Delete'}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={!title.trim()}>
              {isEdit ? 'Save Changes' : 'Create Task'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
