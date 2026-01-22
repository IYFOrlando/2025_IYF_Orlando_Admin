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
    price: 100, // in dollars
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
    schedule: "10:00 AM - 11:30 AM", // Default schedule
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
