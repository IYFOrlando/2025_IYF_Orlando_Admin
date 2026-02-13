
-- Teacher RLS Policies
-- Allow teachers to see their own data and assigned students
-- STRICTLY NO ACCESS TO FINANCIAL DATA (invoices, payments)

-- 1. Teacher Assignments
-- Teachers can see their own assignments
CREATE POLICY "Teachers view own assignments" ON teacher_assignments
  FOR SELECT
  USING (teacher_id = auth.uid());

-- 2. Enrollments
-- Teachers can see enrollments for academies they are assigned to
CREATE POLICY "Teachers view class enrollments" ON enrollments
  FOR SELECT
  USING (
    -- 1. Direct assignment to this academy (and level if specified)
    EXISTS (
      SELECT 1 FROM teacher_assignments ta
      WHERE ta.teacher_id = auth.uid()
      AND ta.academy_id = enrollments.academy_id
      AND (ta.level_id IS NULL OR ta.level_id = enrollments.level_id)
    )
    OR
    -- 2. Default teacher for the academy
    EXISTS (
      SELECT 1 FROM academies a
      WHERE a.id = enrollments.academy_id
      AND a.default_teacher_id = auth.uid()
    )
  );

-- 3. Students
-- Teachers can see students who are in their classes
-- This relies on the Enrollments policy logic implicitly or explicitly
CREATE POLICY "Teachers view their students" ON students
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM enrollments e
      WHERE e.student_id = students.id
      AND (
        -- Replicating the enrollment logic here for safety/performance
        -- (Direct assignment)
        EXISTS (
          SELECT 1 FROM teacher_assignments ta
          WHERE ta.teacher_id = auth.uid()
          AND ta.academy_id = e.academy_id
          AND (ta.level_id IS NULL OR ta.level_id = e.level_id)
        )
        OR
        -- (Default teacher)
        EXISTS (
          SELECT 1 FROM academies a
          WHERE a.id = e.academy_id
          AND a.default_teacher_id = auth.uid()
        )
      )
    )
  );
