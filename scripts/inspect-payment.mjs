
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

const PAY_COLLECTION = 'academy_payments_2026';
const TARGET_INVOICE_ID = 'LIaUwOTlEavHWpuToWMx';

async function run() {
  console.log(`🔍 Finding Payment for Invoice ${TARGET_INVOICE_ID}...`);
  
  const q = query(collection(db, PAY_COLLECTION), where('invoiceId', '==', TARGET_INVOICE_ID));
  const snap = await getDocs(q);
  
  if (!snap.empty) {
      snap.forEach(d => {
          console.log(`Payment Found: ${d.id}`);
          console.log(JSON.stringify(d.data(), null, 2));
      });
  } else {
      console.log('No payment found for this Invoice ID.');
  }

  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
