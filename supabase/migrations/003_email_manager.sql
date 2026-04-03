-- ============================================================
-- 003_email_manager.sql — PM Email Manager tables
-- ============================================================

-- Email recipients (configurable list)
CREATE TABLE IF NOT EXISTS email_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  name text NOT NULL,
  team_id uuid REFERENCES teams(id),
  is_active boolean NOT NULL DEFAULT true,
  added_by uuid REFERENCES members(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_recipients_email ON email_recipients(email);

-- Email send history
CREATE TABLE IF NOT EXISTS email_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  body_html text NOT NULL,
  sent_by uuid REFERENCES members(id),
  recipient_count integer NOT NULL DEFAULT 0,
  recipients jsonb DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_email_history_created ON email_history(created_at DESC);

-- Email automation settings (stored in project_settings)
-- key: 'email_automation' → { enabled: bool, schedule: 'daily'|'weekly', day_of_week?: number }

-- RLS
ALTER TABLE email_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_history ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE tbl text; pol text;
BEGIN
  FOR tbl, pol IN VALUES
    ('email_recipients','auth_read'),('email_recipients','auth_write'),('email_recipients','auth_update'),('email_recipients','auth_delete'),
    ('email_history','auth_read'),('email_history','auth_write')
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol, tbl); END LOOP;
END $$;

CREATE POLICY "auth_read" ON email_recipients FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write" ON email_recipients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update" ON email_recipients FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete" ON email_recipients FOR DELETE TO authenticated USING (true);

CREATE POLICY "auth_read" ON email_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write" ON email_history FOR INSERT TO authenticated WITH CHECK (true);
