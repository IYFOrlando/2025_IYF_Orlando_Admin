-- ========================================
-- Add missing student fields
-- Matches fields between public registration form and admin dashboard
-- ========================================

-- Guardian email (for minor students)
ALTER TABLE students ADD COLUMN IF NOT EXISTS guardian_email TEXT;

-- Emergency contact information
ALTER TABLE students ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;

-- Referral source (how did they hear about us)
ALTER TABLE students ADD COLUMN IF NOT EXISTS referral_source TEXT;

-- Ensure the enrollment status constraint allows 'enrolled' 
-- (used by both public form and admin dashboard)
ALTER TABLE enrollments DROP CONSTRAINT IF EXISTS enrollments_status_check;
ALTER TABLE enrollments ADD CONSTRAINT enrollments_status_check 
  CHECK (status IN ('active', 'enrolled', 'dropped', 'waitlist'));

-- ========================================
-- Verify changes
-- ========================================
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'students' 
ORDER BY ordinal_position;
