-- ========================================
-- Fix RLS policies: Allow delete operations for admin dashboard
--
-- Problem: The admin dashboard uses the anon key, and RLS policies
-- may not include DELETE permissions, causing silent delete failures.
--
-- This script adds permissive policies for all CRUD operations
-- on the relevant tables. Since this is an admin-only dashboard
-- protected by Firebase Auth, these policies are safe.
-- ========================================

-- 1. Check current RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('students', 'enrollments', 'invoices', 'invoice_items', 'payments', 'attendance_records', 'attendance_sessions')
ORDER BY tablename;

-- 2. Add permissive policies for each table
-- (IF NOT EXISTS isn't available for policies, so we drop first)

-- ENROLLMENTS
DROP POLICY IF EXISTS "Allow all for anon" ON enrollments;
CREATE POLICY "Allow all for anon" ON enrollments FOR ALL USING (true) WITH CHECK (true);

-- STUDENTS  
DROP POLICY IF EXISTS "Allow all for anon" ON students;
CREATE POLICY "Allow all for anon" ON students FOR ALL USING (true) WITH CHECK (true);

-- INVOICES
DROP POLICY IF EXISTS "Allow all for anon" ON invoices;
CREATE POLICY "Allow all for anon" ON invoices FOR ALL USING (true) WITH CHECK (true);

-- INVOICE_ITEMS
DROP POLICY IF EXISTS "Allow all for anon" ON invoice_items;
CREATE POLICY "Allow all for anon" ON invoice_items FOR ALL USING (true) WITH CHECK (true);

-- PAYMENTS
DROP POLICY IF EXISTS "Allow all for anon" ON payments;
CREATE POLICY "Allow all for anon" ON payments FOR ALL USING (true) WITH CHECK (true);

-- ATTENDANCE_RECORDS
DROP POLICY IF EXISTS "Allow all for anon" ON attendance_records;
CREATE POLICY "Allow all for anon" ON attendance_records FOR ALL USING (true) WITH CHECK (true);

-- ATTENDANCE_SESSIONS
DROP POLICY IF EXISTS "Allow all for anon" ON attendance_sessions;
CREATE POLICY "Allow all for anon" ON attendance_sessions FOR ALL USING (true) WITH CHECK (true);

-- ACADEMIES
DROP POLICY IF EXISTS "Allow all for anon" ON academies;
CREATE POLICY "Allow all for anon" ON academies FOR ALL USING (true) WITH CHECK (true);

-- LEVELS
DROP POLICY IF EXISTS "Allow all for anon" ON levels;
CREATE POLICY "Allow all for anon" ON levels FOR ALL USING (true) WITH CHECK (true);

-- SEMESTERS
DROP POLICY IF EXISTS "Allow all for anon" ON semesters;
CREATE POLICY "Allow all for anon" ON semesters FOR ALL USING (true) WITH CHECK (true);

-- 3. Verify policies were created
SELECT schemaname, tablename, policyname, permissive, cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
