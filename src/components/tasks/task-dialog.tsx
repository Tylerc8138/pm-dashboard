import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTeams } from '@/hooks/use-teams'
import { useMembers } from '@/hooks/use-members'
import { useSprints } from '@/hooks/use-sprints'
import { useCreateTask, useUpdateTask, useDeleteTask } from '@/hooks/use-tasks'
import type { Task, TaskStatus } from '@/types/database'
import { Trash2 } from 'lucide-react'

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
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TaskStatus>('todo')
  const [storyPoints, setStoryPoints] = useState<string>('')
  const [sprintId, setSprintId] = useState('')
  const [teamId, setTeamId] = useState('')
  const [ownerId, setOwnerId] = useState<string>('unassigned')
  const [isBlocked, setIsBlocked] = useState(false)
  const [blockedReason, setBlockedReason] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setDescription(task.description ?? '')
      setStatus(task.status)
      setStoryPoints(task.story_points?.toString() ?? '')
      setSprintId(task.sprint_id)
      setTeamId(task.team_id)
      setOwnerId(task.owner_id ?? 'unassigned')
      setIsBlocked(task.is_blocked)
      setBlockedReason(task.blocked_reason ?? '')
    } else {
      setTitle('')
      setDescription('')
      setStatus(defaultStatus ?? 'todo')
      setStoryPoints('')
      setSprintId(sprints?.[0]?.id ?? '')
      setTeamId(teams?.[0]?.id ?? '')
      setOwnerId('unassigned')
      setIsBlocked(false)
      setBlockedReason('')
    }
    setConfirmDelete(false)
  }, [task, open, defaultStatus, sprints, teams])

  const teamMembers = members?.filter((m) => m.team_id === teamId) ?? []

  const handleSave = async () => {
    if (!title.trim() || !sprintId || !teamId) return

    const payload = {
      title: title.trim(),
      description,
      status,
      story_points: storyPoints ? parseInt(storyPoints) : null,
      sprint_id: sprintId,
      team_id: teamId,
      owner_id: ownerId === 'unassigned' ? null : ownerId,
      is_blocked: isBlocked,
      blocked_reason: isBlocked ? blockedReason : null,
    }

    if (isEdit) {
      await updateTask.mutateAsync({ id: task.id, ...payload })
    } else {
      await createTask.mutateAsync({ ...payload, position: Date.now() })
    }
    onClose()
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

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
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
              <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="backlog">Backlog</SelectItem>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sp">Story Points</Label>
              <Input id="sp" type="number" min={0} max={21} value={storyPoints} onChange={(e) => setStoryPoints(e.target.value)} placeholder="e.g. 5" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Sprint</Label>
              <Select value={sprintId} onValueChange={setSprintId}>
                <SelectTrigger><SelectValue placeholder="Select sprint" /></SelectTrigger>
                <SelectContent>
                  {sprints?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>Sprint {s.number}: {s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Team</Label>
              <Select value={teamId} onValueChange={(v) => { setTeamId(v); setOwnerId('unassigned') }}>
                <SelectTrigger><SelectValue placeholder="Select team" /></SelectTrigger>
                <SelectContent>
                  {teams?.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Owner</Label>
            <Select value={ownerId} onValueChange={setOwnerId}>
              <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {teamMembers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
