
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  serverTimestamp
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

// Collections
const INV_COLLECTION = '2026_spring_academy_invoices_2026';
const PAY_COLLECTION = 'academy_payments_2026';
const REG_COLLECTION = '2026-iyf_orlando_academy_spring_semester';

async function run() {
  console.log('🚑 Starting Invoice Restoration...');
  
  const snap = await getDocs(collection(db, PAY_COLLECTION));
  const payments = [];
  snap.forEach(d => payments.push({ id:d.id, ...d.data() }));

  let restoredCount = 0;

  for (const p of payments) {
      if (!p.invoiceId) continue;

      // Check if invoice exists
      const invRef = doc(db, INV_COLLECTION, p.invoiceId);
      const invSnap = await getDoc(invRef);

      if (!invSnap.exists()) {
          console.log(`\nFound Orphan Payment ${p.id} ($${p.amount/100})`);
          
          if (!p.studentId) {
              console.log('   ❌ Cannot restore: Missing studentId in payment.');
              continue;
          }

          // Fetch Student
          const regRef = doc(db, REG_COLLECTION, p.studentId);
          const regSnap = await getDoc(regRef);

          if (!regSnap.exists()) {
              console.log(`   ❌ Cannot restore: Student registration ${p.studentId} not found.`);
              continue;
          }

          const regData = regSnap.data();
          const studentName = `${regData.firstName || ''} ${regData.lastName || ''}`.trim();

          console.log(`   👤 Restoring for Student: ${studentName}`);

          // Create New Invoice
          // Assuming the invoice total matched the payment amount for now, to make it 'paid'
          const newInvoiceData = {
              studentId: p.studentId,
              studentName: studentName,
              status: 'paid',
              total: p.amount,
              paid: p.amount,
              balance: 0,
              lines: [
                  { description: 'Tuition Fee (Restored)', amount: p.amount, academy: 'General' }
              ],
              createdAt: p.createdAt || serverTimestamp(),
              updatedAt: serverTimestamp(),
              isRestored: true
          };

          const newInvRef = await addDoc(collection(db, INV_COLLECTION), newInvoiceData);
          console.log(`   ✅ Created New Invoice: ${newInvRef.id}`);

          // Update Payment to link to new invoice
          await updateDoc(doc(db, PAY_COLLECTION, p.id), {
              invoiceId: newInvRef.id
          });
          console.log(`   🔗 Relinked Payment to New Invoice.`);
          
          restoredCount++;
      }
  }

  console.log(`\n✅ Restoration Complete. Restored ${restoredCount} invoices.`);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
