/**
 * Script to seed academies data to Firebase Firestore using Admin SDK
 * This script bypasses security rules by using Admin SDK
 * 
 * Usage: 
 *   node scripts/seed-academies-admin.js
 * 
 * Note: This requires a service account key file or GOOGLE_APPLICATION_CREDENTIALS
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
// Try to use default credentials or service account
let app;
try {
  // Try to initialize with default credentials (if GOOGLE_APPLICATION_CREDENTIALS is set)
  app = admin.apps.length > 0 
    ? admin.app() 
    : admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: 'iyf-orlando-academy'
      });
} catch (error) {
  console.error('❌ Error initializing Firebase Admin:', error.message);
  console.log('\n💡 Options to fix this:');
  console.log('   1. Set GOOGLE_APPLICATION_CREDENTIALS environment variable');
  console.log('   2. Run: gcloud auth application-default login');
  console.log('   3. Or provide a service account key file');
  process.exit(1);
}

const db = admin.firestore();

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
 * Seed academies to Firestore
 */
async function seedAcademies() {
  try {
    console.log('🌱 Starting to seed academies to Firebase...');
    console.log(`📦 Collection: ${COLLECTION_NAME}`);
    
    const academiesRef = db.collection(COLLECTION_NAME);
    
    // Check if academies already exist
    const existingSnapshot = await academiesRef.get();
    if (!existingSnapshot.empty) {
      console.log(`⚠️  Found ${existingSnapshot.size} existing academies in the collection`);
      console.log('   Existing academies will be updated/merged with new data');
    }
    
    let created = 0;
    let updated = 0;
    
    for (const academy of ACADEMIES_2026_SPRING) {
      // Use academy name as document ID (normalized)
      const docId = academy.name.toLowerCase().replace(/\s+/g, '_');
      const academyRef = academiesRef.doc(docId);
      
      // Check if document exists
      const existingDoc = existingSnapshot.docs.find(d => d.id === docId);
      
      const academyData = {
        ...academy,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      if (existingDoc) {
        // Update existing document
        await academyRef.set(academyData, { merge: true });
        updated++;
        console.log(`   ✅ Updated: ${academy.name} ($${academy.price})`);
      } else {
        // Create new document
        await academyRef.set({
          ...academyData,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
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
    }
    
    console.log('\n✅ Seeding completed!');
    console.log(`   Created: ${created} academies`);
    console.log(`   Updated: ${updated} academies`);
    console.log(`   Total: ${ACADEMIES_2026_SPRING.length} academies`);
    
    // Verify the data
    console.log('\n🔍 Verifying data...');
    const verifySnapshot = await academiesRef.get();
    console.log(`   Found ${verifySnapshot.size} academies in collection`);
    
    verifySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      console.log(`   - ${data.name}: $${data.price} | ${data.schedule || 'Multiple schedules'}`);
    });
    
    console.log('\n🎉 All done!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding academies:', error);
    process.exit(1);
  }
}

// Run the seed function
seedAcademies();
