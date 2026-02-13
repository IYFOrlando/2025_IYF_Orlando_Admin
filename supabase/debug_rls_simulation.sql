
-- 🕵️‍♂️ Deep RLS Debug Simulation
-- This script simulates being the user 'jodlouis.dev@gmail.com' and tries to read data.

-- 1. Setup Context (Simulate the logged-in user)
-- ID from your logs: cf149a1b-5da6-42c4-ab87-a5ac7c0669ec
SET LOCAL ROLE authenticated;
SET request.jwt.claim.sub = 'cf149a1b-5da6-42c4-ab87-a5ac7c0669ec';

-- 2. Debug: Can I read my own profile?
-- If this fails, then is_admin_or_superuser() will fail too.
SELECT 'My Profile Check' as check_name, id, email, role 
FROM profiles 
WHERE id = 'cf149a1b-5da6-42c4-ab87-a5ac7c0669ec';

-- 3. Debug: What does the security function return?
SELECT 'Function Check' as check_name, is_admin_or_superuser() as am_i_admin;

-- 4. Debug: Can I see ANY enrollments?
-- We check count without filtering by semester first.
SELECT 'Total Visible Enrollments' as check_name, count(*) 
FROM enrollments;

-- 5. Debug: Check for specific Semester ID from your logs
-- ID: 8d41455e-f392-4fde-aa81-26fefb89da6a
SELECT 'Spring 2026 Enrollments' as check_name, count(*) 
FROM enrollments 
WHERE semester_id = '8d41455e-f392-4fde-aa81-26fefb89da6a';

-- RESET ROLE (Important for other scripts)
RESET ROLE;
