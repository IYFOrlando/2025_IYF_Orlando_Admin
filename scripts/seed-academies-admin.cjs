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
const path = require('path');
const fs = require('fs');

// Initialize Firebase Admin
let app;
try {
  const serviceAccountPath = path.join(__dirname, 'service-account.json');
  
  if (fs.existsSync(serviceAccountPath)) {
    console.log(`🔑 Using local service account key at: ${serviceAccountPath}`);
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: 'iyf-orlando-academy'
    });
  } else {
    // Fallback to default credentials
    console.log(`⚠️  Local key NOT found at: ${serviceAccountPath}`);
    console.log('🌐 Trying application default credentials...');
    app = admin.apps.length > 0 
      ? admin.app() 
      : admin.initializeApp({
          credential: admin.credential.applicationDefault(),
          projectId: 'iyf-orlando-academy'
        });
  }
} catch (error) {
  console.error('❌ Error initializing Firebase Admin:', error.message);
  console.log('\n💡 Options to fix this:');
  console.log('   1. Recommended: Provide a service account key file at: scripts/service-account.json');
  console.log('   2. Or set GOOGLE_APPLICATION_CREDENTIALS environment variable');
  console.log('   3. Or run: gcloud auth application-default login');
  process.exit(1);
}

const db = admin.firestore();

