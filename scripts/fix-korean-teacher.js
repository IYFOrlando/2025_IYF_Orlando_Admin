import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function fixKorean() {
    console.log('Fixing Korean Language...');
    
    // Updates ALL 'Korean Language' academies to have null teacher_email
    // (Since user wants this logic generally, and duplicates might be confusing)
    const { error } = await supabase
        .from('academies')
        .update({ teacher_email: null })
        .eq('name', 'Korean Language');

    if (error) console.error('Error:', error);
    else console.log('✅ Successfully removed teacher from Korean Language academy.');
}

fixKorean();
