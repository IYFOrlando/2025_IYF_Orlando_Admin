/**
 * Import registrations from spring_academy_2026 into 2026-iyf_orlando_academy_spring_semester
 * Only imports documents registered on January 17 and excludes drafts.
 *
 * Usage:
 *   node scripts/import-spring-academy-registrations.cjs
 *
 * Requires: GOOGLE_APPLICATION_CREDENTIALS or gcloud auth application-default login
 */

const admin = require('firebase-admin');

const SOURCE_COLLECTION = 'spring_academy_2026';
const TARGET_COLLECTION = '2026-iyf_orlando_academy_spring_semester';

// Only import registrations from this date (year, month 0-based, day)
const TARGET_DATE = { year: 2026, month: 0, day: 17 };

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
  
  // Create Date objects for the range
  const start = new Date(Date.UTC(2026, 0, 17, 5, 0, 0)).getTime();
  const end = new Date(Date.UTC(2026, 0, 18, 5, 0, 0)).getTime();
  
  return dateMs >= start && dateMs < end;
}

function toPlainData(data) {
  const out = { ...data };
  // Normalize createdAt for Firestore (avoid storing invalid or client-only types)
  const t = out.createdAt;
  if (t) {
    if (typeof t.toMillis === 'function') {
      out.createdAt = admin.firestore.Timestamp.fromMillis(t.toMillis());
    } else if (typeof t.toDate === 'function') {
      out.createdAt = admin.firestore.Timestamp.fromDate(t.toDate());
    } else {
      const sec = t.seconds ?? t._seconds;
      if (typeof sec === 'number') {
        out.createdAt = admin.firestore.Timestamp.fromMillis(sec * 1000);
      }
    }
  }
  return out;
}

async function run() {
  let app;
  try {
    app =
      admin.apps.length > 0
        ? admin.app()
        : admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            projectId: 'iyf-orlando-academy',
          });
  } catch (err) {
    console.error('❌ Error initializing Firebase Admin:', err.message);
    console.log('\n💡 Set GOOGLE_APPLICATION_CREDENTIALS or run: gcloud auth application-default login');
    process.exit(1);
  }

  const db = admin.firestore();

  console.log(`📂 Source: ${SOURCE_COLLECTION}`);
  console.log(`📂 Target: ${TARGET_COLLECTION}`);
  console.log(`📅 Date filter: ${TARGET_DATE.year}-${String(TARGET_DATE.month + 1).padStart(2, '0')}-${String(TARGET_DATE.day).padStart(2, '0')} (UTC)`);
  console.log('⏳ Excluding drafts (isDraft or status === "draft")\n');

  const snap = await db.collection(SOURCE_COLLECTION).get();

  if (snap.empty) {
    console.log('⚠️  No documents in source collection.');
    process.exit(0);
  }

  const toImport = [];
  let skippedDate = 0;
  let skippedDraft = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    if (isDraft(data)) {
      skippedDraft++;
      continue;
    }
    const ms = getCreatedAtMs(data);
    if (!isJanuary17(ms)) {
      skippedDate++;
      continue;
    }
    toImport.push({ id: docSnap.id, data });
  }

  console.log(`📋 Total in source: ${snap.size}`);
  console.log(`   Skipped (not Jan 17): ${skippedDate}`);
  console.log(`   Skipped (draft): ${skippedDraft}`);
  console.log(`   To import: ${toImport.length}\n`);

  if (toImport.length === 0) {
    console.log('Nothing to import.');
    process.exit(0);
  }

  const targetRef = db.collection(TARGET_COLLECTION);
  let imported = 0;

  for (const { id, data } of toImport) {
    const plain = toPlainData(data);
    await targetRef.add(plain);
    imported++;
    const label = [plain.firstName, plain.lastName].filter(Boolean).join(' ') || id.slice(0, 8);
    console.log(`   ✅ [${imported}/${toImport.length}] ${label}`);
  }

  console.log(`\n✅ Done. Imported ${imported} registrations into ${TARGET_COLLECTION}.`);
}

run().catch((err) => {
  console.error('❌', err);
  process.exit(1);
});
