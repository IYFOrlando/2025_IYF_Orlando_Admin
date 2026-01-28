
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  query,
  where
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBVBE2Cb5UFePdUOlTWVPPwGZCzH9lUtRQ",
  authDomain: "iyf-orlando-academy.firebaseapp.com",
  projectId: "iyf-orlando-academy",
  storageBucket: "iyf-orlando-academy.appspot.com",
  messagingSenderId: "321117265409",
  appId: "1:321117265409:web:27dc40234503505a3eaa00",
  measurementId: "G-H4FJCX8JT0"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const INV_COLLECTION = '2026_spring_academy_invoices_2026';

async function run() {
  console.log('🔍 Checking for Paid/Partial invoices...');
  
  const snap = await getDocs(collection(db, INV_COLLECTION));
  let paidCount = 0;
  let partialCount = 0;
  const paidNames = [];

  snap.forEach(d => {
    const data = d.data();
    if (data.status === 'paid') {
      paidCount++;
      paidNames.push(`${data.studentName} ($${(data.total/100).toFixed(2)})`);
    } else if (data.status === 'partial') {
      partialCount++;
      paidNames.push(`${data.studentName} [PARTIAL] ($${(data.paid/100).toFixed(2)} / $${(data.total/100).toFixed(2)})`);
    }
  });

  console.log(`\nFound ${paidCount} PAID invoices and ${partialCount} PARTIAL invoices.`);
  
  if (paidNames.length > 0) {
      console.log('\n--- List of Students with Payments ---');
      // Sort alphabetically
      paidNames.sort();
      paidNames.forEach(n => console.log(` - ${n}`));
  }

  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