// Academy data for 2026 Spring Semester
const ACADEMIES_2026_SPRING = [
  {
    name: "Art",
    description: "Unleash your creativity in a welcoming environment as you explore diverse art techniques and drawing styles. Through crafting original artwork, you will enhance critical thinking, master project completion, and bring your artistic visions to life.",
    price: 100,
    schedule: "9:30 AM - 11:30 AM",
    hasLevels: false,
    levels: [],
    order: 1,
    enabled: true,
    image: "https://firebasestorage.googleapis.com/v0/b/iyf-orlando-academy.appspot.com/o/2026%2F2026%20IYF%20Orlando%20Academy%2FPoster%2F2026_Spring_Semester_Art_Academy.png?alt=media&token=b1ac82a1-def1-42ab-80b0-17af8dec698a",
    tag: "Art",
    catchPhrase: "Unleash your inner artist!",
    goal: ["Learn various art techniques", "Enhance critical thinking"],
    age: "1st grade to adult",
    equipment: "Sketchbook, pencils, paints, and brushes",
    linkName: "art"
  },
  {
    name: "English",
    description: "Improve your English communication skills through speaking, listening, reading, and writing exercises. Our experienced instructors provide personalized feedback to help you achieve your language goals.",
    price: 50,
    schedule: "10:00 AM - 11:30 AM",
    hasLevels: false,
    levels: [],
    order: 2,
    enabled: true,
    image: "https://firebasestorage.googleapis.com/v0/b/iyf-orlando-academy.appspot.com/o/2026%2F2026%20IYF%20Orlando%20Academy%2FPoster%2F2026_Spring_Semester_English_Academy.png?alt=media&token=cf394e1a-0fe0-4abe-b9dc-4fd01c7a868d",
    tag: "Language",
    catchPhrase: "Master the global language!",
    goal: ["Fluency in speaking", "Better listening comprehension"],
    age: "Adults and youth",
    equipment: "Notebook and pen",
    linkName: "english"
  },
  {
    name: "Kids Academy",
    description: "Fun and educational place where children can learn and play together. Each session is packed with exciting activities, educational games, and creative projects.",
    price: 50,
    schedule: "10:30 AM - 12:15 PM",
    hasLevels: false,
    levels: [],
    order: 3,
    enabled: true,
    image: "https://firebasestorage.googleapis.com/v0/b/iyf-orlando-academy.appspot.com/o/2026%2F2026%20IYF%20Orlando%20Academy%2FPoster%2F2026_Spring_Semester_Kids_Academy.png?alt=media&token=e2f862c3-049a-4f0d-bf7c-0ed173ec5a45",
    tag: "Kids",
    catchPhrase: "Play, Learn & Discover",
    goal: ["Learn academic subjects", "Build teamwork"],
    age: "Pre-K to 1st grade",
    equipment: "Various toys and educational materials",
    linkName: "kids"
  },
  {
    name: "Korean Language",
    description: "Korean Academy offers immersive language courses led by experienced instructors. Practice Korean with native speakers and gain a deeper understanding of Korean culture.",
    price: 50,
    schedule: null,
    hasLevels: true,
    levels: [
      { name: "Korean Alphabet", schedule: "9:00 AM - 10:15 AM", order: 1 },
      { name: "Korean Beginner", schedule: "10:20 AM - 11:35 AM", order: 2 },
      { name: "Korean Conversation", schedule: "10:00 AM - 11:30 AM", order: 3 }
    ],
    order: 4,
    enabled: true,
    image: "https://firebasestorage.googleapis.com/v0/b/iyf-orlando-academy.appspot.com/o/2026%2F2026%20IYF%20Orlando%20Academy%2FPoster%2F2026_Spring_Semester_Korean_Language_Academy.png?alt=media&token=006e6542-585c-4d42-bdeb-ab768b7e37f0",
    tag: "Language",
    catchPhrase: "Learn the fascinating language of Korean!",
    goal: ["Proficiency in speaking and writing", "Cultural immersion"],
    age: "3rd grade to adult",
    equipment: "Notebook and pen",
    linkName: "korean"
  },
  {
    name: "Korean Conversation",
    description: "Learn natural Korean from real scenes and everyday conversations. Practice speaking with native instructors and improve your fluency.",
    price: 50,
    schedule: "10:00 AM - 11:30 AM",
    hasLevels: false,
    levels: [],
    order: 5,
    enabled: false, // Disabled as standalone
    image: "https://firebasestorage.googleapis.com/v0/b/iyf-orlando-academy.appspot.com/o/2026%2F2026%20IYF%20Orlando%20Academy%2FPoster%2F2026_Spring_Semester_Korean_Conversation_Academy.png?alt=media&token=c374b5e3-0d4d-44c5-accf-c0d662063c9e",
    tag: "Language",
    catchPhrase: "Speak Korean with confidence!",
    goal: ["Improve speaking skills", "Learn natural expressions"],
    age: "6th grade to adult",
    equipment: "Notebook and pen",
    linkName: "koreanconversation"
  },
  {
    name: "Piano",
    description: "The Piano Academy offers personalized piano lessons for beginners, covering fundamental music theories and techniques.",
    price: 100,
    schedule: "10:00 AM - 11:30 AM",
    hasLevels: false,
    levels: [],
    order: 6,
    enabled: true,
    image: "https://firebasestorage.googleapis.com/v0/b/iyf-orlando-academy.appspot.com/o/2026%2F2026%20IYF%20Orlando%20Academy%2FPoster%2F2026_Spring_Semester_Piano_Academy.png?alt=media&token=e7d96722-1c3b-449b-9296-f24a55a18057",
    tag: "Music",
    catchPhrase: "Play your heart out!",
    goal: ["Master piano techniques", "Learn music theory"],
    age: "1st grade to adult",
    equipment: "Piano or keyboard, sheet music",
    linkName: "piano"
  },
  {
    name: "Pickleball",
    description: "Learn how to play the fastest growing sport in America!",
    price: 50,
    schedule: "7:15 AM - 9:15 AM",
    hasLevels: false,
    levels: [],
    order: 7,
    enabled: true,
    image: "https://firebasestorage.googleapis.com/v0/b/iyf-orlando-academy.appspot.com/o/2026%2F2026%20IYF%20Orlando%20Academy%2FPoster%2F2026_Spring_Semester_Pickleball_Academy.png?alt=media&token=62bb95c5-e620-49aa-8e18-8dfd46ff8f4e",
    tag: "Sports",
    catchPhrase: "Pickleball for everyone!",
    goal: ["Gain proficiency in skills", "Learn strategy"],
    age: "6th grade to adult",
    equipment: "Pickleball paddle and ball",
    linkName: "pickleball"
  },
  {
    name: "Soccer",
    description: "Dive into the exciting world of soccer! Students will learn essential soccer skills like ball control, accurate passing, and powerful shooting.",
    price: 50,
    schedule: "9:00 AM - 10:30 AM",
    hasLevels: false,
    levels: [],
    order: 8,
    enabled: true,
    image: "https://firebasestorage.googleapis.com/v0/b/iyf-orlando-academy.appspot.com/o/2026%2F2026%20IYF%20Orlando%20Academy%2FPoster%2F2026_Spring_Semester_Soccer_Academy.png?alt=media&token=bcffa7d9-d0b9-4c63-acf8-dceac453fb24",
    tag: "Sports",
    catchPhrase: "Learn the game, Love the game!",
    goal: ["Build fundamental techniques", "Foster sportsmanship"],
    age: "1st grade to 8th grade",
    equipment: "Soccer ball and athletic shoes",
    linkName: "soccer"
  },
  {
    name: "Taekwondo",
    description: "Master the art of Taekwondo while building discipline, focus, and physical strength.",
    price: 100,
    schedule: "9:20 AM - 10:20 AM & 10:30 AM - 11:30 AM",
    hasLevels: false,
    levels: [],
    order: 9,
    enabled: true,
    image: "https://firebasestorage.googleapis.com/v0/b/iyf-orlando-academy.appspot.com/o/2026%2F2026%20IYF%20Orlando%20Academy%2FPoster%2F2026_Spring_Semester_Taekwondo_Academy.png?alt=media&token=540345fe-b859-41ca-87cd-c7f7e10061f8",
    tag: "Sports",
    catchPhrase: "Focus and Strength!",
    goal: ["Learn defensive techniques", "Build discipline"],
    age: "All ages",
    equipment: "Uniform",
    linkName: "taekwondo"
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
    
    // Cleanup: Remove academies from Firestore that are not in local data
    console.log('\n🧹 Checking for extraneous academies to delete...');
    const localDocIds = ACADEMIES_2026_SPRING.map(a => a.name.toLowerCase().replace(/\s+/g, '_'));
    
    let deleted = 0;
    for (const docSnap of existingSnapshot.docs) {
      if (!localDocIds.includes(docSnap.id)) {
        console.log(`   🗑️  Deleting: ${docSnap.id} (Not in local config)`);
        await docSnap.ref.delete();
        deleted++;
      }
    }
    
    console.log('\n✅ Seeding completed!');
    console.log(`   Created: ${created} academies`);
    console.log(`   Updated: ${updated} academies`);
    console.log(`   Deleted: ${deleted} extraneous academies`);
    console.log(`   Total: ${ACADEMIES_2026_SPRING.length} academies local config`);
    
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
