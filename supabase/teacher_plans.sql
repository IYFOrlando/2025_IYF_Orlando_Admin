-- Teacher Plans table (migrated from Firebase teacher_plans collection)
-- Stores daily tasks and events for teacher planner feature

CREATE TABLE IF NOT EXISTS teacher_plans (
  id TEXT PRIMARY KEY,                        -- format: "{email}_{MM-dd-yyyy}"
  date TEXT NOT NULL,                         -- format: "MM-dd-yyyy"
  teacher_email TEXT NOT NULL,
  tasks JSONB NOT NULL DEFAULT '[]'::jsonb,   -- Array of { id, text, completed }
  events JSONB NOT NULL DEFAULT '[]'::jsonb,  -- Array of { id, time, title }
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_teacher_plans_email ON teacher_plans(teacher_email);
CREATE INDEX IF NOT EXISTS idx_teacher_plans_date ON teacher_plans(date);

-- RLS
ALTER TABLE teacher_plans ENABLE ROW LEVEL SECURITY;

-- Teachers can read/write their own plans
CREATE POLICY "Teachers can manage own plans"
  ON teacher_plans
  FOR ALL
  USING (
    teacher_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
  WITH CHECK (
    teacher_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Admins can see all plans
CREATE POLICY "Admins can manage all plans"
  ON teacher_plans
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'superadmin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'superadmin')
    )
  );
