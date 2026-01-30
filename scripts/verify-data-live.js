
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs } from 'firebase/firestore'
import { COLLECTIONS_CONFIG } from '../src/config/shared.js'

// Firebase configuration (from shared.js)
const firebaseConfig = {
  apiKey: "AIzaSyBVBE2Cb5UFePdUOlTWVPPwGZCzH9lUtRQ",
  authDomain: "iyf-orlando-academy.firebaseapp.com",
  projectId: "iyf-orlando-academy",
  storageBucket: "iyf-orlando-academy.appspot.com",
  messagingSenderId: "321117265409",
  appId: "1:321117265409:web:27dc40234503505a3eaa00",
  measurementId: "G-H4FJCX8JT0",
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function verifyData() {
  console.log('🔍 Verifying data in:', COLLECTIONS_CONFIG.academies2026Spring)
  const querySnapshot = await getDocs(collection(db, COLLECTIONS_CONFIG.academies2026Spring))
  
  if (querySnapshot.empty) {
    console.log('❌ Collection is empty!')
    return
  }

  console.log(`✅ Found ${querySnapshot.size} documents.`)
  
  querySnapshot.forEach((doc) => {
    const data = doc.data()
    console.log('\n---------------------------------------------------')
    console.log(`ID: ${doc.id}`)
    console.log(`Name: ${data.name}`)
    console.log(`Has new fields?`)
    console.log(`- Image: ${data.image ? '✅ ' + data.image.substring(0, 30) + '...' : '❌ Missing'}`)
    console.log(`- Tag: ${data.tag || '❌ Missing'}`)
    console.log(`- CatchPhrase: ${data.catchPhrase || '❌ Missing'}`)
    console.log(`- Teacher: ${data.teacher ? `✅ ${data.teacher.name}` : '❌ Missing'}`)
  })
}

verifyData().then(() => process.exit(0)).catch(console.error)
