require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDuplicates() {
  console.log('🔍 Checking for Data Duplicates...');

  // 1. Check Duplicate Students (by Email)
  console.log('\n--- Duplicate Students (by Email) ---');
  const { data: students, error } = await supabase
    .from('students')
    .select('id, email, first_name, last_name, created_at')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching students:', error);
  } else {
    const emailMap = new Map();
    students.forEach(s => {
      if (!s.email) return;
      const email = s.email.toLowerCase().trim();
      if (!emailMap.has(email)) emailMap.set(email, []);
      emailMap.get(email).push(s);
    });

    let dupCount = 0;
    for (const [email, list] of emailMap.entries()) {
      if (list.length > 1) {
        console.log(`Email: ${email} -> ${list.length} records`);
        list.forEach(s => console.log(`   - ${s.id} (${s.first_name} ${s.last_name}) [${s.created_at}]`));
        dupCount++;
      }
    }
    if (dupCount === 0) console.log('✅ No duplicate students by email found.');
  }

  // 2. Check Duplicate Enrollments (Same Student, Same Semester)
  console.log('\n--- Duplicate Enrollments (Same Student + Semester) ---');
  const { data: enrollments, error: enrollError } = await supabase
    .from('enrollments')
    .select('id, student_id, semester_id, created_at')
    .order('created_at', { ascending: true });

  if (enrollError) {
    console.error('Error fetching enrollments:', enrollError);
  } else {
    const enrollMap = new Map();
    enrollments.forEach(e => {
        const key = `${e.student_id}_${e.semester_id}`;
        if (!enrollMap.has(key)) enrollMap.set(key, []);
        enrollMap.get(key).push(e);
    });

    let dupEnrollCount = 0;
    for (const [key, list] of enrollMap.entries()) {
        if (list.length > 1) {
            console.log(`Student+Semester: ${key} -> ${list.length} enrollments`);
            list.forEach(e => console.log(`   - ${e.id} [${e.created_at}]`));
            dupEnrollCount++;
        }
    }
    if (dupEnrollCount === 0) console.log('✅ No duplicate enrollments found.');
  }

  console.log('\n✅ Check Complete.');
}

checkDuplicates();
