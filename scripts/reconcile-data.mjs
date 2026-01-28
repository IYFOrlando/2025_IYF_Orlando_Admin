
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc,
  updateDoc,
  addDoc,
  query,
  where, 
  serverTimestamp,
  orderBy
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
const ACADEMY_COLLECTION = 'academies_2026_spring';

// Helper to normalize strings
function norm(s) { return (s || '').toString().trim().toLowerCase(); }

async function getPricing() {
  console.log('Fetching pricing...');
  const snap = await getDocs(query(collection(db, ACADEMY_COLLECTION), orderBy('order', 'asc')));
  const prices = {};
  snap.forEach(d => {
    const data = d.data();
    if (data.name && typeof data.price === 'number') {
      prices[norm(data.name)] = data.price * 100; // cents
    }
  });
  return { academyPrices: prices, lunch: { semester: 4000, single: 400 } };
}

async function run() {
  console.log('🚀 Starting Data Reconciliation...');
  
  // 1. Get Pricing
  const pricing = await getPricing();
  console.log(`💰 Loaded prices for ${Object.keys(pricing.academyPrices).length} academies.`);

  // 2. Get All Registrations
  console.log('📂 Fetching registrations...');
  const regSnap = await getDocs(collection(db, REG_COLLECTION));
  console.log(`📋 Found ${regSnap.size} registrations.`);

  // 3. Get All Invoices to check existence
  console.log('🧾 Fetching invoices...');
  const invSnap = await getDocs(collection(db, INV_COLLECTION));
  const invoiceMap = new Set(); // studentId -> boolean
  invSnap.forEach(d => invoiceMap.add(d.data().studentId));
  console.log(`🧾 Found ${invSnap.size} existing invoices.`);

  let updatedCount = 0;
  let invoiceCount = 0;

  for (const docSnap of regSnap.docs) {
    const data = docSnap.data();
    const id = docSnap.id;
    let needsUpdate = false;
    let updates = {};

    // --- A. Normalize Data Structure ---
    // If selectedAcademies is missing or empty, try to build it from legacy p1/p2
    let academies = data.selectedAcademies || [];
    if (!academies.length) {
      if (data.firstPeriod?.academy && data.firstPeriod.academy !== 'N/A') {
        academies.push({ academy: data.firstPeriod.academy, level: data.firstPeriod.level || null });
      }
      if (data.secondPeriod?.academy && data.secondPeriod.academy !== 'N/A') {
        // Avoid duplicate if same academy
        if (data.secondPeriod.academy !== data.firstPeriod?.academy) {
           academies.push({ academy: data.secondPeriod.academy, level: data.secondPeriod.level || null });
        }
      }
      if (academies.length > 0) {
        updates.selectedAcademies = academies;
        needsUpdate = true;
        console.log(`   🔄 [${id}] Unifying data: Created selectedAcademies from legacy fields.`);
      }
    }

    // Perform Update if needed
    if (needsUpdate) {
      await updateDoc(doc(db, REG_COLLECTION, id), updates);
      updatedCount++;
    }

    // --- B. Generate Missing Invoice ---
    if (!invoiceMap.has(id)) {
      // Calculate lines
      // Use the 'academies' array we just ensured exists (or existed)
      const lines = [];
      let subtotal = 0;

      academies.forEach((a, idx) => {
         const pName = norm(a.academy);
         const price = pricing.academyPrices[pName] || 0;
         if (price === 0) console.warn(`   ⚠️ No price found for ${a.academy}`);
         
         const line = {
           academy: a.academy,
           period: idx + 1,
           level: a.level || null,
           unitPrice: price,
           qty: 1,
           amount: price
         };
         lines.push(line);
         subtotal += price;
      });

      if (lines.length > 0) {
        const studentName = [data.firstName, data.lastName].filter(Boolean).join(' ') || 'Unknown';
        
        const newInv = {
          studentId: id,
          studentName,
          lines,
          subtotal,
          lunch: { semesterSelected: false, singleQty: 0, prices: pricing.lunch },
          lunchAmount: 0,
          discountAmount: 0,
          discountNote: null,
          total: subtotal,
          paid: 0,
          balance: subtotal,
          status: 'unpaid',
          method: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        await addDoc(collection(db, INV_COLLECTION), newInv);
        invoiceCount++;
        console.log(`   ➕ [${id}] Created Invoice for ${studentName}: $${subtotal/100}`);
      } else {
        console.log(`   ⚠️ [${id}] No academies found, skipping invoice.`);
      }
    }
  }

  console.log('\n✅ Reconciliation Complete.');
  console.log(`   - Registrations Updated (Unified): ${updatedCount}`);
  console.log(`   - Invoices Generated: ${invoiceCount}`);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
