
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  addDoc, 
  Timestamp 
} from 'firebase/firestore';

// Hardcode config from .env since we can't easily read .env in pure node script without dotenv (which might be installed but let's be safe)
// Or I can require dotenv. package.json doesn't show dotenv explicitly, but vite uses it.
// I'll just hardcode the values from the .env I read earlier.

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

const SOURCE_COLLECTION = 'spring_academy_2026';
const TARGET_COLLECTION = '2026-iyf_orlando_academy_spring_semester';

function isDraft(data) {
  if (data.isDraft === true) return true;
  if (String(data.status || '').toLowerCase() === 'draft') return true;
  return false;
}

function getCreatedAtMs(data) {
  const t = data.createdAt;
  if (!t) return null;
  if (typeof t.toMillis === 'function') return t.toMillis();
  if (typeof t.toDate === 'function') return t.toDate().getTime();
  const sec = t.seconds ?? t._seconds;
  if (typeof sec === 'number') return sec * 1000;
  return null;
}

function isJanuary17(dateMs) {
  if (dateMs == null || isNaN(dateMs)) return false;
  // Orlando is EST (UTC-5)
  // Jan 17 00:00:00 EST = Jan 17 05:00:00 UTC
  // Jan 17 23:59:59 EST = Jan 18 04:59:59 UTC
  
  const start = new Date(Date.UTC(2026, 0, 17, 5, 0, 0)).getTime();
  const end = new Date(Date.UTC(2026, 0, 18, 5, 0, 0)).getTime();
  
  return dateMs >= start && dateMs < end;
}

function toPlainData(data) {
  const out = { ...data };
  // Preserve Timestamps if they are valid
  // But Client SDK re-reading them might result in different objects.
  // We want to write standard Firestore fields.
  // Since we are using Client SDK for both read and write, we might need to handle Timestamp conversion manually if data comes as raw JSON or something.
  // getDocs returns QueryDocumentSnapshot which has data().
  // The data() method converts Timestamps to Client SDK Timestamp objects.
  
  return out;
}

async function run() {
  console.log(`📂 Source: ${SOURCE_COLLECTION}`);
  console.log(`📂 Target: ${TARGET_COLLECTION}`);
  
  const sourceRef = collection(db, SOURCE_COLLECTION);
  const targetRef = collection(db, TARGET_COLLECTION);
  
  console.log('⏳ Fetching documents...');
  const snap = await getDocs(sourceRef);
  
  if (snap.empty) {
    console.log('⚠️  No documents in source collection.');
    return;
  }

  const toImport = [];
  let skippedDate = 0;
  let skippedDraft = 0;

  snap.forEach((docSnap) => {
    const data = docSnap.data();
    if (isDraft(data)) {
      skippedDraft++;
      return;
    }
    const ms = getCreatedAtMs(data);
    if (!isJanuary17(ms)) {
      skippedDate++;
      return;
    }
    toImport.push({ id: docSnap.id, data });
  });

  console.log(`📋 Total in source: ${snap.size}`);
  console.log(`   Skipped (not Jan 17 EST): ${skippedDate}`);
  console.log(`   Skipped (draft): ${skippedDraft}`);
  console.log(`   To import: ${toImport.length}\n`);

  if (toImport.length === 0) {
    console.log('Nothing to import.');
    return;
  }

  let imported = 0;
  for (const { id, data } of toImport) {
    try {
      // Use addDoc to let Firestore auto-generate ID, OR setDoc to preserve ID?
      // Script says "import", adding usually implies new IDs unless migration preserves them.
      // But addDoc is safer for avoiding overwrites if target allows only create.
      // Target allows create if true. Update if admin.
      // Since we are anonymous, we can ONLY create (addDoc). We CANNOT use setDoc with specific ID if that counts as "update" logic or if doc already exists.
      // Actually "create" rule allows setDoc for NEW documents.
      // But to be safe and simple, I'll use addDoc (new ID) or I could try preserving ID if needed.
      // User said "import them", usually preserving ID is better, but without Admin privileges I might not be able to "set" if rules differentiate create/update strictly.
      // Rule: allow create: if true. allow update: if isAdmin.
      // create rule applies when document does not exist.
      // So I CAN setDoc if it doesn't exist.
      // But use `addDoc` is guaranteed to work as "create".
      // Previous script used `targetRef.add(plain)` which is `addDoc`. I will follow that.
      
      const plain = toPlainData(data);
      // Remove ID from data if present to avoid confusion
      delete plain.id; 
      
      const docRef = await addDoc(targetRef, plain);
      imported++;
      
      const label = [plain.firstName, plain.lastName].filter(Boolean).join(' ') || id.toString().slice(0, 8);
      console.log(`   ✅ [${imported}/${toImport.length}] ${label} -> ${docRef.id}`);
    } catch (e) {
      console.error(`   ❌ Error importing ${id}:`, e.message);
    }
  }

  console.log(`\n✅ Done. Imported ${imported} registrations.`);
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
