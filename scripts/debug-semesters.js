import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function listSemesters() {
    const { data, error } = await supabase.from('semesters').select('*');
    if (error) console.error(error);
    else console.log(JSON.stringify(data, null, 2));
}

listSemesters();
