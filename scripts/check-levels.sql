
-- Find 'Korean Language' academy and its levels
WITH korean_academy AS (
    SELECT id, name FROM academies WHERE name = 'Korean Language' LIMIT 1
)
SELECT 
    a.name as academy_name,
    l.name as level_name,
    l.display_order
FROM levels l
JOIN korean_academy a ON l.academy_id = a.id
ORDER BY l.display_order;
