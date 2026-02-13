-- Delete the duplicate Spring 2026 semester
-- Keep the first one (created at 2026-02-13T02:11:20)
DELETE FROM semesters 
WHERE id = '26b4b19a-ac6e-4b86-8d64-39c74762c452';

-- Verify only one remains
SELECT * FROM semesters WHERE name = 'Spring 2026';
