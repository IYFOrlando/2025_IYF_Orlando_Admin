
-- Debug Data State
-- Run this to see if data actually exists in the database

-- 1. Check Semesters
SELECT * FROM semesters;

-- 2. Check Enrollment Counts
SELECT 
    s.name as semester, 
    count(e.id) as enrollment_count 
FROM enrollments e
JOIN semesters s ON e.semester_id = s.id
GROUP BY s.name;

-- 3. Check Student Count
SELECT count(*) as total_students FROM students;

-- 4. Check Your Role
SELECT email, role FROM profiles WHERE email = 'orlando@iyfusa.org';
