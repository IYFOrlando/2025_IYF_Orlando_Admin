
-- Fix RLS for Academies and Levels

-- 1. Ensure RLS is enabled on levels (it was missing in initial view, good practice to enforce)
ALTER TABLE levels ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing restrictive policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Viewers read academies" ON academies;
DROP POLICY IF EXISTS "Admins full access academies" ON academies;
DROP POLICY IF EXISTS "Admins full access levels" ON levels;
DROP POLICY IF EXISTS "Everyone read levels" ON levels;

-- 3. ACADEMIES POLICIES

-- READ: Everyone can read academies (Active ones? Or all? Admin needs all)
CREATE POLICY "Everyone read academies" ON academies
  FOR SELECT
  USING (true);

-- WRITE (Insert, Update, Delete): Only Admins/Superusers
CREATE POLICY "Admins full access academies" ON academies
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'superuser')
    )
  );

-- 4. LEVELS POLICIES

-- READ: Everyone can read levels
CREATE POLICY "Everyone read levels" ON levels
  FOR SELECT
  USING (true);

-- WRITE: Only Admins/Superusers
CREATE POLICY "Admins full access levels" ON levels
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'superuser')
    )
  );

-- 5. Verification: Check current user role
SELECT id, email, role FROM profiles WHERE id = auth.uid();
