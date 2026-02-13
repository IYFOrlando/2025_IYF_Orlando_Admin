-- ========================================
-- Fix Taekwondo enrollments: show current state and available levels
--
-- The enrollments table does NOT have a schedule_option column.
-- TKD students currently have level_id = NULL.
-- This script helps identify the situation and provides manual fix options.
-- ========================================

-- 1. Show Taekwondo levels available (these represent the 2 schedules)
SELECT 
    l.id AS level_id,
    l.name AS level_name,
    l.schedule,
    a.name AS academy
FROM levels l
JOIN academies a ON a.id = l.academy_id
WHERE a.name ILIKE '%Taekwondo%'
ORDER BY l.display_order;

-- 2. Show TKD students currently without a level assigned
SELECT 
    e.id AS enrollment_id,
    s.first_name || ' ' || s.last_name AS student_name,
    a.name AS academy,
    l.name AS current_level,
    e.level_id
FROM enrollments e
JOIN students s ON s.id = e.student_id
JOIN academies a ON a.id = e.academy_id
LEFT JOIN levels l ON l.id = e.level_id
WHERE a.name ILIKE '%Taekwondo%'
ORDER BY s.last_name;

-- ========================================
-- 3. MANUAL FIX: Assign students to the correct TKD schedule
-- 
-- Replace <LEVEL_ID_OPTION_1> and <LEVEL_ID_OPTION_2> with the actual 
-- level IDs from query #1 above.
--
-- Then list the enrollment IDs from query #2 for each schedule group.
-- ========================================

-- Example: Assign students to Option 1 (9:20 AM - 10:20 AM)
-- UPDATE enrollments SET level_id = '<LEVEL_ID_OPTION_1>'
-- WHERE id IN ('enrollment_id_1', 'enrollment_id_2', ...);

-- Example: Assign students to Option 2 (10:30 AM - 11:30 AM)  
-- UPDATE enrollments SET level_id = '<LEVEL_ID_OPTION_2>'
-- WHERE id IN ('enrollment_id_3', 'enrollment_id_4', ...);

-- ========================================
-- 4. After manual assignment, verify:
-- ========================================
-- SELECT 
--     l.name AS level_name,
--     l.schedule,
--     COUNT(*) AS student_count
-- FROM enrollments e
-- JOIN academies a ON a.id = e.academy_id
-- LEFT JOIN levels l ON l.id = e.level_id
-- WHERE a.name ILIKE '%Taekwondo%'
-- GROUP BY l.name, l.schedule
-- ORDER BY l.name;
