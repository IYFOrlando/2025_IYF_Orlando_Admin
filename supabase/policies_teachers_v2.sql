
-- Fix Teacher Visibility Policies (V2)
-- Updates RLS to support the new `teacher_email` column usage in Academies and Levels

-- 1. Drop old policies to replace them clean
DROP POLICY IF EXISTS "Teachers view class enrollments" ON enrollments;
DROP POLICY IF EXISTS "Teachers view their students" ON students;

-- 2. ENROLLMENTS POLICY
-- Teachers can see enrollments if:
-- a) They are directly assigned via `teacher_assignments` (Legacy/Advanced)
-- b) They are the `default_teacher_id` (Legacy)
-- c) Their EMAIL matches `academies.teacher_email` (New Standard)
-- d) Their EMAIL matches `levels.teacher_email` (New Standard)

CREATE POLICY "Teachers view class enrollments" ON enrollments
  FOR SELECT
  USING (
    -- 1. Legacy/Direct Assignment
    EXISTS (
      SELECT 1 FROM teacher_assignments ta
      WHERE ta.teacher_id = auth.uid()
      AND ta.academy_id = enrollments.academy_id
      AND (ta.level_id IS NULL OR ta.level_id = enrollments.level_id)
    )
    OR
    -- 2. Email-based mapping (Academy Level)
    EXISTS (
      SELECT 1 FROM academies a
      JOIN profiles p ON p.email = LOWER(TRIM(a.teacher_email)) -- Match email formatted
      WHERE a.id = enrollments.academy_id
      AND p.id = auth.uid()
    )
    OR
    -- 3. Email-based mapping (Level Level)
    EXISTS (
      SELECT 1 FROM levels l
      JOIN profiles p ON p.email = LOWER(TRIM(l.teacher_email))
      WHERE l.id = enrollments.level_id
      AND p.id = auth.uid()
    )
    OR
    -- 4. Superusers/Admins can see everything (Safe fallback, usually handled by their own policy, but harmless here)
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('superuser', 'admin')
    )
  );

-- 3. STUDENTS POLICY
-- Teachers can see students if they have ANY enrollment the teacher can see.
-- We re-use the logic by checking the enrollments table.

CREATE POLICY "Teachers view their students" ON students
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM enrollments e
      WHERE e.student_id = students.id
      AND (
         -- Replicating logic for performance or relying on the fact that if they can see the enrollment, they can see the student
         -- Simplest way: Check if the teacher is linked to the academy/level of this enrollment
         
         -- 1. Legacy
         EXISTS (
            SELECT 1 FROM teacher_assignments ta
            WHERE ta.teacher_id = auth.uid()
            AND ta.academy_id = e.academy_id
            AND (ta.level_id IS NULL OR ta.level_id = e.level_id)
         )
         OR
         -- 2. Academy Email
         EXISTS (
            SELECT 1 FROM academies a
            JOIN profiles p ON p.email = LOWER(TRIM(a.teacher_email))
            WHERE a.id = e.academy_id
            AND p.id = auth.uid()
         )
         OR
         -- 3. Level Email
         EXISTS (
            SELECT 1 FROM levels l
             JOIN profiles p ON p.email = LOWER(TRIM(l.teacher_email))
            WHERE l.id = e.level_id
            AND p.id = auth.uid()
         )
      )
    )
    OR
    -- Superusers/Admins
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('superuser', 'admin')
    )
  );
