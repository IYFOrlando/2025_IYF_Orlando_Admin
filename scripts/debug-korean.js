import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkKorean() {
    // Check Academy
    const { data: academy } = await supabase
        .from('academies')
        .select('id, name, teacher_email')
        .eq('name', 'Korean Language')
        .single();
    
    console.log('Academy:', academy);

    if (academy) {
        // Check Levels
        const { data: levels } = await supabase
            .from('levels')
            .select('id, name, teacher_email')
            .eq('academy_id', academy.id);
        console.log('Levels:', levels);
    }
}

checkKorean();
