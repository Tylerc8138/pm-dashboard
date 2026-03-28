export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'done'
export type MemberRole = 'lead' | 'member'

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
  created_at: string
}

export interface Task {
  id: string
  title: string
  description: string
  status: TaskStatus
  story_points: number | null
  sprint_id: string
  team_id: string
  owner_id: string | null
  position: number
  is_blocked: boolean
  blocked_reason: string | null
  created_at: string
  updated_at: string
}

export interface TaskInsert {
  title: string
  description?: string
  status?: TaskStatus
  story_points?: number | null
  sprint_id: string
  team_id: string
  owner_id?: string | null
  position?: number
  is_blocked?: boolean
  blocked_reason?: string | null
}

export interface TaskUpdate {
  id: string
  title?: string
  description?: string
  status?: TaskStatus
  story_points?: number | null
  sprint_id?: string
  team_id?: string
  owner_id?: string | null
  position?: number
  is_blocked?: boolean
  blocked_reason?: string | null
}

export interface Database {
  public: {
    Tables: {
      teams: { Row: Team; Insert: Omit<Team, 'id' | 'created_at'>; Update: Partial<Omit<Team, 'id'>> }
      members: { Row: Member; Insert: Omit<Member, 'id' | 'created_at'>; Update: Partial<Omit<Member, 'id'>> }
      sprints: { Row: Sprint; Insert: Omit<Sprint, 'id' | 'created_at'>; Update: Partial<Omit<Sprint, 'id'>> }
      tasks: { Row: Task; Insert: TaskInsert; Update: Partial<Omit<Task, 'id' | 'created_at' | 'updated_at'>> }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
