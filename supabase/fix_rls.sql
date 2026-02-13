-- Fix for infinite recursion in "profiles" policies
-- This script replaces the recursive policy with a SECURITY DEFINER function pattern.

-- 1. Create a helper function to check roles safely (bypassing RLS)
CREATE OR REPLACE FUNCTION public.is_admin_or_superuser()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'superuser')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop the problematic recursive policy
DROP POLICY IF EXISTS "Superusers full access" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles; -- Drop if exists to avoid conflict
DROP POLICY IF EXISTS "Admins read all profiles" ON profiles; -- Drop if exists

-- 3. Create new, safe policies

-- A. Users can read their own profile
CREATE POLICY "Users can read own profile" ON profiles
    FOR SELECT
    USING (auth.uid() = id);

-- B. Admins/Superusers can read all profiles
CREATE POLICY "Admins read all profiles" ON profiles
    FOR SELECT
    USING (public.is_admin_or_superuser());

-- C. Superusers can update/delete all profiles
CREATE POLICY "Superusers write all profiles" ON profiles
    FOR ALL
    USING (public.is_admin_or_superuser());

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
