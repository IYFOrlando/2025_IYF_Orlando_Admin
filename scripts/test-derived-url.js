console.log('Testing Derived URL...');
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const PROJECT_ID = 'dggqplvsbhsbgtnndheo';
const URL = `https://${PROJECT_ID}.supabase.co`;
const KEY = process.env.SUPABASE_SERVICE_KEY;

console.log('Using URL:', URL);

if (!KEY) {
    console.error('No Service Key found');
    process.exit(1);
}

const supabase = createClient(URL, KEY);

async function test() {
    const { data, error } = await supabase.from('semesters').select('count', { count: 'exact', head: true });
    if (error) {
        console.error('Error:', error.message);
    } else {
        console.log('Success! Connected.');
    }
}

test();
