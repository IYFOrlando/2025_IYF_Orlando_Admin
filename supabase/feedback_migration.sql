-- Feedback / Certification migration
-- Adds semester context and attendance tracking to progress_reports

-- 1. Add semester_id column
ALTER TABLE progress_reports ADD COLUMN IF NOT EXISTS semester_id UUID REFERENCES semesters(id);

-- 2. Add attendance percentage (auto-calculated, stored on save)
ALTER TABLE progress_reports ADD COLUMN IF NOT EXISTS attendance_pct DECIMAL(5,2);

-- 3. Unique constraint: one feedback per student per academy per semester
-- (allows NULL semester_id rows from legacy data)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_feedback_per_student'
  ) THEN
    ALTER TABLE progress_reports
      ADD CONSTRAINT unique_feedback_per_student
      UNIQUE (student_id, academy_id, semester_id);
  END IF;
END $$;

-- 4. Backfill semester_id for existing rows (use the active semester)
UPDATE progress_reports
SET semester_id = (SELECT id FROM semesters WHERE name = 'Spring 2026' LIMIT 1)
WHERE semester_id IS NULL;
