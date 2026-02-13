-- ========================================
-- Fix Supabase Schema for Firebase Migration
-- ========================================

-- STEP 0: Drop all RLS policies that depend on id columns
-- ========================================

-- Drop policies on students table
DROP POLICY IF EXISTS "Teachers view their students" ON students;
DROP POLICY IF EXISTS "Admins and super users can view all students" ON students;
DROP POLICY IF EXISTS "Enable read access for all users" ON students;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON students;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON students;

-- Drop policies on enrollments table
DROP POLICY IF EXISTS "Teachers view their enrollments" ON enrollments;
DROP POLICY IF EXISTS "Admins view all enrollments" ON enrollments;
DROP POLICY IF EXISTS "Enable read access for all users" ON enrollments;

-- Drop policies on invoices table
DROP POLICY IF EXISTS "Enable read access for all users" ON invoices;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON invoices;

-- Drop policies on payments table
DROP POLICY IF EXISTS "Enable read access for all users" ON payments;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON payments;


-- STEP 0.5: Drop views that depend on id columns
-- ========================================

DROP VIEW IF EXISTS report_financial_summary CASCADE;
DROP VIEW IF EXISTS report_academy_enrollment CASCADE;
DROP VIEW IF EXISTS report_student_details CASCADE;


-- STEP 1: Modify students table to accept Firebase text IDs
-- ========================================

-- Drop foreign key constraints that reference students.id
ALTER TABLE enrollments DROP CONSTRAINT IF EXISTS enrollments_student_id_fkey;
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_student_id_fkey;
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_student_id_fkey;
ALTER TABLE attendance_records DROP CONSTRAINT IF EXISTS attendance_records_student_id_fkey;
ALTER TABLE progress_reports DROP CONSTRAINT IF EXISTS progress_reports_student_id_fkey;

-- Change students.id from UUID to TEXT
ALTER TABLE students ALTER COLUMN id TYPE TEXT;

-- Change student_id columns to TEXT in related tables (BEFORE recreating constraints!)
ALTER TABLE enrollments ALTER COLUMN student_id TYPE TEXT;
ALTER TABLE invoices ALTER COLUMN student_id TYPE TEXT;
ALTER TABLE payments ALTER COLUMN student_id TYPE TEXT;
ALTER TABLE attendance_records ALTER COLUMN student_id TYPE TEXT;
ALTER TABLE progress_reports ALTER COLUMN student_id TYPE TEXT;

-- NOW recreate foreign key constraints (after both sides are TEXT)
ALTER TABLE enrollments 
  ADD CONSTRAINT enrollments_student_id_fkey 
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;

ALTER TABLE invoices 
  ADD CONSTRAINT invoices_student_id_fkey 
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;

ALTER TABLE payments 
  ADD CONSTRAINT payments_student_id_fkey 
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;

ALTER TABLE attendance_records 
  ADD CONSTRAINT attendance_records_student_id_fkey 
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;

ALTER TABLE progress_reports 
  ADD CONSTRAINT progress_reports_student_id_fkey 
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;


-- 2. Add missing columns to invoices table
-- ========================================

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid DECIMAL(10,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS balance DECIMAL(10,2) DEFAULT 0;

-- Update balance to be total - paid (in case there's existing data)
UPDATE invoices SET balance = total - COALESCE(paid, 0);


-- 3. Verify payments table has created_at
-- ========================================

-- created_at should exist by default, but let's make sure
ALTER TABLE payments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();


-- 4. Change invoice and payment IDs to TEXT (to accept Firebase IDs)
-- ========================================

-- Drop constraints first
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_invoice_id_fkey;
ALTER TABLE invoice_items DROP CONSTRAINT IF EXISTS invoice_items_invoice_id_fkey;

-- Change invoice.id to TEXT
ALTER TABLE invoices ALTER COLUMN id TYPE TEXT;
ALTER TABLE payments ALTER COLUMN invoice_id TYPE TEXT;
ALTER TABLE invoice_items ALTER COLUMN invoice_id TYPE TEXT;

-- Change payment.id to TEXT
ALTER TABLE payments ALTER COLUMN id TYPE TEXT;

-- Recreate constraints
ALTER TABLE payments 
  ADD CONSTRAINT payments_invoice_id_fkey 
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;

ALTER TABLE invoice_items 
  ADD CONSTRAINT invoice_items_invoice_id_fkey 
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE;


-- ========================================
-- STEP 5: Recreate RLS Policies
-- ========================================
-- NOTE: Commented out - recreate manually based on your actual schema
-- The profiles table structure may differ from what's assumed here

/*
-- Enable RLS on all tables
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Add your RLS policies here based on your actual profiles schema
-- Example:
-- CREATE POLICY "Admins view all students" ON students FOR SELECT
-- USING (auth.jwt() ->> 'role' = 'admin');
*/


-- ========================================
-- STEP 6: Recreate Views
-- ========================================

-- Note: These are placeholder view definitions
-- Replace with actual view definitions from your schema if they differ

CREATE OR REPLACE VIEW report_financial_summary AS
SELECT 
  s.id as student_id,
  s.first_name,
  s.last_name,
  i.total,
  i.paid,
  i.balance,
  i.status
FROM students s
LEFT JOIN invoices i ON i.student_id = s.id;

CREATE OR REPLACE VIEW report_academy_enrollment AS
SELECT 
  s.id as student_id,
  s.first_name,
  s.last_name,
  a.name as academy_name,
  l.name as level_name,
  e.status as enrollment_status
FROM students s
JOIN enrollments e ON e.student_id = s.id
JOIN academies a ON a.id = e.academy_id
LEFT JOIN levels l ON l.id = e.level_id;

CREATE OR REPLACE VIEW report_student_details AS
SELECT 
  s.id,
  s.first_name,
  s.last_name,
  s.email,
  s.phone,
  s.birth_date,
  COUNT(DISTINCT e.academy_id) as academy_count
FROM students s
LEFT JOIN enrollments e ON e.student_id = s.id
GROUP BY s.id, s.first_name, s.last_name, s.email, s.phone, s.birth_date;


-- ========================================
-- Verification Queries
-- ========================================

-- Check students table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'students' 
ORDER BY ordinal_position;

-- Check invoices table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'invoices' 
ORDER BY ordinal_position;

-- Check payments table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'payments' 
ORDER BY ordinal_position;
