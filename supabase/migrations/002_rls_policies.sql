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
