-- ========================================
-- Fix Taekwondo enrollments: assign level_id based on schedule_option
-- 
-- Problem: TKD has 2 schedules (e.g., "9:20 AM - 10:20 AM" and "10:30 AM - 11:30 AM")
-- stored as levels in the levels table. But enrollments were created with level_id = NULL
-- because the registration form stored the schedule in schedule_option instead of matching
-- it to a level_id.
--
-- This migration matches existing schedule_option values to the correct level_id.
-- ========================================

-- 1. First, check current state
SELECT 
    e.id AS enrollment_id,
    s.first_name || ' ' || s.last_name AS student_name,
    a.name AS academy,
    l.name AS current_level,
    e.schedule_option,
    e.level_id
FROM enrollments e
JOIN students s ON s.id = e.student_id
JOIN academies a ON a.id = e.academy_id
LEFT JOIN levels l ON l.id = e.level_id
WHERE a.name ILIKE '%Taekwondo%'
ORDER BY s.last_name;

-- 2. Update enrollments: match schedule_option to levels.schedule
UPDATE enrollments e
SET level_id = lv.id
FROM academies a, levels lv
WHERE e.academy_id = a.id
  AND lv.academy_id = a.id
  AND a.name ILIKE '%Taekwondo%'
  AND e.level_id IS NULL
  AND e.schedule_option IS NOT NULL
  AND e.schedule_option = lv.schedule;

-- 3. Verify the fix
SELECT 
    e.id AS enrollment_id,
    s.first_name || ' ' || s.last_name AS student_name,
    a.name AS academy,
    l.name AS level_name,
    l.schedule AS level_schedule,
    e.schedule_option
FROM enrollments e
JOIN students s ON s.id = e.student_id
JOIN academies a ON a.id = e.academy_id
LEFT JOIN levels l ON l.id = e.level_id
WHERE a.name ILIKE '%Taekwondo%'
ORDER BY l.name, s.last_name;

-- 4. Summary: count students per schedule
SELECT 
    l.name AS level_name,
    l.schedule,
    COUNT(*) AS student_count
FROM enrollments e
JOIN academies a ON a.id = e.academy_id
LEFT JOIN levels l ON l.id = e.level_id
WHERE a.name ILIKE '%Taekwondo%'
GROUP BY l.name, l.schedule
ORDER BY l.name;
