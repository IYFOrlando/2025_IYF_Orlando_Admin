
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs
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

// From shared.js
const PAY_COLLECTION = 'academy_payments_2026';

async function run() {
  console.log('🔍 Checking Payments Collection...');
  
  const snap = await getDocs(collection(db, PAY_COLLECTION));
  console.log(`\nFound ${snap.size} payment records total.`);

  if (snap.size > 0) {
      console.log('\n--- Recent Payments ---');
      const payments = [];
      snap.forEach(d => payments.push({ id:d.id, ...d.data() }));
      
      // Sort by createdAt desc
      payments.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

      payments.slice(0, 15).forEach(p => {
          const date = p.createdAt?.toDate ? p.createdAt.toDate().toISOString() : 'Unknown Date';
          console.log(` - Used for IDs: Invoice[${p.invoiceId}] Student[${p.studentName}] Amount[$${p.amount}] Date[${date}] Method[${p.method}]`);
      });
  }

  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
