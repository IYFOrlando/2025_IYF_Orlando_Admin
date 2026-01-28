
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

const STUDENT_ID = 'AtJCEwc5JD9KiBo16W29';
const INV_COLLECTION = 'academy_invoices_2026';
const PAY_COLLECTION = 'academy_payments_2026';
const REG_COLLECTION = '2026-iyf_orlando_academy_spring_semester';
const ACADEMY_COLLECTION = 'academies_2026_spring';

async function run() {
  console.log(`🔍 Inspecting Student: ${STUDENT_ID}`);

  // 1. Get Registration
  const regSnap = await getDocs(query(collection(db, REG_COLLECTION), where('__name__', '==', STUDENT_ID)));
  if (regSnap.empty) {
      console.log('❌ Registration NOT FOUND');
  } else {
      const d = regSnap.docs[0].data();
      console.log('✅ Registration Found:');
      console.log('   Name:', d.firstName, d.lastName);
      console.log('   Selected Academies:', JSON.stringify(d.selectedAcademies));
  }

  // 2. Get Invoices
  console.log('\n🧾 Invoices:');
  const invSnap = await getDocs(query(collection(db, INV_COLLECTION), where('studentId', '==', STUDENT_ID)));
  invSnap.forEach(d => {
      const inv = d.data();
      console.log(`   - ID: ${d.id}`);
      console.log(`     Total: $${inv.total/100}`);
      console.log(`     Status: ${inv.status}`);
      console.log(`     Lines:`, JSON.stringify(inv.lines, null, 2));
  });

  // 4. Check Pricing
  console.log('\n💲 Available Academy Prices:');
  const priceSnap = await getDocs(collection(db, ACADEMY_COLLECTION));
  priceSnap.forEach(d => {
      const p = d.data();
      console.log(`   - ${p.name}: $${p.price}`);
  });

  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
