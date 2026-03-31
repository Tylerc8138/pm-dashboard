import { useAuth } from '@/contexts/auth-context'
import { useCurrentMember } from '@/hooks/use-current-member'
import { useSprints } from '@/hooks/use-sprints'
import { useTeams } from '@/hooks/use-teams'
import { useFilters } from '@/contexts/filter-context'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { LayoutGrid, Users, LogOut, ChevronDown, UserCircle, LinkIcon, Settings, Home } from 'lucide-react'

const PM_OVERRIDE_EMAILS = ['tylerxcheung@gmail.com', 'tylcheun@visa.com']

interface TopBarProps {
  view: 'kanban' | 'teams' | 'myview' | 'links' | 'overview'
  onViewChange: (view: 'kanban' | 'teams' | 'myview' | 'links' | 'overview') => void
  onManageSprints?: () => void
}

export function TopBar({ view, onViewChange, onManageSprints }: TopBarProps) {
  const { signOut } = useAuth()
  const { data: member } = useCurrentMember()
  const { data: sprints } = useSprints()
  const { data: teams } = useTeams()
  const { sprintId, setSprintId, teamId, setTeamId } = useFilters()

  const memberTeam = teams?.find(t => t.id === member?.team_id)
  const isPm = memberTeam?.name === 'PM' || (member?.email && PM_OVERRIDE_EMAILS.includes(member.email))

  const sprintLabel = sprintId
    ? sprints?.find((s) => s.id === sprintId)
      ? `Sprint ${sprints.find((s) => s.id === sprintId)!.number}: ${sprints.find((s) => s.id === sprintId)!.name}`
      : 'Loading...'
    : 'All Sprints'

  const teamLabel = teamId
    ? teams?.find((t) => t.id === teamId)?.name ?? 'Loading...'
    : 'All Teams'

  return (
    <header className="flex items-center justify-between border-b bg-white px-3 py-2 gap-3" style={{ fontSize: 'clamp(8px, 0.95vw, 14px)' }}>
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-primary text-primary-foreground font-bold" style={{ fontSize: '1em' }}>
            V
          </div>
          <h1 className="font-semibold whitespace-nowrap" style={{ fontSize: '1.2em' }}>Visa AEO Dashboard</h1>
        </div>

        <div className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5 shrink-0">
          <Button
            variant={view === 'overview' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('overview')}
            className="gap-1.5"
          >
            <Home className="h-4 w-4" />
            Overview
          </Button>
          <Button
            variant={view === 'myview' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('myview')}
            className="gap-1.5"
          >
            <UserCircle className="h-4 w-4" />
            My View
          </Button>
          <Button
            variant={view === 'kanban' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('kanban')}
            className="gap-1.5"
          >
            <LayoutGrid className="h-4 w-4" />
            Board
          </Button>
          <Button
            variant={view === 'teams' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('teams')}
            className="gap-1.5"
          >
            <Users className="h-4 w-4" />
            Teams
          </Button>
          <Button
            variant={view === 'links' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('links')}
            className="gap-1.5"
          >
            <LinkIcon className="h-4 w-4" />
            Links
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Select value={sprintId ?? 'all'} onValueChange={(v: string | null) => setSprintId(!v || v === 'all' ? null : v)}>
          <SelectTrigger className="w-[12em]">
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

        <Select value={teamId ?? 'all'} onValueChange={(v: string | null) => setTeamId(!v || v === 'all' ? null : v)}>
          <SelectTrigger className="w-[10em]">
            <span className="truncate">{teamLabel}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Teams</SelectItem>
            {teams?.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isPm && onManageSprints && (
          <Button variant="outline" size="sm" onClick={onManageSprints} className="gap-1.5">
            <Settings className="h-3.5 w-3.5" />
            Sprints
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 hover:bg-accent transition-colors cursor-pointer">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-medium" style={{ fontSize: '0.75em' }}>
              {member?.full_name?.split(' ').map(n => n[0]).join('') ?? '?'}
            </div>
            <span className="whitespace-nowrap" style={{ fontSize: '1em' }}>{member?.full_name ?? '...'}</span>
            <ChevronDown className="h-3 w-3 shrink-0" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={signOut} className="gap-2">
              <LogOut className="h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
