-- Walk-in Lunch Sales Support
-- Run this in Supabase Dashboard > SQL Editor
-- This adds buyer_name and buyer_email to invoices for non-student (walk-in) sales.

-- 1. Add buyer_name and buyer_email columns to invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS buyer_name TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS buyer_email TEXT;

-- 2. Make student_id nullable (if not already) for walk-in sales
-- Note: In production, student_id is TEXT type, so this should work.
-- If student_id has a NOT NULL constraint, this removes it:
ALTER TABLE invoices ALTER COLUMN student_id DROP NOT NULL;

-- 3. Also allow payments without student_id for walk-in sales
ALTER TABLE payments ALTER COLUMN student_id DROP NOT NULL;

-- 4. Add 'lunch_walk_in' as a valid invoice_items type
-- Check current constraint:
-- ALTER TABLE invoice_items DROP CONSTRAINT IF EXISTS invoice_items_type_check;
-- ALTER TABLE invoice_items ADD CONSTRAINT invoice_items_type_check
--   CHECK (type IN ('tuition', 'lunch_semester', 'lunch_single', 'material', 'other', 'lunch_walk_in'));

-- NOTE: If the type check constraint doesn't exist in production (text columns),
-- you can skip step 4. The 'lunch_single' type already exists and we'll use that.
