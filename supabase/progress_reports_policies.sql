-- RLS policies for progress_reports
-- Goal: teachers can read/write feedback only within their assigned academy/level scope.

ALTER TABLE progress_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers/Admins view progress reports" ON progress_reports;
DROP POLICY IF EXISTS "Teachers/Admins insert progress reports" ON progress_reports;
DROP POLICY IF EXISTS "Teachers/Admins update progress reports" ON progress_reports;

-- Read access for teacher/admin/superuser in allowed scope.
CREATE POLICY "Teachers/Admins view progress reports" ON progress_reports
  FOR SELECT
  USING (
    -- Admin/Superuser can read all.
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'superuser')
    )
    OR
    -- Teacher scope by explicit assignment.
    EXISTS (
      SELECT 1
      FROM teacher_assignments ta
      WHERE ta.teacher_id = auth.uid()
      AND ta.academy_id = progress_reports.academy_id
      AND (ta.level_id IS NULL OR ta.level_id = progress_reports.level_id)
    )
    OR
    -- Teacher scope by academy teacher_email mapping.
    EXISTS (
      SELECT 1
      FROM academies a
      JOIN profiles p ON p.email = LOWER(TRIM(a.teacher_email))
      WHERE a.id = progress_reports.academy_id
      AND p.id = auth.uid()
    )
    OR
    -- Teacher scope by level teacher_email mapping.
    EXISTS (
      SELECT 1
      FROM levels l
      JOIN profiles p ON p.email = LOWER(TRIM(l.teacher_email))
      WHERE l.id = progress_reports.level_id
      AND p.id = auth.uid()
    )
  );

-- Insert access for teacher/admin/superuser in allowed scope.
CREATE POLICY "Teachers/Admins insert progress reports" ON progress_reports
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'superuser')
    )
    OR
    EXISTS (
      SELECT 1
      FROM teacher_assignments ta
      WHERE ta.teacher_id = auth.uid()
      AND ta.academy_id = progress_reports.academy_id
      AND (ta.level_id IS NULL OR ta.level_id = progress_reports.level_id)
    )
    OR
    EXISTS (
      SELECT 1
      FROM academies a
      JOIN profiles p ON p.email = LOWER(TRIM(a.teacher_email))
      WHERE a.id = progress_reports.academy_id
      AND p.id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1
      FROM levels l
      JOIN profiles p ON p.email = LOWER(TRIM(l.teacher_email))
      WHERE l.id = progress_reports.level_id
      AND p.id = auth.uid()
    )
  );

-- Update access for teacher/admin/superuser in allowed scope.
CREATE POLICY "Teachers/Admins update progress reports" ON progress_reports
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'superuser')
    )
    OR
    EXISTS (
      SELECT 1
      FROM teacher_assignments ta
      WHERE ta.teacher_id = auth.uid()
      AND ta.academy_id = progress_reports.academy_id
      AND (ta.level_id IS NULL OR ta.level_id = progress_reports.level_id)
    )
    OR
    EXISTS (
      SELECT 1
      FROM academies a
      JOIN profiles p ON p.email = LOWER(TRIM(a.teacher_email))
      WHERE a.id = progress_reports.academy_id
      AND p.id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1
      FROM levels l
      JOIN profiles p ON p.email = LOWER(TRIM(l.teacher_email))
      WHERE l.id = progress_reports.level_id
      AND p.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'superuser')
    )
    OR
    EXISTS (
      SELECT 1
      FROM teacher_assignments ta
      WHERE ta.teacher_id = auth.uid()
      AND ta.academy_id = progress_reports.academy_id
      AND (ta.level_id IS NULL OR ta.level_id = progress_reports.level_id)
    )
    OR
    EXISTS (
      SELECT 1
      FROM academies a
      JOIN profiles p ON p.email = LOWER(TRIM(a.teacher_email))
      WHERE a.id = progress_reports.academy_id
      AND p.id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1
      FROM levels l
      JOIN profiles p ON p.email = LOWER(TRIM(l.teacher_email))
      WHERE l.id = progress_reports.level_id
      AND p.id = auth.uid()
    )
  );
