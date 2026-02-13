
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const email = process.argv[2];
const role = process.argv[3] || 'admin';

if (!email) {
  console.log('Usage: node scripts/add-admin.js <email> [role]');
  console.log('Example: node scripts/add-admin.js orlando@iyfusa.org superuser');
  process.exit(1);
}

async function setRole() {
  console.log(`🔍 Finding user: ${email}...`);

  // First try to find in profiles
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('email', email)
    .single();

  if (error || !profile) {
    console.error(`❌ Profile not found for ${email}. User must sign in once first.`);
    return;
  }

  console.log(`✅ Found profile (Current Role: ${profile.role})`);
  console.log(`⚙️  Updating role to "${role}"...`);

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ role: role })
    .eq('id', profile.id);

  if (updateError) {
    console.error('❌ Failed to update role:', updateError);
  } else {
    console.log(`🎉 Success! ${email} is now a "${role}".`);
  }
}

setRole();
