
-- Fix Role for Jod (Logged in user)
-- The user logged in is 'jodlouis.dev@gmail.com', not 'orlando@iyfusa.org'

UPDATE profiles
SET role = 'superuser'
WHERE email = 'jodlouis.dev@gmail.com';

-- Verify
SELECT email, role FROM profiles WHERE email = 'jodlouis.dev@gmail.com';
