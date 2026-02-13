
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

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function setAdmin() {
  const email = 'orlando@iyfusa.org';
  console.log(`🔧 Setting ${email} to SUPERUSER...`);

  // 1. Get User ID by Email (from profiles or auth? Profiles is accessible via RLS bypass with service key)
  const { data: profiles, error: findError } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('email', email);

  if (findError) {
    console.error('❌ Error finding profile:', findError);
    return;
  }

  if (!profiles || profiles.length === 0) {
    console.error(`❌ No profile found for ${email}. User must sign in first to create a profile.`);
    return;
  }

  const userId = profiles[0].id;
  
  // 2. Update Role
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ role: 'superuser' })
    .eq('id', userId);

  if (updateError) {
    console.error('❌ Error updating role:', updateError);
  } else {
    console.log(`✅ SUCCESS! ${email} is now a SUPERUSER (id: ${userId}).`);
  }
}

setAdmin();
