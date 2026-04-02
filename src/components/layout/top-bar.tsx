import { useAuth } from '@/contexts/auth-context'
import { useCurrentMember } from '@/hooks/use-current-member'
import { useTeams } from '@/hooks/use-teams'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { LayoutGrid, LogOut, ChevronDown, UserCircle, LinkIcon, Settings, Home, CalendarDays } from 'lucide-react'

const PM_OVERRIDE_EMAILS = ['tylerxcheung@gmail.com', 'tylcheun@visa.com']

export type ViewType = 'overview' | 'myview' | 'alltasks' | 'links' | 'calendar'

interface TopBarProps {
  view: ViewType
  onViewChange: (view: ViewType) => void
  onManageSprints?: () => void
}

export function TopBar({ view, onViewChange, onManageSprints }: TopBarProps) {
  const { signOut } = useAuth()
  const { data: member } = useCurrentMember()
  const { data: teams } = useTeams()

  const memberTeam = teams?.find(t => t.id === member?.team_id)
  const isPm = memberTeam?.name === 'PM' || (member?.email && PM_OVERRIDE_EMAILS.includes(member.email))

  return (
    <header className="flex items-center justify-between border-b bg-white px-4 py-2 gap-4" style={{ fontSize: 'clamp(9px, 1vw, 14px)' }}>
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
            Project Overview
          </Button>
          <Button
            variant={view === 'myview' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('myview')}
            className="gap-1.5"
          >
            <UserCircle className="h-4 w-4" />
            My Tasks
          </Button>
          <Button
            variant={view === 'alltasks' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('alltasks')}
            className="gap-1.5"
          >
            <LayoutGrid className="h-4 w-4" />
            All Tasks
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
          <Button
            variant={view === 'calendar' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('calendar')}
            className="gap-1.5"
          >
            <CalendarDays className="h-4 w-4" />
            Calendar
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
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
