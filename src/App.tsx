import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { FilterProvider } from '@/contexts/filter-context'
import { TopBar, type ViewType } from '@/components/layout/top-bar'
import { AllTasksPage } from '@/components/all-tasks/all-tasks-page'
import { TaskDialog } from '@/components/tasks/task-dialog'
import { MyView } from '@/components/my-view/my-view'
import { LinksView } from '@/components/links/links-view'
import { CalendarPage } from '@/components/calendar/calendar-page'
import { OverviewPage } from '@/components/overview/overview-page'
import { EmailManager } from '@/components/email/email-manager'
import { SprintManager } from '@/components/sprints/sprint-manager'
import { LoginPage } from '@/pages/login'
import { GatePage } from '@/pages/gate'
import { useRealtime } from '@/hooks/use-realtime'
import { useCurrentMember } from '@/hooks/use-current-member'
import { useTeams } from '@/hooks/use-teams'
import type { Task, TaskStatus } from '@/types/database'

const PM_OVERRIDE_EMAILS = ['tylerxcheung@gmail.com', 'tylcheun@visa.com']

function Dashboard() {
  const { data: member } = useCurrentMember()
  const { data: teams } = useTeams()

  // Determine default view based on role
  const memberTeam = teams?.find(t => t.id === member?.team_id)
  const isPm = memberTeam?.name === 'PM' || (member?.email && PM_OVERRIDE_EMAILS.includes(member.email))

  const [view, setView] = useState<ViewType | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>('todo')
  const [sprintManagerOpen, setSprintManagerOpen] = useState(false)

  // Set default view once we know the user's role
  useEffect(() => {
    if (view === null && member && teams) {
      setView(isPm ? 'overview' : 'myview')
    }
  }, [member, teams, isPm, view])

  useRealtime()

  const handleEditTask = (task: Task) => {
    setEditingTask(task)
    setDialogOpen(true)
  }

  const handleNewTask = (status: TaskStatus) => {
    setEditingTask(null)
    setDefaultStatus(status)
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingTask(null)
  }

  // Show loading while determining default view
  if (!view) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <FilterProvider>
      <div className="flex h-screen flex-col overflow-hidden">
        <TopBar view={view} onViewChange={setView} onManageSprints={() => setSprintManagerOpen(true)} />
        <main className="flex-1 overflow-auto">
          {view === 'overview' ? (
            <OverviewPage />
          ) : view === 'myview' ? (
            <MyView onEditTask={handleEditTask} />
          ) : view === 'alltasks' ? (
            <AllTasksPage onEditTask={handleEditTask} onNewTask={handleNewTask} />
          ) : view === 'calendar' ? (
            <CalendarPage />
          ) : view === 'email' ? (
            <EmailManager />
          ) : (
            <LinksView onEditTask={handleEditTask} />
          )}
        </main>
        <TaskDialog
          open={dialogOpen}
          onClose={handleCloseDialog}
          task={editingTask}
          defaultStatus={defaultStatus}
        />
        <SprintManager
          open={sprintManagerOpen}
          onClose={() => setSprintManagerOpen(false)}
        />
      </div>
    </FilterProvider>
  )
}

export default function App() {
  const { user, loading } = useAuth()
  const [gatePassed, setGatePassed] = useState(
    () => localStorage.getItem('dashboard_gate') === 'passed'
  )

  if (!gatePassed) {
    return <GatePage onSuccess={() => setGatePassed(true)} />
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!user) return <LoginPage />

  return <Dashboard />
}
