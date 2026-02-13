
-- STRICT RBAC IMPLEMENTATION
-- Goal: Enforce "Viewers see NOTHING" (Zero Trust).
-- 1. Public (Anon) -> Can see Catalog (for website/registration).
-- 2. Teachers -> Can see Catalog + Own Students.
-- 3. Admin/Superuser -> Can see Everything.
-- 4. Viewer (Assignments Pending) -> Can see NOTHING.

-- A. CLEANUP LOOSE POLICIES (Drop anything that grants "Everyone" or generic "Authenticated" access to Catalog)
DROP POLICY IF EXISTS "Public can view academies" ON academies;
DROP POLICY IF EXISTS "Public can view levels" ON levels;
DROP POLICY IF EXISTS "Public can view semesters" ON semesters;
DROP POLICY IF EXISTS "Everyone read academies" ON academies;
DROP POLICY IF EXISTS "Everyone read levels" ON levels;
DROP POLICY IF EXISTS "Everyone read semesters" ON levels; -- Typo protection

-- B. STRICT CATALOG POLICIES

-- 1. Academies
CREATE POLICY "Strict Access academies" ON academies
  FOR SELECT
  USING (
    auth.role() = 'anon' OR -- Public Website
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin', 'superuser'))
  );

-- 2. Levels
CREATE POLICY "Strict Access levels" ON levels
  FOR SELECT
  USING (
    auth.role() = 'anon' OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin', 'superuser'))
  );

-- 3. Semesters
CREATE POLICY "Strict Access semesters" ON semesters
  FOR SELECT
  USING (
    auth.role() = 'anon' OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin', 'superuser'))
  );

-- C. VERIFY NO LEAKS ON SENSITIVE DATA
-- Students/Enrollments/Invoices have NO "Public" or "Authenticated" SELECT policies.
-- They only have "Teacher" (Own) and "Admin" (All) policies from previous scripts.
-- This ensures Viewers cannot query them.

-- D. INSERT POLICIES (Keep Public Registration active)
-- We strictly allow INSERT for anon/authenticated (so Viewers can technically "Register" if they land on the form),
-- but they cannot See the data. This is standard secure behavior.
-- (No changes needed to 'policies_public.sql' INSERT sections)
