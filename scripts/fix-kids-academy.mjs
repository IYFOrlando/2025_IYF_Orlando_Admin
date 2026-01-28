
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc,
  updateDoc,
  query,
  where, 
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

const REG_COLLECTION = '2026-iyf_orlando_academy_spring_semester';
const INV_COLLECTION = 'academy_invoices_2026';

const PRICE_KIDS_ACADEMY = 5000; // $50.00
const CORRECT_NAME = "Kids Academy";
const WRONG_NAME = "Kids";

async function run() {
  console.log('🔧 Starting Data Fix for "Kids" -> "Kids Academy"...');
  
  // 1. Find Registrations with "Kids"
  const regSnap = await getDocs(collection(db, REG_COLLECTION));
  let fixedCount = 0;

  for (const docSnap of regSnap.docs) {
    const data = docSnap.data();
    const academies = data.selectedAcademies || [];
    let needsUpdate = false;
    
    // Check and Fix Registration
    const newAcademies = academies.map(a => {
        if (a.academy === WRONG_NAME) {
            needsUpdate = true;
            return { ...a, academy: CORRECT_NAME }; // Fix Name
        }
        return a;
    });

    if (needsUpdate) {
        console.log(`   📝 Fixing Registration for ${data.firstName} ${data.lastName} (${docSnap.id})`);
        await updateDoc(doc(db, REG_COLLECTION, docSnap.id), { selectedAcademies: newAcademies });
        
        // 2. Fix Invoice
        const invSnap = await getDocs(query(collection(db, INV_COLLECTION), where('studentId', '==', docSnap.id)));
        if (!invSnap.empty) {
            const invDoc = invSnap.docs[0];
            const invData = invDoc.data();
            
            // Rebuild lines
            const newLines = invData.lines.map(l => {
                if (l.academy === WRONG_NAME) {
                    return { ...l, academy: CORRECT_NAME, unitPrice: PRICE_KIDS_ACADEMY, amount: PRICE_KIDS_ACADEMY };
                }
                return l;
            });

            // Recalculate
            const newSub = newLines.reduce((s,l) => s + l.amount, 0);
            const newTotal = Math.max(0, newSub + (invData.lunchAmount||0) - (invData.discountAmount||0));
            const newBalance = newTotal - (invData.paid||0);
            const newStatus = newBalance <= 0 ? 'paid' : (invData.paid > 0 ? 'partial' : 'unpaid');

            console.log(`      🧾 Updating Invoice: Total $${invData.total/100} -> $${newTotal/100}`);
            await updateDoc(doc(db, INV_COLLECTION, invDoc.id), {
                lines: newLines,
                subtotal: newSub,
                total: newTotal,
                balance: newBalance,
                status: newStatus,
                updatedAt: serverTimestamp()
            });
            fixedCount++;
        }
    }
  }

  console.log(`\n✅ Fix Complete. Fixed ${fixedCount} student records.`);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
