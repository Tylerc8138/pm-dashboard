import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Badge } from '@/components/ui/badge'
import { useTeams } from '@/hooks/use-teams'
import { useMembers } from '@/hooks/use-members'
import { AlertCircle, GripVertical } from 'lucide-react'
import type { Task } from '@/types/database'

interface TaskCardProps {
  task: Task
  isOverlay?: boolean
  onClick?: () => void
}

const TEAM_COLORS: Record<string, string> = {
  PM: 'bg-purple-100 text-purple-700',
  Product: 'bg-blue-100 text-blue-700',
  Marketing: 'bg-green-100 text-green-700',
  Comms: 'bg-orange-100 text-orange-700',
  Legal: 'bg-red-100 text-red-700',
  'Search Strategy': 'bg-teal-100 text-teal-700',
}

export function TaskCard({ task, isOverlay, onClick }: TaskCardProps) {
  const { data: teams } = useTeams()
  const { data: members } = useMembers()

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const team = teams?.find((t) => t.id === task.team_id)
  const owner = members?.find((m) => m.id === task.owner_id)

  return (
    <div
      ref={!isOverlay ? setNodeRef : undefined}
      style={!isOverlay ? style : undefined}
      className={`group cursor-pointer rounded-lg border bg-white p-3 shadow-sm hover:shadow-md transition-shadow ${
        isOverlay ? 'shadow-lg rotate-2' : ''
      } ${task.is_blocked ? 'border-l-4 border-l-destructive' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug line-clamp-2">{task.title}</p>
        </div>
        <div
          {...attributes}
          {...listeners}
          className="mt-0.5 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {team && (
          <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${TEAM_COLORS[team.name] ?? ''}`}>
            {team.name}
          </Badge>
        )}
        {task.story_points != null && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {task.story_points} SP
          </Badge>
        )}
        {task.is_blocked && (
          <AlertCircle className="h-3.5 w-3.5 text-destructive" />
        )}
      </div>

      {owner && (
        <div className="mt-2 flex items-center gap-1.5">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[9px] font-medium">
            {owner.full_name.split(' ').map((n) => n[0]).join('')}
          </div>
          <span className="text-xs text-muted-foreground">{owner.full_name}</span>
        </div>
      )}
    </div>
  )
}
