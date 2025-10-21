// Script to create Taste of Korea event
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore'

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

async function createTasteOfKoreaEvent() {
  try {
    console.log('Creating Taste of Korea event...')
    
    const eventData = {
      name: 'Taste of Korea 2024',
      description: 'Annual Taste of Korea event featuring Korean food, culture, and entertainment',
      date: '2024-11-08', // November 8th, 2024
      startTime: '08:00',
      endTime: '20:00',
      location: 'IYF Orlando Academy',
      status: 'upcoming',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }
    
    const docRef = await addDoc(collection(db, 'events'), eventData)
    console.log('✅ Taste of Korea event created with ID:', docRef.id)
    
    // Create a second event for Sunday
    const sundayEventData = {
      name: 'Taste of Korea 2024 - Day 2',
      description: 'Second day of Taste of Korea event',
      date: '2024-11-09', // November 9th, 2024
      startTime: '12:00',
      endTime: '18:00',
      location: 'IYF Orlando Academy',
      status: 'upcoming',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }
    
    const sundayDocRef = await addDoc(collection(db, 'events'), sundayEventData)
    console.log('✅ Taste of Korea Day 2 event created with ID:', sundayDocRef.id)
    
  } catch (error) {
    console.error('❌ Error creating Taste of Korea event:', error)
  }
}

createTasteOfKoreaEvent()
