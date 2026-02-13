import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { FIREBASE_CONFIG, COLLECTIONS_CONFIG } from '../src/config/shared.js';

dotenv.config();

// Initialize Firebase
const app = initializeApp(FIREBASE_CONFIG);
const db = getFirestore(app);

// Initialize Supabase
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function migrateTeachers() {
  console.log('🚀 Starting Teacher Email Backfill...');

  // 1. Get Semester ID pattern (Spring 2026)
  // We handle duplicates by finding the one that has academies
  const { data: semesters } = await supabase
    .from('semesters')
    .select('id')
    .eq('name', 'Spring 2026');

  if (!semesters || semesters.length === 0) {
    console.error('❌ Semester Spring 2026 not found');
    return;
  }

  let semesterId = null;

  // Find which semester has academies
  for (const sem of semesters) {
    const { count } = await supabase
        .from('academies')
        .select('*', { count: 'exact', head: true })
        .eq('semester_id', sem.id);
    
    if (count && count > 0) {
        semesterId = sem.id;
        console.log(`Found active semester: ${semesterId} (${count} academies)`);
        break;
    }
  }

  if (!semesterId) {
      console.error('❌ No semester found containing academies.');
      // Fallback: Use the most recent one if we are just starting and maybe referencing wrong? 
      // But if count is 0, we can't update academies anyway.
      return;
  }

  // 2. Fetch Firebase Academies
  const snapshot = await getDocs(collection(db, COLLECTIONS_CONFIG.academies2026Spring));
  
  let updatedAcademies = 0;
  let updatedLevels = 0;

  for (const doc of snapshot.docs) {
    const fbData = doc.data();
    const normalizeName = (n) => n ? n.trim() : '';
    const name = normalizeName(fbData.name);
    
    // Teacher Email
    const teacherEmail = fbData.teacher?.email ? fbData.teacher.email.toLowerCase().trim() : null;

    if (teacherEmail) {
        // Update Academy
        const { error: acError } = await supabase
            .from('academies')
            .update({ teacher_email: teacherEmail })
            .eq('semester_id', semesterId)
            .eq('name', name);
        
        if (!acError) {
            console.log(`✅ Updated Academy: ${name} -> ${teacherEmail}`);
            updatedAcademies++;
        } else {
            console.error(`❌ Failed to update academy ${name}:`, acError.message);
        }
    }

    // Update Levels
    if (fbData.hasLevels && fbData.levels && Array.isArray(fbData.levels)) {
        // We need the Academy ID
        const { data: acData } = await supabase
            .from('academies')
            .select('id')
            .eq('semester_id', semesterId)
            .eq('name', name)
            .single();

        if (acData) {
            for (const lvl of fbData.levels) {
                const lvlEmail = lvl.teacher?.email ? lvl.teacher.email.toLowerCase().trim() : null;
                const lvlName = lvl.name ? lvl.name.trim() : null;

                if (lvlEmail && lvlName) {
                    const { error: lvlError } = await supabase
                        .from('levels')
                        .update({ teacher_email: lvlEmail })
                        .eq('academy_id', acData.id)
                        .eq('name', lvlName);

                    if (!lvlError) {
                        console.log(`   🔸 Updated Level: ${lvlName} -> ${lvlEmail}`);
                        updatedLevels++;
                    } else {
                         console.error(`   ❌ Failed Level: ${lvlName}`, lvlError.message);
                    }
                }
            }
        }
    }
  }

  console.log('🎉 Done!');
  console.log(`Academies Updated: ${updatedAcademies}`);
  console.log(`Levels Updated: ${updatedLevels}`);
  process.exit(0);
}

migrateTeachers().catch(console.error);
