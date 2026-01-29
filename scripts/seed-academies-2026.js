/**
 * Script to seed academies data to Firebase Firestore
 * This loads academies with prices and schedules for 2026 Spring Semester
 * 
 * Usage: 
 *   1. Make sure you're authenticated in Firebase (run from admin dashboard or use Firebase CLI)
 *   2. node scripts/seed-academies-2026.js
 * 
 * Note: This script requires admin permissions. You may need to run it from the admin dashboard
 * or use Firebase Admin SDK with service account credentials.
 */

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, doc, setDoc, getDocs } from 'firebase/firestore'
import { getAuth, signInAnonymously } from 'firebase/auth'
import { COLLECTIONS_CONFIG } from '../src/config/shared.js'

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBVBE2Cb5UFePdUOlTWVPPwGZCzH9lUtRQ",
  authDomain: "iyf-orlando-academy.firebaseapp.com",
  projectId: "iyf-orlando-academy",
  storageBucket: "iyf-orlando-academy.appspot.com",
  messagingSenderId: "321117265409",
  appId: "1:321117265409:web:27dc40234503505a3eaa00",
  measurementId: "G-H4FJCX8JT0",
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)
const auth = getAuth(app)

// Note: This script requires admin permissions
// If you get permission errors, you may need to:
// 1. Run this from the admin dashboard (browser console)
// 2. Use Firebase Admin SDK with service account
// 3. Temporarily update Firestore rules to allow writes

