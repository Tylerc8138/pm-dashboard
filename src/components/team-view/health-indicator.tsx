import type { Task } from '@/types/database'

export type MemberHealth = 'on_track' | 'heavy' | 'overloaded' | 'blocked' | 'idle'

const HEALTH_CONFIG: Record<MemberHealth, { color: string; label: string }> = {
  on_track: { color: 'bg-green-500', label: 'On Track' },
  heavy: { color: 'bg-amber-500', label: 'Heavy' },
  overloaded: { color: 'bg-red-500', label: 'Overloaded' },
  blocked: { color: 'bg-purple-500', label: 'Blocked' },
  idle: { color: 'bg-gray-400', label: 'Idle' },
}

export function getMemberHealth(tasks: Task[]): MemberHealth {
  const activeTasks = tasks.filter((t) => t.status !== 'done')
  const totalSP = activeTasks.reduce((sum, t) => sum + (t.story_points ?? 0), 0)
  const hasBlocked = activeTasks.some((t) => t.is_blocked)

  if (hasBlocked) return 'blocked'
  if (activeTasks.length === 0) return 'idle'
  if (totalSP > 13) return 'overloaded'
  if (totalSP > 8) return 'heavy'
  return 'on_track'
}

interface HealthIndicatorProps {
  health: MemberHealth
  size?: 'sm' | 'md'
}

export function HealthIndicator({ health, size = 'md' }: HealthIndicatorProps) {
  const config = HEALTH_CONFIG[health]
  const dotSize = size === 'sm' ? 'h-1.5 w-1.5' : 'h-2 w-2'
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs'

  return (
    <div className="flex items-center gap-1">
      <div className={`${dotSize} rounded-full ${config.color}`} />
      <span className={`${textSize} text-muted-foreground`}>{config.label}</span>
    </div>
  )
}
