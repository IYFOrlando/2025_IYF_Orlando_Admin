-- Enable feedback history per class date.
-- Replaces semester-only uniqueness with date-aware uniqueness.

-- Ensure date exists and is populated so unique key is stable.
ALTER TABLE progress_reports
  ADD COLUMN IF NOT EXISTS date DATE;

UPDATE progress_reports
SET date = CURRENT_DATE
WHERE date IS NULL;

-- Drop old semester-only constraint if present.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'unique_feedback_per_student'
  ) THEN
    ALTER TABLE progress_reports
      DROP CONSTRAINT unique_feedback_per_student;
  END IF;
END $$;

-- Remove duplicate rows by business key before creating unique constraint.
WITH ranked AS (
  SELECT
    ctid,
    ROW_NUMBER() OVER (
      PARTITION BY student_id, academy_id, semester_id, date
      ORDER BY id DESC
    ) AS rn
  FROM progress_reports
)
DELETE FROM progress_reports p
USING ranked r
WHERE p.ctid = r.ctid
  AND r.rn > 1;

-- Add new date-aware unique constraint.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'unique_feedback_per_student_date'
  ) THEN
    ALTER TABLE progress_reports
      ADD CONSTRAINT unique_feedback_per_student_date
      UNIQUE (student_id, academy_id, semester_id, date);
  END IF;
END $$;
