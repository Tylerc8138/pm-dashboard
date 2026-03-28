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
  const totalPoints = tasks.reduce((sum, t) => sum + (t.story_points ?? 0), 0)
  const donePoints = tasks.filter((t) => t.status === 'done').reduce((sum, t) => sum + (t.story_points ?? 0), 0)
  const blockedCount = tasks.filter((t) => t.is_blocked).length

  const teamHealth = useMemo((): MemberHealth => {
    if (blockedCount > 0) return 'blocked'
    if (totalPoints === 0) return 'idle'
    const progress = totalPoints > 0 ? donePoints / totalPoints : 0
    if (progress >= 0.5) return 'on_track'
    return 'heavy'
  }, [blockedCount, totalPoints, donePoints])

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base">{team.name}</CardTitle>
            <Badge variant="secondary" className="text-xs">
              {members.length} {members.length === 1 ? 'member' : 'members'}
            </Badge>
            <HealthIndicator health={teamHealth} />
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{donePoints}/{totalPoints} SP completed</span>
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
        {/* Unassigned tasks */}
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
