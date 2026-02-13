require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // Service Role key for deletion

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function removeDuplicates() {
  console.log('🧹 Starting Data Deduplication...');

  // --- 1. Deduplicate Students ---
  console.log('\n--- 1. Deduplicating Students (by Email) ---');
  const { data: students, error } = await supabase
    .from('students')
    .select('id, email, created_at')
    .order('created_at', { ascending: true }); // Keep oldest

  if (error) {
    console.error('Error fetching students:', error);
    return;
  }

  const emailMap = new Map();
  students.forEach(s => {
    if (!s.email) return;
    const email = s.email.toLowerCase().trim();
    if (!emailMap.has(email)) emailMap.set(email, []);
    emailMap.get(email).push(s);
  });

  for (const [email, list] of emailMap.entries()) {
    if (list.length > 1) {
      const [master, ...duplicates] = list; // First one is oldest (master)
      console.log(`Processing ${email}: Keeping ${master.id}, merging ${duplicates.length} duplicates...`);

      for (const dup of duplicates) {
        // A. Move Enrollments
        const { error: moveError } = await supabase
          .from('enrollments')
          .update({ student_id: master.id })
          .eq('student_id', dup.id);
        
        if (moveError) console.error(`   ❌ Failed to move enrollments from ${dup.id}:`, moveError);

        // B. Move Attendance (if exists)
        const { error: attError } = await supabase
            .from('attendance')
            .update({ student_id: master.id })
            .eq('student_id', dup.id);
        if (attError) console.error(`   ❌ Failed to move attendance from ${dup.id}:`, attError);

        // C. Move Progress (if exists)
         const { error: progError } = await supabase
            .from('student_progress')
            .update({ student_id: master.id })
            .eq('student_id', dup.id);
        if (progError) console.error(`   ❌ Failed to move progress from ${dup.id}:`, progError);

        // D. Delete Duplicate Student
        const { error: delError } = await supabase
          .from('students')
          .delete()
          .eq('id', dup.id);
        
        if (delError) console.error(`   ❌ Failed to delete student ${dup.id}:`, delError);
        else console.log(`   ✅ Merged & Deleted ${dup.id}`);
      }
    }
  }

  // --- 2. Deduplicate Enrollments ---
  console.log('\n--- 2. Deduplicating Enrollments (Same Student, Same Semester) ---');
  // Re-fetch enrollments now that IDs are merged
  const { data: enrollments, error: enrollError } = await supabase
    .from('enrollments')
    .select('id, student_id, semester_id, created_at')
    .order('created_at', { ascending: true }); // Keep oldest

  if (enrollError) {
    console.error('Error fetching enrollments:', enrollError);
    return;
  }

  const enrollMap = new Map();
  enrollments.forEach(e => {
      const key = `${e.student_id}_${e.semester_id}`;
      if (!enrollMap.has(key)) enrollMap.set(key, []);
      enrollMap.get(key).push(e);
  });

  for (const [key, list] of enrollMap.entries()) {
    if (list.length > 1) {
       const [master, ...duplicates] = list;
       console.log(`Fixing duplicate enrollment for ${key} (Keeping ${master.id})...`);
       
       for (const dup of duplicates) {
           const { error: delError } = await supabase
             .from('enrollments')
             .delete()
             .eq('id', dup.id);
           
           if (delError) console.error(`   ❌ Failed to delete enrollment ${dup.id}:`, delError);
           else console.log(`   ✅ Deleted enrollment ${dup.id}`);
       }
    }
  }

  console.log('\n✅ Deduplication Complete.');
}

removeDuplicates();
