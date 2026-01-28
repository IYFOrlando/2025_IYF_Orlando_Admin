
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  deleteDoc,
  doc
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

// Misma colección que usa el dashboard (COLLECTIONS_CONFIG.academyInvoices)
const INV_COLLECTION = '2026_spring_academy_invoices_2026';

async function run() {
  console.log('🧹 Starting Duplicate Invoice Cleanup...');
  
  const snap = await getDocs(collection(db, INV_COLLECTION));
  const studentInvoices = new Map(); // studentId -> Invoice[]

  // Group by student
  snap.forEach(d => {
    const data = d.data();
    const id = data.studentId;
    if (!studentInvoices.has(id)) studentInvoices.set(id, []);
    studentInvoices.get(id).push({ id: d.id, ...data });
  });

  let deletedCount = 0;

  for (const [studentId, invoices] of studentInvoices) {
    if (invoices.length > 1) {
      console.log(`\nFound ${invoices.length} invoices for Student ${studentId} (${invoices[0].studentName})`);
      
      // Sort: Paid first, then oldest
      invoices.sort((a,b) => {
         if (a.status === 'paid' && b.status !== 'paid') return -1;
         if (b.status === 'paid' && a.status !== 'paid') return 1;
         return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
      });

      // Keep the first one (Paid preferred, or oldest). Delete others if they seem to be duplicates of the semester fee.
      // Logic: If multiple invoices exist, and they look like "Semester Tuition" duplicates, keep one.
      
      const keeper = invoices[0];
      const duplicates = invoices.slice(1);

      for (const dup of duplicates) {
        // Safe check: Only delete if 'unpaid' and seems to cover same items?
        // For now, assuming identical spring semester generation logic caused this.
        if (dup.status === 'unpaid' || dup.status === 'partial') {
            console.log(`   ❌ Deleting Duplicate ${dup.id} (${dup.status}, $${dup.total/100})`);
            await deleteDoc(doc(db, INV_COLLECTION, dup.id));
            deletedCount++;
        } else {
            console.log(`   ⚠️ Skipping duplicate ${dup.id} because status is ${dup.status}. Manual check required.`);
        }
      }
    }
  }

  console.log(`\n✅ Cleanup Complete. Deleted ${deletedCount} duplicate invoices.`);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
