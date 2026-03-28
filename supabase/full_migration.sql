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
-- Enable RLS on all tables
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Teams: read-only for all authenticated users
CREATE POLICY "Authenticated users can read teams"
  ON teams FOR SELECT TO authenticated USING (true);

-- Members: read for all, update own profile only
CREATE POLICY "Authenticated users can read members"
  ON members FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own member record"
  ON members FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid());

-- Sprints: read-only for all
CREATE POLICY "Authenticated users can read sprints"
  ON sprints FOR SELECT TO authenticated USING (true);

-- Tasks: everyone reads, team members manage their own team's tasks
CREATE POLICY "Authenticated users can read all tasks"
  ON tasks FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create tasks for their team"
  ON tasks FOR INSERT TO authenticated
  WITH CHECK (
    team_id IN (SELECT m.team_id FROM members m WHERE m.auth_user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM members m JOIN teams t ON m.team_id = t.id
      WHERE m.auth_user_id = auth.uid() AND t.name = 'PM'
    )
  );

CREATE POLICY "Users can update their team tasks"
  ON tasks FOR UPDATE TO authenticated
  USING (
    team_id IN (SELECT m.team_id FROM members m WHERE m.auth_user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM members m JOIN teams t ON m.team_id = t.id
      WHERE m.auth_user_id = auth.uid() AND t.name = 'PM'
    )
  );

CREATE POLICY "Users can delete their team tasks"
  ON tasks FOR DELETE TO authenticated
  USING (
    team_id IN (SELECT m.team_id FROM members m WHERE m.auth_user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM members m JOIN teams t ON m.team_id = t.id
      WHERE m.auth_user_id = auth.uid() AND t.name = 'PM'
    )
  );

-- Enable realtime on tasks
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
-- Seed Teams
INSERT INTO teams (id, name) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'PM'),
  ('a1000000-0000-0000-0000-000000000002', 'Product'),
  ('a1000000-0000-0000-0000-000000000003', 'Marketing'),
  ('a1000000-0000-0000-0000-000000000004', 'Comms'),
  ('a1000000-0000-0000-0000-000000000005', 'Legal'),
  ('a1000000-0000-0000-0000-000000000006', 'Search Strategy');

-- Seed Members
INSERT INTO members (id, full_name, email, team_id, role) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'Robbie Richards', 'robbie.richards@visa.com', 'a1000000-0000-0000-0000-000000000001', 'lead'),
  ('b1000000-0000-0000-0000-000000000002', 'Tyler Cheung', 'tyler.cheung@visa.com', 'a1000000-0000-0000-0000-000000000002', 'lead'),
  ('b1000000-0000-0000-0000-000000000003', 'Dominic Silk', 'dominic.silk@visa.com', 'a1000000-0000-0000-0000-000000000002', 'member'),
  ('b1000000-0000-0000-0000-000000000004', 'Tanvi Bajaj', 'tanvi.bajaj@visa.com', 'a1000000-0000-0000-0000-000000000002', 'member'),
  ('b1000000-0000-0000-0000-000000000005', 'Marketing Lead', 'marketing.lead@visa.com', 'a1000000-0000-0000-0000-000000000003', 'lead'),
  ('b1000000-0000-0000-0000-000000000006', 'Katie Zeiser', 'katie.zeiser@visa.com', 'a1000000-0000-0000-0000-000000000004', 'lead'),
  ('b1000000-0000-0000-0000-000000000007', 'Cecelia Tamsen', 'cecelia.tamsen@visa.com', 'a1000000-0000-0000-0000-000000000004', 'member'),
  ('b1000000-0000-0000-0000-000000000008', 'Tuesday Uhland', 'tuesday.uhland@visa.com', 'a1000000-0000-0000-0000-000000000004', 'member'),
  ('b1000000-0000-0000-0000-000000000009', 'May Liao', 'may.liao@visa.com', 'a1000000-0000-0000-0000-000000000005', 'lead'),
  ('b1000000-0000-0000-0000-000000000010', 'Jay Matta', 'jay.matta@visa.com', 'a1000000-0000-0000-0000-000000000006', 'lead'),
  ('b1000000-0000-0000-0000-000000000011', 'Alex Steinhart', 'alex.steinhart@visa.com', 'a1000000-0000-0000-0000-000000000006', 'member');

