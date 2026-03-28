import { useCurrentMember } from '@/hooks/use-current-member'
import { useTeams } from '@/hooks/use-teams'
import { PmCommandCenter } from './pm-command-center'
import { CommsPortal } from './comms-portal'
import { LegalPortal } from './legal-portal'
import { MarketingPortal } from './marketing-portal'
import { SearchPortal } from './search-portal'
import { ProductPortal } from './product-portal'
import type { Task } from '@/types/database'

// Tyler Cheung has PM-level access (master view) even though he's on the Product team
const PM_OVERRIDE_EMAILS = ['tylerxcheung@gmail.com', 'tylcheun@visa.com']

interface MyViewProps {
  onEditTask: (task: Task) => void
}

export function MyView({ onEditTask }: MyViewProps) {
  const { data: member, isLoading: memberLoading } = useCurrentMember()
  const { data: teams = [], isLoading: teamsLoading } = useTeams()

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

  if (teamName === 'PM' || hasPmOverride) {
    return <PmCommandCenter onEditTask={onEditTask} />
  }

  switch (teamName) {
    case 'Comms':
      return <CommsPortal teamId={member.team_id} onEditTask={onEditTask} />
    case 'Legal':
      return <LegalPortal teamId={member.team_id} onEditTask={onEditTask} />
    case 'Marketing':
      return <MarketingPortal teamId={member.team_id} onEditTask={onEditTask} />
    case 'Search Strategy':
      return <SearchPortal teamId={member.team_id} onEditTask={onEditTask} />
    case 'Product':
      return <ProductPortal teamId={member.team_id} onEditTask={onEditTask} />
    default:
      return <ProductPortal teamId={member.team_id} onEditTask={onEditTask} />
  }
}
