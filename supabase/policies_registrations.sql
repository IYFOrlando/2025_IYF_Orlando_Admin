
-- Helper function (just in case it's missing)
CREATE OR REPLACE FUNCTION public.is_admin_or_superuser()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'superuser')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for Students and Enrollments
-- Required because RLS was enabled but no policies were created

-- 1. Students Table
-- Admins/Superusers have full access
CREATE POLICY "Admins/Superusers full access students" ON students
  FOR ALL
  USING (public.is_admin_or_superuser());

-- 2. Enrollments Table
-- Admins/Superusers have full access
CREATE POLICY "Admins/Superusers full access enrollments" ON enrollments
  FOR ALL
  USING (public.is_admin_or_superuser());

-- 3. Invoices Table (Also enabled in schema.sql but no policy seen)
CREATE POLICY "Admins/Superusers full access invoices" ON invoices
  FOR ALL
  USING (public.is_admin_or_superuser());

-- 4. Attendance Tables (If they exist and have RLS)
-- We should check if they were created by migration or schema.
-- Assuming they might need policies if RLS is enabled.
-- But let's focus on the reported "Registrations" issue first.

-- Grant basic read access to authenticated users for now? 
-- Or strict? Strict is better.
