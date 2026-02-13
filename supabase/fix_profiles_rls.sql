
-- Fix Profiles RLS "Chicken and Egg" Problem
-- We need to allow users to read their OWN profile so the system can check their role.

-- 1. Allow users to read their own profile
-- This is critical for `is_admin_or_superuser()` to work without recursion blocking it.
CREATE POLICY "Users can see own profile" ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- 2. (Optional redundancy) Ensure Superusers can see everyone (if not already working)
-- This might fail if the policy already exists, but it's safe to run (will error harmlessly or just work)
-- We previously saw a policy "Superusers full access", but let's make sure there's a non-recursive path if possible.
-- Ideally, we rely on the function security definer, but "Read Own" is the safest first step.

-- 3. Grant basic read access to profiles for authenticated users?
-- Maybe restrict to just the necessary fields if we were stricter, but for now, full read of own profile is standard.

-- 4. Fix Enrollments/Students just in case the previous script missed anything
-- (Re-applying the Admin/Superuser check is fine)
