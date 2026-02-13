import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

console.log('Starting test...');
dotenv.config();

console.log('Config loaded');
if (!process.env.VITE_FIREBASE_API_KEY) console.log('MISSING FIREBASE KEY');
else console.log('FIREBASE KEY FOUND');

if (!process.env.SUPABASE_SERVICE_KEY) console.log('MISSING SUPABASE KEY');
else console.log('SUPABASE KEY FOUND');

console.log('All done');
