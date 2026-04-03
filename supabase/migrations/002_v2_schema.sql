-- ============================================================
-- 002_v2_schema.sql  —  PM Dashboard V2
-- ============================================================

-- 1. Reconcile owner_id → assigned_by_id (code uses assigned_by_id)
ALTER TABLE tasks RENAME COLUMN owner_id TO assigned_by_id;
DROP INDEX IF EXISTS idx_tasks_owner_id;
CREATE INDEX idx_tasks_assigned_by_id ON tasks(assigned_by_id);

-- 2. Add priority column (code sends it; DB lacked it)
ALTER TABLE tasks ADD COLUMN priority text NOT NULL DEFAULT 'medium'
  CHECK (priority IN ('high', 'medium', 'low'));

-- 3. Add due_date column
ALTER TABLE tasks ADD COLUMN due_date date;

-- 4. Add sprint detail columns for dynamic overview
ALTER TABLE sprints ADD COLUMN deliverables jsonb DEFAULT '[]';
ALTER TABLE sprints ADD COLUMN key_activities jsonb DEFAULT '[]';

-- 5. Create task_assignees
CREATE TABLE task_assignees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(task_id, member_id)
);
CREATE INDEX idx_task_assignees_task ON task_assignees(task_id);
CREATE INDEX idx_task_assignees_member ON task_assignees(member_id);

-- 6. Create task_dependencies
CREATE TABLE task_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocking_task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  waiting_task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(blocking_task_id, waiting_task_id),
  CHECK (blocking_task_id != waiting_task_id)
);
CREATE INDEX idx_task_deps_blocking ON task_dependencies(blocking_task_id);
CREATE INDEX idx_task_deps_waiting ON task_dependencies(waiting_task_id);

-- 7. Create task_references
CREATE TABLE task_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  label text NOT NULL,
  url text NOT NULL,
  type text NOT NULL DEFAULT 'link' CHECK (type IN ('link', 'image')),
  created_by uuid REFERENCES members(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_task_refs_task ON task_references(task_id);

-- 8. Create activity_log
CREATE TABLE activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES members(id),
  action text NOT NULL,
  detail jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_activity_task ON activity_log(task_id);
CREATE INDEX idx_activity_actor ON activity_log(actor_id);
CREATE INDEX idx_activity_created ON activity_log(created_at DESC);

-- 9. Create comments
CREATE TABLE comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES members(id),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_comments_task ON comments(task_id);
CREATE TRIGGER comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 10. Create project_settings
CREATE TABLE project_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 11. RLS for all new tables
ALTER TABLE task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_settings ENABLE ROW LEVEL SECURITY;

-- Read policies (all authenticated)
CREATE POLICY "auth_read" ON task_assignees FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON task_dependencies FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON task_references FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON activity_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read" ON project_settings FOR SELECT TO authenticated USING (true);

-- Write policies (all authenticated — matches V1 permissive pattern)
CREATE POLICY "auth_write" ON task_assignees FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update" ON task_assignees FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete" ON task_assignees FOR DELETE TO authenticated USING (true);

CREATE POLICY "auth_write" ON task_dependencies FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update" ON task_dependencies FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete" ON task_dependencies FOR DELETE TO authenticated USING (true);

CREATE POLICY "auth_write" ON task_references FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update" ON task_references FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete" ON task_references FOR DELETE TO authenticated USING (true);

CREATE POLICY "auth_write" ON activity_log FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_write" ON comments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update" ON comments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete" ON comments FOR DELETE TO authenticated USING (true);

CREATE POLICY "auth_write" ON project_settings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update" ON project_settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 12. Realtime for collaborative tables
ALTER PUBLICATION supabase_realtime ADD TABLE task_assignees;
ALTER PUBLICATION supabase_realtime ADD TABLE task_dependencies;
ALTER PUBLICATION supabase_realtime ADD TABLE comments;

-- 13. Seed project_settings with defaults
INSERT INTO project_settings (key, value) VALUES
  ('north_star', '{"title": "North Star", "description": "Get Vibe Coders & Developers to discover, understand, and adopt Visa'\''s Agentic Commerce capabilities"}'::jsonb),
  ('plan_enables', '["Technical foundation for agentic commerce", "Developer community engagement", "Clear documentation and onboarding paths", "Cross-team alignment on launch milestones"]'::jsonb),
  ('key_metrics', '[{"category": "Awareness", "metrics": ["Developer signups", "Documentation views", "Event attendance", "Social mentions"]}, {"category": "Adoption", "metrics": ["API integrations", "Active developers", "Transaction volume", "Partner implementations"]}, {"category": "Engagement", "metrics": ["Docs completion rate", "Support tickets", "Community contributions", "Repeat usage"]}]'::jsonb);
