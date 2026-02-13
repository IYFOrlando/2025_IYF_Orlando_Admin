
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing credentials');
  process.exit(1);
}

// Service Role Client (Bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function debugRegistrations() {
  console.log('🔍 Debugging Registrations Data (Bypassing RLS)...');

  // 1. Check Semesters
  const { data: semesters, error: semError } = await supabase.from('semesters').select('*');
  if (semError) console.error('Error fetching semesters:', semError);
  console.log('📅 Semesters found:', semesters?.length);
  semesters?.forEach(s => console.log(`   - ${s.name} (ID: ${s.id})`));

  const spring2026 = semesters?.find(s => s.name === 'Spring 2026');
  if (!spring2026) {
    console.error('❌ "Spring 2026" semester not found!');
    return;
  }

  // 2. Check Enrollments for Spring 2026
  const { data: enrollments, error: enrError } = await supabase
    .from('enrollments')
    .select('id, student_id, academy_id, status')
    .eq('semester_id', spring2026.id);

  if (enrError) console.error('Error fetching enrollments:', enrError);
  console.log(`📝 Enrollments for Spring 2026: ${enrollments?.length ?? 0}`);

  // 3. Check Students
  const { count: studentCount } = await supabase.from('students').select('*', { count: 'exact', head: true });
  console.log(`busts Students in DB: ${studentCount}`);

  // 4. Check Profiles (Role check for Orlando)
  const { data: orlando } = await supabase.from('profiles').select('email, role').eq('email', 'orlando@iyfusa.org').single();
  if (orlando) {
    console.log(`👤 User 'orlando@iyfusa.org' Role: ${orlando.role}`);
  } else {
    console.log('⚠️ User for orlando@iyfusa.org not found in profiles.');
  }
}

debugRegistrations();
