
-- Check RLS status for Lookup Tables
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('semesters', 'academies', 'levels', 'students', 'enrollments');
