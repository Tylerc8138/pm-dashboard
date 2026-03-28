-- Teams
CREATE TABLE teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Members
CREATE TABLE members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid UNIQUE REFERENCES auth.users(id),
  full_name text NOT NULL,
  email text UNIQUE NOT NULL,
  team_id uuid NOT NULL REFERENCES teams(id),
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('lead', 'member')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Sprints
CREATE TABLE sprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number smallint NOT NULL UNIQUE CHECK (number > 0),
  name text NOT NULL,
  goal text,
  start_date date,
  end_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Tasks
CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  status text NOT NULL DEFAULT 'backlog' CHECK (status IN ('backlog', 'todo', 'in_progress', 'done')),
  story_points smallint CHECK (story_points >= 0),
  sprint_id uuid NOT NULL REFERENCES sprints(id),
  team_id uuid NOT NULL REFERENCES teams(id),
  owner_id uuid REFERENCES members(id),
  position integer NOT NULL DEFAULT 0,
  is_blocked boolean NOT NULL DEFAULT false,
  blocked_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_tasks_sprint_id ON tasks(sprint_id);
CREATE INDEX idx_tasks_team_id ON tasks(team_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_owner_id ON tasks(owner_id);
CREATE INDEX idx_tasks_sprint_status_position ON tasks(sprint_id, status, position);
CREATE INDEX idx_members_team_id ON members(team_id);
CREATE INDEX idx_members_auth_user_id ON members(auth_user_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
