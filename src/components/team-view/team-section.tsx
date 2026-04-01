import { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MemberRow } from './member-row'
import { HealthIndicator, type MemberHealth } from './health-indicator'
import { useAllAssignees } from '@/hooks/use-assignees'
import type { Team, Member, Task } from '@/types/database'

interface TeamSectionProps {
  team: Team
  members: Member[]
  tasks: Task[]
  onEditTask: (task: Task) => void
}

export function TeamSection({ team, members, tasks, onEditTask }: TeamSectionProps) {
  const { data: allAssignees = [] } = useAllAssignees()

  const totalTasks = tasks.length
  const doneTasks = tasks.filter((t) => t.status === 'done').length
  const blockedCount = tasks.filter((t) => t.is_blocked).length
  const highPriority = tasks.filter((t) => t.priority === 'high' && t.status !== 'done').length

  const teamHealth = useMemo((): MemberHealth => {
    if (blockedCount > 0) return 'blocked'
    if (totalTasks === 0) return 'idle'
    const progress = totalTasks > 0 ? doneTasks / totalTasks : 0
    if (progress >= 0.5) return 'on_track'
    return 'heavy'
  }, [blockedCount, totalTasks, doneTasks])

  // Get tasks assigned to each member via task_assignees
  const getMemberTasks = (memberId: string) => {
    const assignedTaskIds = allAssignees
      .filter((a) => a.member_id === memberId)
      .map((a) => a.task_id)
    return tasks.filter((t) => assignedTaskIds.includes(t.id))
  }

  // Unassigned = tasks with no assignees at all
  const assignedTaskIds = new Set(allAssignees.filter((a) => tasks.some((t) => t.id === a.task_id)).map((a) => a.task_id))
  const unassignedTasks = tasks.filter((t) => !assignedTaskIds.has(t.id))

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <CardTitle className="text-base">{team.name}</CardTitle>
            <Badge variant="secondary" className="text-xs">
              {members.length} {members.length === 1 ? 'member' : 'members'}
            </Badge>
            <HealthIndicator health={teamHealth} />
          </div>
          <div className="flex flex-wrap items-center gap-2 md:gap-4 text-sm text-muted-foreground">
            <span>{doneTasks}/{totalTasks} tasks done</span>
            {highPriority > 0 && (
              <Badge variant="secondary" className="text-xs bg-red-100 text-red-700">
                {highPriority} high priority
              </Badge>
            )}
            {blockedCount > 0 && (
              <Badge variant="destructive" className="text-xs">{blockedCount} blocked</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        {members.map((member) => (
          <MemberRow key={member.id} member={member} tasks={getMemberTasks(member.id)} onEditTask={onEditTask} />
        ))}
        {unassignedTasks.length > 0 && (
          <MemberRow member={null} tasks={unassignedTasks} onEditTask={onEditTask} />
        )}
      </CardContent>
    </Card>
  )
}
