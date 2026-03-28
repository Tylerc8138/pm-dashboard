import { useAuth } from '@/contexts/auth-context'
import { useCurrentMember } from '@/hooks/use-current-member'
import { useSprints } from '@/hooks/use-sprints'
import { useTeams } from '@/hooks/use-teams'
import { useFilters } from '@/contexts/filter-context'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { LayoutGrid, Users, LogOut, ChevronDown } from 'lucide-react'

interface TopBarProps {
  view: 'kanban' | 'teams'
  onViewChange: (view: 'kanban' | 'teams') => void
}

export function TopBar({ view, onViewChange }: TopBarProps) {
  const { signOut } = useAuth()
  const { data: member } = useCurrentMember()
  const { data: sprints } = useSprints()
  const { data: teams } = useTeams()
  const { sprintId, setSprintId, teamId, setTeamId } = useFilters()

  return (
    <header className="flex items-center justify-between border-b bg-white px-6 py-3">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-primary-foreground text-sm font-bold">
            V
          </div>
          <h1 className="text-lg font-semibold">Visa CLI Dashboard</h1>
        </div>

        <div className="ml-4 flex items-center gap-1 rounded-lg bg-muted p-1">
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
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Select value={sprintId ?? 'all'} onValueChange={(v: string | null) => setSprintId(!v || v === 'all' ? null : v)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Sprints" />
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
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Teams" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Teams</SelectItem>
            {teams?.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm hover:bg-accent transition-colors cursor-pointer">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
              {member?.full_name?.split(' ').map(n => n[0]).join('') ?? '?'}
            </div>
            <span className="text-sm">{member?.full_name ?? 'Loading...'}</span>
            <ChevronDown className="h-3 w-3" />
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
