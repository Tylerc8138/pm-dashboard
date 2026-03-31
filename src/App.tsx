import { useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { FilterProvider } from '@/contexts/filter-context'
import { TopBar } from '@/components/layout/top-bar'
import { KanbanBoard } from '@/components/kanban/kanban-board'
import { TeamView } from '@/components/team-view/team-view'
import { TaskDialog } from '@/components/tasks/task-dialog'
import { MyView } from '@/components/my-view/my-view'
import { LinksView } from '@/components/links/links-view'
import { OverviewPage } from '@/components/overview/overview-page'
import { SprintManager } from '@/components/sprints/sprint-manager'
import { LoginPage } from '@/pages/login'
import { GatePage } from '@/pages/gate'
import { useRealtime } from '@/hooks/use-realtime'
import type { Task, TaskStatus } from '@/types/database'

function Dashboard() {
  const [view, setView] = useState<'kanban' | 'teams' | 'myview' | 'links' | 'overview'>('overview')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>('todo')
  const [sprintManagerOpen, setSprintManagerOpen] = useState(false)

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

  return (
    <FilterProvider>
      <div className="flex h-screen flex-col overflow-hidden">
        <TopBar view={view} onViewChange={setView} onManageSprints={() => setSprintManagerOpen(true)} />
        <main className="flex-1 overflow-auto">
          {view === 'overview' ? (
            <OverviewPage />
          ) : view === 'myview' ? (
            <MyView onEditTask={handleEditTask} />
          ) : view === 'kanban' ? (
            <KanbanBoard onEditTask={handleEditTask} onNewTask={handleNewTask} />
          ) : view === 'links' ? (
            <LinksView onEditTask={handleEditTask} />
          ) : (
            <TeamView onEditTask={handleEditTask} />
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
