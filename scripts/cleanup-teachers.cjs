/**
 * Cleanup Script: Deduplicate teachers in 'teachers' collection
 * 
 * This script identifies multiple documents for the same teacher (by email),
 * merges their data, ensure the ID is the lowercase email,
 * and deletes extra/orphaned documents.
 * 
 * Usage:
 *   node scripts/cleanup-teachers.cjs --dry-run
 *   node scripts/cleanup-teachers.cjs
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Parse CLI args
const isDryRun = process.argv.includes('--dry-run');

// Initialize Firebase Admin
let app;
try {
  const serviceAccountPath = path.join(__dirname, 'service-account.json');
  
  if (fs.existsSync(serviceAccountPath)) {
    console.log(`🔑 Using local service account key at: ${serviceAccountPath}`);
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: 'iyf-orlando-academy'
    });
  } else {
    console.log(`⚠️  Local key NOT found at: ${serviceAccountPath}`);
    console.log('🌐 Trying application default credentials...');
    app = admin.apps.length > 0 
      ? admin.app() 
      : admin.initializeApp({
          credential: admin.credential.applicationDefault(),
          projectId: 'iyf-orlando-academy'
        });
  }
} catch (error) {
  console.error('❌ Error initializing Firebase Admin:', error.message);
  process.exit(1);
}

const db = admin.firestore();

async function cleanupTeachers() {
  console.log('🧹 Starting Teacher Deduplication Cleanup...\n');
  console.log(`Mode: ${isDryRun ? '🔍 DRY RUN (no changes)' : '🚀 LIVE CLEANUP'}\n`);

  try {
    const snapshot = await db.collection('teachers').get();
    console.log(`Found ${snapshot.size} documents in 'teachers' collection.\n`);

    const teachersByEmail = new Map(); // email -> Array of {id, data}

    snapshot.forEach(doc => {
      const data = doc.data();
      if (!data.email) {
        console.warn(`   ⚠️  Found doc ${doc.id} with NO email (${data.name || 'Unknown'}). Skipping.`);
        return;
      }
      
      const email = data.email.toLowerCase().trim();
      if (!teachersByEmail.has(email)) {
        teachersByEmail.set(email, []);
      }
      teachersByEmail.get(email).push({ id: doc.id, data });
    });

    console.log(`Mapped ${teachersByEmail.size} unique teacher emails.\n`);

    let totalDeleted = 0;
    let totalMerged = 0;

    for (const [email, docs] of teachersByEmail) {
      if (docs.length > 1 || docs[0].id !== email) {
        console.log(`🔄 Processing ${email} (${docs.length} docs found)...`);
        
        // Merge strategy:
        // 1. Prioritize document where ID === email
        // 2. Otherwise, merge all data (later docs overwrite earlier ones, but keep any unique fields)
        
        let mergedData = {};
        const docsToDelete = [];
        
        // Sort to have the one with the correct ID first if it exists
        docs.sort((a, b) => (a.id === email ? -1 : b.id === email ? 1 : 0));
        
        // Accumulate data
        docs.forEach(doc => {
          mergedData = { ...mergedData, ...doc.data };
          if (doc.id !== email) {
            docsToDelete.push(doc.id);
          }
        });

        // Ensure current timestamps
        mergedData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
        if (!mergedData.createdAt) {
          mergedData.createdAt = admin.firestore.FieldValue.serverTimestamp();
        }

        if (isDryRun) {
          console.log(`   [DRY] Would save merged data to ID: ${email}`);
          console.log(`   [DRY] Would delete orphaned IDs: ${docsToDelete.join(', ')}`);
        } else {
          // Write the merged doc with email as ID
          await db.collection('teachers').doc(email).set(mergedData);
          console.log(`   ✅ Saved merged data to: ${email}`);
          
          // Delete orphaned docs
          for (const id of docsToDelete) {
             await db.collection('teachers').doc(id).delete();
             console.log(`   ❌ Deleted orphaned doc: ${id}`);
             totalDeleted++;
          }
          totalMerged++;
        }
      }
    }

    console.log(`\n📊 Cleanup Summary:`);
    console.log(`   Total Merged/Restructured: ${totalMerged}`);
    console.log(`   Total Documents Deleted: ${totalDeleted}`);
    
    if (isDryRun) {
      console.log('\n💡 Run WITHOUT --dry-run to apply changes.');
    } else {
      console.log('\n✅ Cleanup Finished Successfully.');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
}

cleanupTeachers();
