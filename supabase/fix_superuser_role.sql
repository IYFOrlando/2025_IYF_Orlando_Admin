
-- Fix User Role for Orlando
-- This ensures the user has 'superuser' role to bypass RLS policies

UPDATE profiles
SET role = 'superuser'
WHERE email = 'orlando@iyfusa.org';

-- Verification
SELECT email, role FROM profiles WHERE email = 'orlando@iyfusa.org';
