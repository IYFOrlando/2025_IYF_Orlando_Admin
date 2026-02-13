
-- Fix Jod's Profile (Robust Version)
-- This script guarantees the profile exists AND has the correct role.
-- It handles cases where the profile row might be missing entirely.

INSERT INTO public.profiles (id, email, role, full_name)
VALUES (
  'cf149a1b-5da6-42c4-ab87-a5ac7c0669ec', -- The ID from your logs
  'jodlouis.dev@gmail.com',               -- Your email from logs
  'superuser',                            -- The Role we need
  'Jod Dev'                               -- Placeholder name
)
ON CONFLICT (id) DO UPDATE
SET 
  role = 'superuser',
  email = EXCLUDED.email; -- Update email just in case

-- Verify result
SELECT * FROM profiles WHERE id = 'cf149a1b-5da6-42c4-ab87-a5ac7c0669ec';