// Academy data for 2026 Spring Semester
const ACADEMIES_2026_SPRING = [
  {
    name: "Art",
    description: "Unleash your creativity in a welcoming environment as you explore diverse art techniques and drawing styles.",
    price: 100,
    schedule: "9:30 AM - 11:30 AM",
    teacher: { name: "Aung w pyo", email: "aypc2757@gmail.com", phone: "" },
    hasLevels: false,
    levels: [],
    order: 1,
    enabled: true,
    image: "https://firebasestorage.googleapis.com/v0/b/iyf-orlando-academy.appspot.com/o/2026%2F2026%20IYF%20Orlando%20Academy%2FPoster%2F2026_Spring_Semester_Art_Academy.png?alt=media&token=b1ac82a1-def1-42ab-80b0-17af8dec698a",
    tag: "Art",
    catchPhrase: "Unleash your inner artist!",
    goal: ["Learn various art techniques", "Enhance critical thinking"],
    age: "7 yrs to adult",
    equipment: "Sketchbook, pencils, paints, and brushes",
    linkName: "art"
  },
  {
    name: "English",
    description: "Improve your English communication skills through speaking, listening, reading, and writing exercises.",
    price: 50,
    schedule: "10:00 AM - 11:30 AM",
    teacher: { name: "Sefora", email: "", phone: "" },
    hasLevels: false,
    levels: [],
    order: 2,
    enabled: true,
    image: "https://firebasestorage.googleapis.com/v0/b/iyf-orlando-academy.appspot.com/o/2026%2F2026%20IYF%20Orlando%20Academy%2FPoster%2F2026_Spring_Semester_English_Academy.png?alt=media&token=cf394e1a-0fe0-4abe-b9dc-4fd01c7a868d",
    tag: "Language",
    catchPhrase: "Master the global language!",
    goal: ["Fluency in speaking", "Better listening comprehension"],
    age: "15 yrs to adult",
    equipment: "Notebook and pen",
    linkName: "english"
  },
  {
    name: "Kids Academy",
    description: "Fun and educational place where children can learn and play together.",
    price: 50,
    schedule: "10:00 AM - 12:15 PM",
    teacher: { name: "Susan", email: "", phone: "" },
    hasLevels: false,
    levels: [],
    order: 3,
    enabled: true,
    image: "https://firebasestorage.googleapis.com/v0/b/iyf-orlando-academy.appspot.com/o/2026%2F2026%20IYF%20Orlando%20Academy%2FPoster%2F2026_Spring_Semester_Kids_Academy.png?alt=media&token=e2f862c3-049a-4f0d-bf7c-0ed173ec5a45",
    tag: "Kids",
    catchPhrase: "Play, Learn & Discover",
    goal: ["Learn academic subjects", "Build teamwork"],
    age: "K-2 students",
    equipment: "Various toys and educational materials",
    linkName: "kids"
  },
  {
    name: "Korean Language",
    description: "Korean Academy offers immersive language courses led by experienced instructors.",
    price: 50,
    schedule: null,
    hasLevels: true,
    levels: [
      { name: "Korean Alphabet", schedule: "9:00 AM - 10:15 AM", teacher: { name: "Lim", email: "", phone: "" }, order: 1 },
      { name: "Korean Beginner", schedule: "10:20 AM - 11:35 AM", teacher: { name: "Lim", email: "", phone: "" }, order: 2 }
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
    teacher: { name: "Tevin", email: "", phone: "" },
    hasLevels: false,
    levels: [],
    order: 5,
    enabled: true,
    image: "https://firebasestorage.googleapis.com/v0/b/iyf-orlando-academy.appspot.com/o/2026%2F2026%20IYF%20Orlando%20Academy%2FPoster%2F2026_Spring_Semester_Korean_Conversation_Academy.png?alt=media&token=c374b5e3-0d4d-44c5-accf-c0d662063c9e",
    tag: "Language",
    catchPhrase: "Speak Korean with confidence!",
    goal: ["Improve speaking skills", "Learn natural expressions"],
    age: "6th grade to adult",
    equipment: "Notebook and pen",
    linkName: "koreanconversation"
  },
  {
    name: "Korean Cooking",
    description: "Learn to cook delicious Korean dishes while exploring Korean culture and culinary traditions.",
    price: 50,
    schedule: "TBD",
    teacher: { name: "Eung Lee", email: "eungstory87@gmail.com", phone: "" },
    hasLevels: false,
    levels: [],
    order: 6,
    enabled: true,
    image: "https://firebasestorage.googleapis.com/v0/b/iyf-orlando-academy.appspot.com/o/2026%2F2026%20IYF%20Orlando%20Academy%2FPoster%2F2026_Spring_Semester_Korean_Cooking_Academy.png?alt=media&token=placeholder",
    tag: "Culture",
    catchPhrase: "Cook Korean with passion!",
    goal: ["Learn Korean cooking techniques", "Explore Korean culture through food"],
    age: "All ages",
    equipment: "Apron and enthusiasm",
    linkName: "koreancooking"
  },
  {
    name: "Piano",
    description: "The Piano Academy offers personalized piano lessons for beginners, covering fundamental music theories and techniques.",
    price: 100,
    schedule: "10:00 AM - 11:30 AM",
    teacher: { name: "Hannah Choi", email: "hannah@iyfusa.org", phone: "" },
    hasLevels: false,
    levels: [],
    order: 7,
    enabled: true,
    image: "https://firebasestorage.googleapis.com/v0/b/iyf-orlando-academy.appspot.com/o/2026%2F2026%20IYF%20Orlando%20Academy%2FPoster%2F2026_Spring_Semester_Piano_Academy.png?alt=media&token=e7d96722-1c3b-449b-9296-f24a55a18057",
    tag: "Music",
    catchPhrase: "Play your heart out!",
    goal: ["Master piano techniques", "Learn music theory"],
    age: "6 yrs to adult",
    equipment: "Piano or keyboard, sheet music",
    linkName: "piano"
  },
  {
    name: "Pickleball",
    description: "Learn how to play the fastest growing sport in America!",
    price: 50,
    schedule: "7:15 AM - 9:15 AM",
    teacher: { name: "Jennie Godfrey", email: "ngolf@proton.me", phone: "" },
    hasLevels: false,
    levels: [],
    order: 8,
    enabled: true,
    image: "https://firebasestorage.googleapis.com/v0/b/iyf-orlando-academy.appspot.com/o/2026%2F2026%20IYF%20Orlando%20Academy%2FPoster%2F2026_Spring_Semester_Pickleball_Academy.png?alt=media&token=62bb95c5-e620-49aa-8e18-8dfd46ff8f4e",
    tag: "Sports",
    catchPhrase: "Pickleball for everyone!",
    goal: ["Gain proficiency in skills", "Learn strategy"],
    age: "14 yrs to adult",
    equipment: "Pickleball paddle and ball",
    linkName: "pickleball"
  },
  {
    name: "Soccer",
    description: "Dive into the exciting world of soccer! Students will learn essential soccer skills like ball control, accurate passing, and powerful shooting.",
    price: 50,
    schedule: "9:00 AM - 10:30 AM",
    teacher: { name: "Jod Louis", email: "ing.jod@gmail.com", phone: "" },
    hasLevels: false,
    levels: [],
    order: 9,
    enabled: true,
    image: "https://firebasestorage.googleapis.com/v0/b/iyf-orlando-academy.appspot.com/o/2026%2F2026%20IYF%20Orlando%20Academy%2FPoster%2F2026_Spring_Semester_Soccer_Academy.png?alt=media&token=bcffa7d9-d0b9-4c63-acf8-dceac453fb24",
    tag: "Sports",
    catchPhrase: "Learn the game, Love the game!",
    goal: ["Build fundamental techniques", "Foster sportsmanship"],
    age: "5 yrs to 15 yrs",
    equipment: "Soccer ball and athletic shoes",
    linkName: "soccer"
  },
  {
    name: "Taekwondo",
    description: "Master the art of Taekwondo while building discipline, focus, and physical strength.",
    price: 100,
    schedule: "9:20 AM - 10:20 AM & 10:30 AM - 11:30 AM",
    teacher: { name: "Megan", email: "", phone: "" },
    hasLevels: false,
    levels: [],
    order: 10,
    enabled: true,
    image: "https://firebasestorage.googleapis.com/v0/b/iyf-orlando-academy.appspot.com/o/2026%2F2026%20IYF%20Orlando%20Academy%2FPoster%2F2026_Spring_Semester_Taekwondo_Academy.png?alt=media&token=540345fe-b859-41ca-87cd-c7f7e10061f8",
    tag: "Sports",
    catchPhrase: "Focus and Strength!",
    goal: ["Learn defensive techniques", "Build discipline"],
    age: "6 yrs to adult",
    equipment: "Uniform",
    linkName: "taekwondo"
  }
]

/**
 * Seed academies to Firestore
 */
async function seedAcademies() {
  try {
    console.log('🌱 Starting to seed academies to Firebase...')
    console.log(`📦 Collection: ${COLLECTIONS_CONFIG.academies2026Spring}`)
    
    const academiesRef = collection(db, COLLECTIONS_CONFIG.academies2026Spring)
    
    // Check if academies already exist
    const existingSnapshot = await getDocs(academiesRef)
    if (!existingSnapshot.empty) {
      console.log(`⚠️  Found ${existingSnapshot.size} existing academies in the collection`)
      console.log('   Existing academies will be updated/merged with new data')
    }
    
    let created = 0
    let updated = 0
    
    for (const academy of ACADEMIES_2026_SPRING) {
      // Use academy name as document ID (normalized)
      const docId = academy.name.toLowerCase().replace(/\s+/g, '_')
      const academyRef = doc(db, COLLECTIONS_CONFIG.academies2026Spring, docId)
      
      // Check if document exists
      const existingDoc = existingSnapshot.docs.find(d => d.id === docId)
      
      if (existingDoc) {
        // Update existing document
        await setDoc(academyRef, {
          ...academy,
          updatedAt: new Date().toISOString()
        }, { merge: true })
        updated++
        console.log(`   ✅ Updated: ${academy.name} ($${academy.price})`)
      } else {
        // Create new document
        await setDoc(academyRef, {
          ...academy,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        created++
        console.log(`   ✨ Created: ${academy.name} ($${academy.price})`)
      }
      
      // Log schedule info
      if (academy.hasLevels && academy.levels) {
        console.log(`      Levels: ${academy.levels.map(l => `${l.name} (${l.schedule})`).join(', ')}`)
      } else {
        console.log(`      Schedule: ${academy.schedule}`)
      }
    }
    
    console.log('\n✅ Seeding completed!')
    console.log(`   Created: ${created} academies`)
    console.log(`   Updated: ${updated} academies`)
    console.log(`   Total: ${ACADEMIES_2026_SPRING.length} academies`)
    
    // Verify the data
    console.log('\n🔍 Verifying data...')
    const verifySnapshot = await getDocs(academiesRef)
    console.log(`   Found ${verifySnapshot.size} academies in collection`)
    
    verifySnapshot.forEach((docSnap) => {
      const data = docSnap.data()
      console.log(`   - ${data.name}: $${data.price} | ${data.schedule || 'Multiple schedules'}`)
    })
    
    console.log('\n🎉 All done!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error seeding academies:', error)
    process.exit(1)
  }
}

// Run the seed function
seedAcademies()
