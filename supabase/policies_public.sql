
-- Public Access Policies
-- Enable anonymous users to VIEW class options and REGISTER themselves.

-- 1. Enable Read Access for Lookup Tables (Anon)
CREATE POLICY "Public can view semesters" ON semesters
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public can view academies" ON academies
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public can view levels" ON levels
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 2. Enable Insert Access for Registration (Anon)
-- We allow anonymous users to create a Student Profile
CREATE POLICY "Public can register as student" ON students
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- We allow anonymous users to create an Enrollment
CREATE POLICY "Public can enroll" ON enrollments
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 3. Verify
SELECT tablename, policyname, roles, cmd 
FROM pg_policies 
WHERE roles @> '{anon}';
