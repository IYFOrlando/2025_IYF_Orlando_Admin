
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs,
  getDoc,
  doc,
  updateDoc
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
const PAY_COLLECTION = 'academy_payments_2026';

async function run() {
  console.log('🔍 Reconciling Payments vs Invoices...');
  
  const snap = await getDocs(collection(db, PAY_COLLECTION));
  const payments = [];
  snap.forEach(d => payments.push({ id:d.id, ...d.data() }));

  console.log(`Found ${payments.length} payments.`);

  for (const p of payments) {
      if (!p.invoiceId) {
          console.log(`⚠️ Payment ${p.id} has NO invoiceId.`);
          continue;
      }

      const invRef = doc(db, INV_COLLECTION, p.invoiceId);
      const invSnap = await getDoc(invRef);

      if (!invSnap.exists()) {
          console.log(`❌ Invoice ${p.invoiceId} (Amount $${p.amount/100}) NOT FOUND. Payment orphaned.`);
      } else {
          const invData = invSnap.data();
          const expectedStatus = 'paid'; // simplify for now, check amounts later
          console.log(`✅ Invoice ${p.invoiceId} found. Status: [${invData.status}]. Student: ${invData.studentName}`);

          if (invData.status !== 'paid' && invData.status !== 'partial') {
              console.log(`   ⚠️ MISMATCH: Payment exists but invoice is ${invData.status}. Should be paid?`);
              // Uncomment to auto-fix
              // await updateDoc(invRef, { status: 'paid', paid: (invData.paid || 0) + p.amount });
              // console.log('   🛠️ FIXED status to paid.');
          }
      }
  }

  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
