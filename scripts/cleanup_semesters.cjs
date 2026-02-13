require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanup() {
  console.log('🔍 Checking Semesters...');
  
  // 1. Get all "Spring 2026" semesters
  const { data: semesters, error } = await supabase
    .from('semesters')
    .select('*')
    .eq('name', 'Spring 2026')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching semesters:', error);
    return;
  }

  console.log(`Found ${semesters.length} semesters named "Spring 2026":`);
  
  for (const sem of semesters) {
    // Check enrollments count
    const { count, error: countError } = await supabase
      .from('enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('semester_id', sem.id);

    if (countError) {
      console.error(`Error checking enrollments for ${sem.id}:`, countError);
      continue;
    }

    console.log(`- ID: ${sem.id} | Created: ${sem.created_at} | Enrollments: ${count}`);

    if (count === 0) {
      console.log(`  🗑️  Deleting empty semester ${sem.id}...`);
      const { error: delError } = await supabase
        .from('semesters')
        .delete()
        .eq('id', sem.id);
      
      if (delError) console.error('  ❌ Failed to delete:', delError);
      else console.log('  ✅ Deleted.');
    } else {
        console.log('  ⚠️  Has enrollments. Keeping needed analysis.');
    }
  }

  console.log('\n--- Analysis of remaining semesters ---');
  // Re-fetch to see what's left
  const { data: remaining } = await supabase.from('semesters').select('id').eq('name', 'Spring 2026');
  
  if (remaining.length > 1) {
    console.log(' still have duplicates with data. Checking if data is identical...');
    const id1 = remaining[0].id;
    const id2 = remaining[1].id;

    const { data: enroll1 } = await supabase.from('enrollments').select('student_id').eq('semester_id', id1).order('student_id');
    const { data: enroll2 } = await supabase.from('enrollments').select('student_id').eq('semester_id', id2).order('student_id');

    const students1 = enroll1.map(e => e.student_id).join(',');
    const students2 = enroll2.map(e => e.student_id).join(',');

    if (students1 === students2) {
        console.log('  ✅ Data is IDENTICAL. Safe to delete the newer duplicate.');
        console.log(`  🗑️  Deleting newer duplicate ${id2}...`);
        // Delete enrollments first (cascade should handle it but let's be safe? No, cascade is fine if set)
        // Check cascade
        const { error: delError } = await supabase.from('semesters').delete().eq('id', id2);
         if (delError) console.error('  ❌ Failed to delete:', delError);
         else console.log('  ✅ Deleted duplicate.');
    } else {
        console.log('  ❌ Data is DIFFERENT. Manual merge required.');
    }
  } else {
    console.log('✅ Cleanup complete. Only 1 semester remains.');
  }
}

cleanup();
