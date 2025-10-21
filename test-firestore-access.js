// Test script to verify Firestore access
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)
const auth = getAuth(app)

async function testFirestoreAccess() {
  try {
    console.log('Testing Firestore access...')
    
    // Test collections
    const collections = [
      'volunteer_applications',
      'events', 
      'volunteer_hours',
      'settings'
    ]
    
    for (const collectionName of collections) {
      try {
        console.log(`\nTesting collection: ${collectionName}`)
        const colRef = collection(db, collectionName)
        const snapshot = await getDocs(colRef)
        console.log(`✅ ${collectionName}: ${snapshot.size} documents found`)
      } catch (error) {
        console.log(`❌ ${collectionName}: ${error.message}`)
      }
    }
    
  } catch (error) {
    console.error('Error testing Firestore access:', error)
  }
}

testFirestoreAccess()
