import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useSprints, useCreateSprint, useUpdateSprint } from '@/hooks/use-sprints'
import { useTasks } from '@/hooks/use-tasks'
import { Plus, Pencil, Calendar } from 'lucide-react'
import type { Sprint } from '@/types/database'
import React from 'react'

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

interface SprintManagerProps {
  open: boolean
  onClose: () => void
}

export function SprintManager({ open, onClose }: SprintManagerProps) {
  const { data: sprints = [] } = useSprints()
  const { data: allTasks = [] } = useTasks()
  const createSprint = useCreateSprint()
  const updateSprint = useUpdateSprint()

  const [editing, setEditing] = useState<Sprint | null>(null)
  const [creating, setCreating] = useState(false)

  const [name, setName] = useState('')
  const [goal, setGoal] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const resetForm = () => {
    setName('')
    setGoal('')
    setStartDate('')
    setEndDate('')
    setEditing(null)
    setCreating(false)
  }

  const handleEdit = (sprint: Sprint) => {
    setEditing(sprint)
    setCreating(false)
    setName(sprint.name)
    setGoal(sprint.goal ?? '')
    setStartDate(sprint.start_date ?? '')
    setEndDate(sprint.end_date ?? '')
  }

  const handleCreate = () => {
    setCreating(true)
    setEditing(null)
    setName('')
    setGoal('')
    setStartDate('')
    setEndDate('')
  }

  const handleSave = async () => {
    if (!name.trim()) return

    try {
      if (editing) {
        await updateSprint.mutateAsync({
          id: editing.id,
          name: name.trim(),
          goal: goal.trim() || undefined,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
        })
      } else if (creating) {
        const nextNumber = sprints.length > 0 ? Math.max(...sprints.map(s => s.number)) + 1 : 1
        await createSprint.mutateAsync({
          number: nextNumber,
          name: name.trim(),
          goal: goal.trim() || undefined,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
        })
      }
      resetForm()
    } catch (err: unknown) {
      const e = err as Record<string, unknown>
      alert(`Error saving sprint: ${e?.message ?? JSON.stringify(err)}`)
    }
  }

  const isFormOpen = editing || creating

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { resetForm(); onClose() } }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Manage Sprints
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Sprint list */}
          <div className="space-y-2">
            {sprints.map((sprint) => {
              const sprintTasks = allTasks.filter(t => t.sprint_id === sprint.id)
              const doneTasks = sprintTasks.filter(t => t.status === 'done').length
              const isActive = editing?.id === sprint.id

              return (
                <Card key={sprint.id} className={isActive ? 'ring-2 ring-primary' : ''}>
                  <CardContent className="flex items-start gap-3 p-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                      {sprint.number}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">{sprint.name}</p>
                        <Badge variant="outline" className="text-[10px]">
                          {doneTasks}/{sprintTasks.length} tasks done
                        </Badge>
                      </div>
                      {sprint.goal && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{sprint.goal}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(sprint.start_date)} — {formatDate(sprint.end_date)}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(sprint)} className="shrink-0">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Add sprint button */}
          {!isFormOpen && (
            <Button variant="outline" onClick={handleCreate} className="w-full gap-1.5">
              <Plus className="h-4 w-4" />
              Add Sprint
            </Button>
          )}

          {/* Edit/Create form */}
          {isFormOpen && (
            <>
              <Separator />
              <div className="space-y-3">
                <p className="text-sm font-semibold">
                  {editing ? `Edit Sprint ${editing.number}` : `New Sprint ${sprints.length > 0 ? Math.max(...sprints.map(s => s.number)) + 1 : 1}`}
                </p>

                <div className="space-y-2">
                  <Label htmlFor="sprint-name">Name</Label>
                  <Input id="sprint-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Discovery & Audit" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sprint-goal">Goal</Label>
                  <Textarea
                    id="sprint-goal" value={goal} onChange={(e) => setGoal(e.target.value)}
                    placeholder="What should be accomplished by the end of this sprint?"
                    rows={2}
                    style={{ fieldSizing: 'fixed' } as React.CSSProperties}
                    className="resize-vertical min-h-[60px] max-h-[150px] overflow-y-auto whitespace-pre-wrap break-words"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sprint-start">Start Date</Label>
                    <Input id="sprint-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sprint-end">End Date</Label>
                    <Input id="sprint-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" size="sm" onClick={resetForm}>Cancel</Button>
                  <Button size="sm" onClick={handleSave} disabled={!name.trim()}>
                    {editing ? 'Save Changes' : 'Create Sprint'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onClose() }}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
