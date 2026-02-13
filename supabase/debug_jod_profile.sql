
-- Debug Jod's Profile
-- Verify if the profile exists for the User ID found in the logs

-- Replace this ID with the one from your logs: cf149a1b-5da6-42c4-ab87-a5ac7c0669ec
SELECT * FROM profiles WHERE id = 'cf149a1b-5da6-42c4-ab87-a5ac7c0669ec';

-- Also check by email just in case
SELECT * FROM profiles WHERE email = 'jodlouis.dev@gmail.com';

-- Check function status
SELECT pg_get_functiondef('public.is_admin_or_superuser'::regproc);
