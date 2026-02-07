
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import * as dotenv from 'dotenv';
dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkAcademies() {
  console.log('Fetching registrations...');
  const querySnapshot = await getDocs(collection(db, 'registrations_2026_spring'));
  const counts = {};
  
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    const academies = [];
    
    // Check legacy fields
    if (data.firstPeriod?.academy) {
       academies.push({ 
         name: data.firstPeriod.academy, 
         level: data.firstPeriod.level 
       });
    }
    if (data.secondPeriod?.academy) {
       academies.push({ 
         name: data.secondPeriod.academy, 
         level: data.secondPeriod.level 
       });
    }

    // Check new array
    if (data.selectedAcademies && Array.isArray(data.selectedAcademies)) {
      data.selectedAcademies.forEach((a) => {
        if (a.academy) {
           academies.push({ name: a.academy, level: a.level });
        }
      });
    }
    
    academies.forEach(a => {
      // Normalize name for key to see basic distribution
      const safeName = (a.name || 'Unknown').trim();
      const safeLevel = (a.level || 'No Level').trim();
      const key = `${safeName} | ${safeLevel}`;
      counts[key] = (counts[key] || 0) + 1;
    });
  });
  
  console.log('--- ACADEMY COUNTS ---');
  Object.entries(counts)
    .sort((a,b) => b[1] - a[1]) // Sort by count desc
    .forEach(([k,v]) => console.log(`${k}: ${v}`));
    
  process.exit(0);
}

checkAcademies().catch(e => {
  console.error(e);
  process.exit(1);
});