-- Seed Sprints
INSERT INTO sprints (id, number, name, goal, start_date, end_date) VALUES
  ('c1000000-0000-0000-0000-000000000001', 1, 'Foundation', 'Establish infrastructure. Every team has tooling set up, backlog populated, and first content assets in Legal review.', '2026-03-30', '2026-04-10'),
  ('c1000000-0000-0000-0000-000000000002', 2, 'Publish & Amplify', 'First wave of content live. Developer quickstart published, landing page live, first press release out.', '2026-04-13', '2026-04-24'),
  ('c1000000-0000-0000-0000-000000000003', 3, 'Scale & Optimize', 'Double down on what works. Scale content production, activate DevRel, optimize based on early data.', '2026-04-27', '2026-05-08');

-- Seed Tasks from Source of Truth Sprint Roadmap

-- Sprint 1 Tasks
INSERT INTO tasks (title, description, status, story_points, sprint_id, team_id, owner_id, position) VALUES
  ('Kick off project, publish Source of Truth, set up project board', '', 'in_progress', 5, 'c1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 1000),
  ('Polish GitHub README, add contributing guide and license', '', 'todo', 3, 'c1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000002', 1000),
  ('Draft Visa CLI quickstart tutorial (install + first payment)', '', 'todo', 8, 'c1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000002', 2000),
  ('Draft developer-focused content strategy', '', 'todo', 5, 'c1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000005', 1000),
  ('Build Sprint 1-3 content calendar', '', 'todo', 3, 'c1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000005', 2000),
  ('Deliver GEO/AEO keyword cluster map (100+ target queries)', '', 'todo', 8, 'c1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000006', 'b1000000-0000-0000-0000-000000000010', 1000),
  ('Provide content brief for first long-form guide', '', 'todo', 5, 'c1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000006', 'b1000000-0000-0000-0000-000000000010', 2000),
  ('Draft first press release: Visa Launches CLI for AI Agents', '', 'todo', 5, 'c1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000006', 1000),
  ('Review landing page copy + press release draft', '', 'todo', 3, 'c1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000009', 1000),

-- Sprint 2 Tasks
  ('Publish quickstart tutorial to GitHub and developer portal', '', 'backlog', 5, 'c1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000002', 1000),
  ('Submit Visa CLI to additional MCP registries', '', 'backlog', 3, 'c1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000002', 2000),
  ('Publish developer landing page (post Legal approval)', '', 'backlog', 3, 'c1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000005', 1000),
  ('Launch social campaign: LinkedIn, X, Dev.to', '', 'backlog', 5, 'c1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000005', 2000),
  ('Draft long-form guide: How to Build an AI Payment Agent with Visa CLI', '', 'backlog', 8, 'c1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000005', 3000),
  ('Distribute press release, brief 5 target journalists', '', 'backlog', 5, 'c1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000006', 1000),
  ('Draft exec byline: The Future of Agentic Commerce', '', 'backlog', 5, 'c1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000006', 2000),
  ('Implement JSON-LD schema on developer portal pages', '', 'backlog', 8, 'c1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000006', 'b1000000-0000-0000-0000-000000000010', 1000),
  ('Baseline LLM citation report', '', 'backlog', 5, 'c1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000006', 'b1000000-0000-0000-0000-000000000010', 2000),
  ('Review long-form guide draft', '', 'backlog', 3, 'c1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000009', 1000),

-- Sprint 3 Tasks
  ('Publish 3 additional code examples (e-commerce, travel, subscriptions)', '', 'backlog', 8, 'c1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000002', 1000),
  ('Create video walkthrough of Visa CLI setup', '', 'backlog', 5, 'c1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000002', 2000),
  ('Publish long-form guide (post Legal approval)', '', 'backlog', 3, 'c1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000005', 1000),
  ('Activate DevRel program: onboard 2 developer advocates', '', 'backlog', 8, 'c1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000005', 2000),
  ('Draft 3 supporting blog posts based on GEO keyword clusters', '', 'backlog', 8, 'c1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000005', 3000),
  ('Secure 2 earned media placements', '', 'backlog', 5, 'c1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000006', 1000),
  ('Submit exec byline to target publication', '', 'backlog', 3, 'c1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000006', 2000),
  ('Sprint 2 vs Sprint 3 LLM citation delta report', '', 'backlog', 5, 'c1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000006', 'b1000000-0000-0000-0000-000000000010', 1000),
  ('Optimize underperforming content based on SERP data', '', 'backlog', 5, 'c1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000006', 'b1000000-0000-0000-0000-000000000010', 2000),
  ('Review 3 blog posts batch submission', '', 'backlog', 5, 'c1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000009', 1000);
