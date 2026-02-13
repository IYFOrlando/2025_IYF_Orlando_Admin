
-- EMERGENCY ACCESS FIX
-- We are bypassing the "Role Check" function entirely.
-- We are hardcoding access for your specific User ID.
-- ID: cf149a1b-5da6-42c4-ab87-a5ac7c0669ec

-- 1. Reset Policies for Enrollments
DROP POLICY IF EXISTS "Admins and Superusers can view all enrollments" ON enrollments;
DROP POLICY IF EXISTS "Emergency Access Jod" ON enrollments;

CREATE POLICY "Admins and Superusers can view all enrollments" ON enrollments
FOR SELECT
USING (
  -- Allow if IT IS YOU (Hardcoded)
  auth.uid() = 'cf149a1b-5da6-42c4-ab87-a5ac7c0669ec'
  OR
  -- Keep the old check for others
  is_admin_or_superuser()
);

-- 2. Reset Policies for Students
DROP POLICY IF EXISTS "Admins and Superusers can view all students" ON students;
DROP POLICY IF EXISTS "Emergency Access Jod Students" ON students;

CREATE POLICY "Admins and Superusers can view all students" ON students
FOR SELECT
USING (
  auth.uid() = 'cf149a1b-5da6-42c4-ab87-a5ac7c0669ec'
  OR
  is_admin_or_superuser()
);

-- 3. Reset Policies for Profiles (Just in case)
DROP POLICY IF EXISTS "Users can see own profile" ON profiles;
CREATE POLICY "Users can see own profile" ON profiles
FOR SELECT
USING (
  auth.uid() = id
  OR
  auth.uid() = 'cf149a1b-5da6-42c4-ab87-a5ac7c0669ec' -- You can see everyone for debug
);

-- 4. Verify Data Exists (No RLS)
SELECT 'Total Enrollments in DB' as check_name, count(*) FROM enrollments;
