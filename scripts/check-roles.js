
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') }); // Adjusted path to root

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkRoles() {
  console.log('🔍 Checking for Admins and Superusers...');

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('email, role, full_name, id')
    .in('role', ['admin', 'superuser']);

  if (error) {
    console.error('❌ Error fetching profiles:', error);
    return;
  }

  if (profiles.length === 0) {
    console.log('⚠️ No users found with "admin" or "superuser" role.');
  } else {
    console.log(`✅ Found ${profiles.length} privileged users:`);
    console.table(profiles);
  }

  // Also verify total users
  const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
  console.log(`\nℹ️ Total registered profiles: ${count}`);
}

checkRoles();
