export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'done'
export type TaskPriority = 'high' | 'medium' | 'low'
export type MemberRole = 'lead' | 'member'
export type ReferenceType = 'link' | 'image'
export type ActivityAction =
  | 'created' | 'status_changed' | 'priority_changed'
  | 'assigned' | 'unassigned' | 'comment'
  | 'dependency_added' | 'dependency_removed'
  | 'blocked' | 'unblocked' | 'edited'

export interface Team {
  id: string
  name: string
  created_at: string
}

export interface Member {
  id: string
  auth_user_id: string | null
  full_name: string
  email: string
  team_id: string
  role: MemberRole
  created_at: string
}

export interface Sprint {
  id: string
  number: number
  name: string
  goal: string | null
  start_date: string | null
  end_date: string | null
  deliverables: string[]
  key_activities: string[]
  created_at: string
}

export interface Task {
  id: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  sprint_id: string
  team_id: string
  assigned_by_id: string | null
  position: number
  is_blocked: boolean
  blocked_reason: string | null
  due_date: string | null
  created_at: string
  updated_at: string
}

export interface TaskInsert {
  title: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  sprint_id: string
  team_id: string
  assigned_by_id?: string | null
  position?: number
  is_blocked?: boolean
  blocked_reason?: string | null
  due_date?: string | null
}

export interface TaskUpdate {
  id: string
  title?: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  sprint_id?: string
  team_id?: string
  assigned_by_id?: string | null
  position?: number
  is_blocked?: boolean
  blocked_reason?: string | null
  due_date?: string | null
}

export interface TaskAssignee {
  id: string
  task_id: string
  member_id: string
  description: string
  created_at: string
}

export interface TaskAssigneeInsert {
  task_id: string
  member_id: string
  description?: string
}

export interface TaskDependency {
  id: string
  blocking_task_id: string
  waiting_task_id: string
  created_at: string
}

export interface TaskReference {
  id: string
  task_id: string
  label: string
  url: string
  type: ReferenceType
  created_by: string | null
  created_at: string
}

export interface TaskReferenceInsert {
  task_id: string
  label: string
  url: string
  type?: ReferenceType
  created_by?: string | null
}

export interface ActivityLog {
  id: string
  task_id: string | null
  actor_id: string | null
  action: ActivityAction
  detail: Record<string, unknown>
  created_at: string
}

export interface ActivityLogInsert {
  task_id?: string | null
  actor_id?: string | null
  action: ActivityAction
  detail?: Record<string, unknown>
}

export interface Comment {
  id: string
  task_id: string
  author_id: string
  body: string
  created_at: string
  updated_at: string
}

export interface CommentInsert {
  task_id: string
  author_id: string
  body: string
}

export interface ProjectSetting {
  key: string
  value: unknown
  updated_at: string
}

export interface Database {
  public: {
    Tables: {
      teams: { Row: Team; Insert: Omit<Team, 'id' | 'created_at'>; Update: Partial<Omit<Team, 'id'>> }
      members: { Row: Member; Insert: Omit<Member, 'id' | 'created_at'>; Update: Partial<Omit<Member, 'id'>> }
      sprints: { Row: Sprint; Insert: Omit<Sprint, 'id' | 'created_at'>; Update: Partial<Omit<Sprint, 'id'>> }
      tasks: { Row: Task; Insert: TaskInsert; Update: Partial<Omit<Task, 'id' | 'created_at' | 'updated_at'>> }
      task_assignees: { Row: TaskAssignee; Insert: TaskAssigneeInsert; Update: Partial<Omit<TaskAssignee, 'id' | 'created_at'>> }
      task_references: { Row: TaskReference; Insert: TaskReferenceInsert; Update: Partial<Omit<TaskReference, 'id' | 'created_at'>> }
      task_dependencies: { Row: TaskDependency; Insert: Omit<TaskDependency, 'id' | 'created_at'>; Update: never }
      activity_log: { Row: ActivityLog; Insert: ActivityLogInsert; Update: never }
      comments: { Row: Comment; Insert: CommentInsert; Update: Partial<Pick<Comment, 'body'>> }
      project_settings: { Row: ProjectSetting; Insert: ProjectSetting; Update: Partial<Pick<ProjectSetting, 'value'>> }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
