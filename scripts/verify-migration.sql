-- ========================================
-- Verification Queries for Migration
-- ========================================

-- 1. Count total students
SELECT COUNT(*) as total_students FROM students;
-- Expected: 47

-- 2. Count enrollments
SELECT COUNT(*) as total_enrollments FROM enrollments
WHERE semester_id = (SELECT id FROM semesters WHERE name = 'Spring 2026' LIMIT 1);

-- 3. Students with multiple academies
SELECT 
  s.id,
  s.first_name,
  s.last_name,
  COUNT(e.id) as academy_count
FROM students s
JOIN enrollments e ON e.student_id = s.id
WHERE e.semester_id = (SELECT id FROM semesters WHERE name = 'Spring 2026' LIMIT 1)
GROUP BY s.id, s.first_name, s.last_name
HAVING COUNT(e.id) > 1
ORDER BY academy_count DESC;
-- Should show students with 2 academies

-- 4. List of academies with student counts
SELECT 
  a.name as academy,
  COUNT(DISTINCT e.student_id) as student_count
FROM academies a
JOIN enrollments e ON e.academy_id = a.id
WHERE e.semester_id = (SELECT id FROM semesters WHERE name = 'Spring 2026' LIMIT 1)
GROUP BY a.id, a.name
ORDER BY student_count DESC;

-- 5. Financial summary
SELECT 
  COUNT(*) as total_invoices,
  SUM(total) as total_revenue,
  SUM(paid) as total_paid,
  SUM(balance) as total_balance FROM invoices
WHERE semester_id = (SELECT id FROM semesters WHERE name = 'Spring 2026' LIMIT 1);

-- 6. Payment counts
SELECT COUNT(*) as total_payments FROM payments;

-- 7. Payment status distribution
SELECT 
  status,
  COUNT(*) as count,
  SUM(balance) as total_balance
FROM invoices
WHERE semester_id = (SELECT id FROM semesters WHERE name = 'Spring 2026' LIMIT 1)
GROUP BY status;
