import { useCurrentMember } from '@/hooks/use-current-member'
import { useTeams } from '@/hooks/use-teams'
import { useSprints } from '@/hooks/use-sprints'
import { useFilters } from '@/contexts/filter-context'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { PmCommandCenter } from './pm-command-center'
import { CommsPortal } from './comms-portal'
import { LegalPortal } from './legal-portal'
import { MarketingPortal } from './marketing-portal'
import { SearchPortal } from './search-portal'
import { ProductPortal } from './product-portal'
import type { Task } from '@/types/database'

const PM_OVERRIDE_EMAILS = ['tylerxcheung@gmail.com', 'tylcheun@visa.com']

interface MyViewProps {
  onEditTask: (task: Task) => void
}

export function MyView({ onEditTask }: MyViewProps) {
  const { data: member, isLoading: memberLoading } = useCurrentMember()
  const { data: teams = [], isLoading: teamsLoading } = useTeams()
  const { data: sprints } = useSprints()
  const { sprintId, setSprintId } = useFilters()

  const sprintLabel = sprintId
    ? sprints?.find((s) => s.id === sprintId)
      ? `Sprint ${sprints.find((s) => s.id === sprintId)!.number}: ${sprints.find((s) => s.id === sprintId)!.name}`
      : 'Loading...'
    : 'All Sprints'

  if (memberLoading || teamsLoading) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Loading your portal...
      </div>
    )
  }

  if (!member) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Your account is not linked to a team member. Contact the PM.
      </div>
    )
  }

  const team = teams.find((t) => t.id === member.team_id)
  const teamName = team?.name ?? ''
  const hasPmOverride = PM_OVERRIDE_EMAILS.includes(member.email)
  const isPm = teamName === 'PM' || hasPmOverride

  const renderPortal = () => {
    if (isPm) return <PmCommandCenter onEditTask={onEditTask} />
    switch (teamName) {
      case 'Comms': return <CommsPortal teamId={member.team_id} onEditTask={onEditTask} />
      case 'Legal': return <LegalPortal teamId={member.team_id} onEditTask={onEditTask} />
      case 'Marketing': return <MarketingPortal teamId={member.team_id} onEditTask={onEditTask} />
      case 'Search Strategy': return <SearchPortal teamId={member.team_id} onEditTask={onEditTask} />
      case 'Product': return <ProductPortal teamId={member.team_id} onEditTask={onEditTask} />
      default: return <ProductPortal teamId={member.team_id} onEditTask={onEditTask} />
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Inline sprint filter */}
      <div className="flex items-center justify-between border-b bg-muted/30 px-6 py-2">
        <p className="text-sm font-medium text-muted-foreground">
          {isPm ? 'PM Command Center' : `${teamName} Tasks`}
        </p>
        <Select value={sprintId ?? 'all'} onValueChange={(v: string | null) => setSprintId(!v || v === 'all' ? null : v)}>
          <SelectTrigger className="w-[200px] h-8 text-sm">
            <span className="truncate">{sprintLabel}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sprints</SelectItem>
            {sprints?.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                Sprint {s.number}: {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Portal content */}
      <div className="flex-1 overflow-auto">
        {renderPortal()}
      </div>
    </div>
  )
}
