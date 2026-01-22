/**
 * Script to seed academies using Firebase Client SDK with CLI token
 * This script uses Firebase CLI authentication
 * 
 * Usage: 
 *   1. Make sure you're logged in: firebase login
 *   2. node scripts/seed-academies-firebase.js
 */

import { execSync } from 'child_process';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDocs } from 'firebase/firestore';
import { getAuth, signInWithCustomToken } from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBVBE2Cb5UFePdUOlTWVPPwGZCzH9lUtRQ",
  authDomain: "iyf-orlando-academy.firebaseapp.com",
  projectId: "iyf-orlando-academy",
  storageBucket: "iyf-orlando-academy.appspot.com",
  messagingSenderId: "321117265409",
  appId: "1:321117265409:web:27dc40234503505a3eaa00",
  measurementId: "G-H4FJCX8JT0",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Academy data for 2026 Spring Semester
const ACADEMIES_2026_SPRING = [
  {
    name: "Art",
    price: 100,
    schedule: "9:30 AM - 11:30 AM",
    hasLevels: false,
    order: 1,
    enabled: true,
    description: "Art Academy"
  },
  {
    name: "English",
    price: 50,
    schedule: "10:00 AM - 11:30 AM",
    hasLevels: false,
    order: 2,
    enabled: true,
    description: "English Academy"
  },
  {
    name: "Kids Academy",
    price: 50,
    schedule: "10:30 AM - 12:15 PM",
    hasLevels: false,
    order: 3,
    enabled: true,
    description: "Kids Academy"
  },
  {
    name: "Korean Language",
    price: 50,
    schedule: "10:00 AM - 11:30 AM",
    hasLevels: true,
    levels: [
      {
        name: "Alphabet",
        schedule: "9:00 AM - 10:15 AM",
        order: 1
      },
      {
        name: "Beginner",
        schedule: "10:20 AM - 11:35 AM",
        order: 2
      },
      {
        name: "Intermediate",
        schedule: "10:00 AM - 11:30 AM",
        order: 3
      },
      {
        name: "K-Movie Conversation",
        schedule: "10:00 AM - 11:30 AM",
        order: 4
      }
    ],
    order: 4,
    enabled: true,
    description: "Korean Language Academy"
  },
  {
    name: "Piano",
    price: 100,
    schedule: "10:00 AM - 11:30 AM",
    hasLevels: false,
    order: 5,
    enabled: true,
    description: "Piano Academy"
  },
  {
    name: "Pickleball",
    price: 50,
    schedule: "7:15 AM - 9:15 AM",
    hasLevels: false,
    order: 6,
    enabled: true,
    description: "Pickleball Academy"
  },
  {
    name: "Soccer",
    price: 50,
    schedule: "9:00 AM - 10:30 AM",
    hasLevels: false,
    order: 7,
    enabled: true,
    description: "Soccer Academy"
  },
  {
    name: "Taekwondo",
    price: 100,
    schedule: "9:20 AM - 10:20 AM & 10:30 AM - 11:30 AM",
    hasLevels: false,
    order: 8,
    enabled: true,
    description: "Taekwondo Academy"
  }
];

const COLLECTION_NAME = 'academies_2026_spring';

/**
 * Get Firebase access token from CLI
 */
function getFirebaseToken() {
  try {
    const token = execSync('firebase login:ci --no-localhost', { encoding: 'utf-8' }).trim();
    return token;
  } catch (error) {
    console.error('❌ Error getting Firebase token. Make sure you are logged in: firebase login');
    process.exit(1);
  }
}

/**
 * Seed academies to Firestore
 */
async function seedAcademies() {
  try {
    console.log('🌱 Starting to seed academies to Firebase...');
    console.log(`📦 Collection: ${COLLECTION_NAME}`);
    
    // Note: We'll try without authentication first, as Admin SDK bypasses rules
    // If that fails, we'll need to use a service account
    
    const academiesRef = collection(db, COLLECTION_NAME);
    
    // Check if academies already exist
    let existingSnapshot;
    try {
      existingSnapshot = await getDocs(academiesRef);
      if (!existingSnapshot.empty) {
        console.log(`⚠️  Found ${existingSnapshot.size} existing academies in the collection`);
        console.log('   Existing academies will be updated/merged with new data');
      }
    } catch (error) {
      console.log('⚠️  Could not check existing academies (this is OK if collection is empty)');
      existingSnapshot = { empty: true, docs: [] };
    }
    
    let created = 0;
    let updated = 0;
    let errors = 0;
    
    for (const academy of ACADEMIES_2026_SPRING) {
      try {
        // Use academy name as document ID (normalized)
        const docId = academy.name.toLowerCase().replace(/\s+/g, '_');
        const academyRef = doc(db, COLLECTION_NAME, docId);
        
        // Check if document exists
        const existingDoc = existingSnapshot.docs?.find(d => d.id === docId);
        
        const academyData = {
          ...academy,
          updatedAt: new Date().toISOString()
        };
        
        if (existingDoc) {
          // Update existing document
          await setDoc(academyRef, academyData, { merge: true });
          updated++;
          console.log(`   ✅ Updated: ${academy.name} ($${academy.price})`);
        } else {
          // Create new document
          await setDoc(academyRef, {
            ...academyData,
            createdAt: new Date().toISOString()
          });
          created++;
          console.log(`   ✨ Created: ${academy.name} ($${academy.price})`);
        }
        
        // Log schedule info
        if (academy.hasLevels && academy.levels) {
          console.log(`      Levels: ${academy.levels.map(l => `${l.name} (${l.schedule})`).join(', ')}`);
        } else {
          console.log(`      Schedule: ${academy.schedule}`);
        }
      } catch (error) {
        errors++;
        console.error(`   ❌ Error creating ${academy.name}:`, error.message);
        if (error.code === 'permission-denied') {
          console.error(`      ⚠️  Permission denied. You need admin access or to update Firestore rules.`);
        }
      }
    }
    
    console.log('\n✅ Seeding completed!');
    console.log(`   Created: ${created} academies`);
    console.log(`   Updated: ${updated} academies`);
    console.log(`   Errors: ${errors} academies`);
    console.log(`   Total: ${ACADEMIES_2026_SPRING.length} academies`);
    
    if (errors > 0) {
      console.log('\n⚠️  Some academies failed to create. This is likely due to Firestore security rules.');
      console.log('   Options:');
      console.log('   1. Use Firebase Admin SDK with service account');
      console.log('   2. Update Firestore rules to allow writes');
      console.log('   3. Run from browser console while logged in as admin');
    }
    
    // Verify the data
    try {
      console.log('\n🔍 Verifying data...');
      const verifySnapshot = await getDocs(academiesRef);
      console.log(`   Found ${verifySnapshot.size} academies in collection`);
      
      verifySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        console.log(`   - ${data.name}: $${data.price} | ${data.schedule || 'Multiple schedules'}`);
      });
    } catch (error) {
      console.log('   ⚠️  Could not verify data (permission issue)');
    }
    
    console.log('\n🎉 All done!');
    process.exit(errors > 0 ? 1 : 0);
  } catch (error) {
    console.error('❌ Error seeding academies:', error);
    process.exit(1);
  }
}

// Run the seed function
seedAcademies();
