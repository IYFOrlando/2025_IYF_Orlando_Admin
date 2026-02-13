-- Create Spring 2026 semester if it doesn't exist
INSERT INTO semesters (name, start_date, end_date, is_active)
VALUES ('Spring 2026', '2026-01-01', '2026-05-31', true)
ON CONFLICT (name) DO NOTHING;

-- Verify
SELECT * FROM semesters WHERE name = 'Spring 2026';
