import { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MemberRow } from './member-row'
import { HealthIndicator, type MemberHealth } from './health-indicator'
import type { Team, Member, Task } from '@/types/database'

interface TeamSectionProps {
  team: Team
  members: Member[]
  tasks: Task[]
  onEditTask: (task: Task) => void
}

export function TeamSection({ team, members, tasks, onEditTask }: TeamSectionProps) {
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
              <Badge variant="destructive" className="text-xs">
                {blockedCount} blocked
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        {members.map((member) => (
          <MemberRow
            key={member.id}
            member={member}
            tasks={tasks.filter((t) => t.owner_id === member.id)}
            onEditTask={onEditTask}
          />
        ))}
        {tasks.filter((t) => !t.owner_id).length > 0 && (
          <MemberRow
            member={null}
            tasks={tasks.filter((t) => !t.owner_id)}
            onEditTask={onEditTask}
          />
        )}
      </CardContent>
    </Card>
  )
}
