
-- Verify Policies
-- List all active RLS policies to make sure ours are actually there.

SELECT schemaname, tablename, policyname, cmd, roles 
FROM pg_policies 
WHERE tablename IN ('students', 'enrollments', 'profiles', 'teacher_assignments');

-- Check RLS Status on tables
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('students', 'enrollments', 'profiles');
