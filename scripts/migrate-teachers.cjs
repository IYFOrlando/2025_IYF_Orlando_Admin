/**
 * Migration Script: Consolidate teachers + teachers_index → teachers
 * 
 * This script merges the two teacher collections into one unified collection.
 * 
 * Usage:
 *   node scripts/migrate-teachers.cjs --dry-run   # Validation only
 *   node scripts/migrate-teachers.cjs             # Execute migration
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

async function migrateTeachers() {
  console.log('🔄 Starting Teacher Collection Migration...\n');
  console.log(`Mode: ${isDryRun ? '🔍 DRY RUN (no changes)' : '🚀 LIVE MIGRATION'}\n`);

  try {
    // Step 1: Fetch all teachers from both collections
    console.log('📥 Step 1: Fetching data from both collections...');
    
    const [teachersSnapshot, indexSnapshot] = await Promise.all([
      db.collection('teachers').get(),
      db.collection('teachers_index').get()
    ]);

    console.log(`   Found ${teachersSnapshot.size} docs in 'teachers'`);
    console.log(`   Found ${indexSnapshot.size} docs in 'teachers_index'\n`);

    // Step 2: Build maps
    console.log('🔨 Step 2: Building data maps...');
    
    const teachersMap = new Map();
    const indexMap = new Map();

    // Parse teachers collection (may have auto-generated IDs)
    teachersSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.email) {
        const email = data.email.toLowerCase().trim();
        teachersMap.set(email, { id: doc.id, ...data });
      }
    });

    // Parse teachers_index (email-based IDs)
    indexSnapshot.forEach(doc => {
      const email = doc.id.toLowerCase().trim();
      const data = doc.data();
      indexMap.set(email, { id: doc.id, ...data });
    });

    console.log(`   Mapped ${teachersMap.size} teachers by email`);
    console.log(`   Mapped ${indexMap.size} index entries by email\n`);

    // Step 3: Merge data
    console.log('🔗 Step 3: Merging data...');
    
    const mergedTeachers = new Map();
    const allEmails = new Set([...teachersMap.keys(), ...indexMap.keys()]);

    let merged = 0;
    let onlyInTeachers = 0;
    let onlyInIndex = 0;

    for (const email of allEmails) {
      const teacherData = teachersMap.get(email);
      const indexData = indexMap.get(email);

      if (teacherData && indexData) {
        // Both exist: merge
        mergedTeachers.set(email, {
          // Profile fields from teachers
          name: teacherData.name || indexData.name || '',
          email: email,
          phone: teacherData.phone || indexData.phone || '',
          photoURL: teacherData.photoURL || '',
          bio: teacherData.bio || '',
          credentials: teacherData.credentials || '',
          subjects: teacherData.subjects || [],
          
          // Auth/assignment fields from teachers_index
          assignments: indexData.assignments || [],
          authorizedAcademies: indexData.authorizedAcademies || [],
          authorizedAcademyIds: indexData.authorizedAcademyIds || [],
          
          // Timestamps
          createdAt: teacherData.createdAt || indexData.createdAt || admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        merged++;
      } else if (teacherData && !indexData) {
        // Only in teachers: might be incomplete (no assignments)
        console.log(`   ⚠️  Warning: "${teacherData.name}" (${email}) has no assignments/index entry`);
        mergedTeachers.set(email, {
          name: teacherData.name || '',
          email: email,
          phone: teacherData.phone || '',
          photoURL: teacherData.photoURL || '',
          bio: teacherData.bio || '',
          credentials: teacherData.credentials || '',
          subjects: teacherData.subjects || [],
          
          assignments: [],
          authorizedAcademies: [],
          authorizedAcademyIds: [],
          
          createdAt: teacherData.createdAt || admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        onlyInTeachers++;
      } else if (!teacherData && indexData) {
        // Only in index: has assignments but no profile
        console.log(`   ⚠️  Warning: "${indexData.name}" (${email}) has no profile in teachers collection`);
        mergedTeachers.set(email, {
          name: indexData.name || '',
          email: email,
          phone: indexData.phone || '',
          photoURL: '',
          bio: '',
          credentials: '',
          subjects: [],
          
          assignments: indexData.assignments || [],
          authorizedAcademies: indexData.authorizedAcademies || [],
          authorizedAcademyIds: indexData.authorizedAcademyIds || [],
          
          createdAt: indexData.createdAt || admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        onlyInIndex++;
      }
    }

    console.log(`   ✅ Merged ${merged} teachers with complete data`);
    console.log(`   ⚠️  ${onlyInTeachers} teachers without index entries`);
    console.log(`   ⚠️  ${onlyInIndex} index entries without profile data\n`);

    // Step 4: Validation
    console.log('✅ Step 4: Validating merged data...');
    
    let validCount = 0;
    let invalidCount = 0;
    const issues = [];

    for (const [email, teacher] of mergedTeachers) {
      const problems = [];
      
      if (!teacher.name) problems.push('Missing name');
      if (!email.includes('@')) problems.push('Invalid email format');
      
      if (problems.length > 0) {
        invalidCount++;
        issues.push({ email, problems });
      } else {
        validCount++;
      }
    }

    console.log(`   Valid: ${validCount}`);
    console.log(`   Invalid: ${invalidCount}\n`);

    if (invalidCount > 0) {
      console.log('❌ Issues found:');
      issues.forEach(({ email, problems }) => {
        console.log(`   - ${email}: ${problems.join(', ')}`);
      });
      console.log('');
    }

    // Step 5: Write to new collection
    if (isDryRun) {
      console.log('🔍 DRY RUN: Skipping write operations');
      console.log('\n📊 Summary:');
      console.log(`   Total teachers to migrate: ${mergedTeachers.size}`);
      console.log(`   Would create ${mergedTeachers.size} documents in 'teachers' collection`);
      console.log(`   Document IDs would be: email addresses (lowercase)\n`);
      
      // Show sample
      const sample = Array.from(mergedTeachers.entries()).slice(0, 3);
      console.log('📝 Sample merged data:');
      sample.forEach(([email, data]) => {
        console.log(`\n   ${email}:`);
        console.log(`      Name: ${data.name}`);
        console.log(`      Assignments: ${data.assignments?.length || 0}`);
        console.log(`      Authorized: ${data.authorizedAcademies?.length || 0} academies`);
      });
    } else {
      console.log(`🚀 Step 5: Writing ${mergedTeachers.size} documents to 'teachers' collection...`);
      
      const batch = db.batch();
      let count = 0;
      const BATCH_SIZE = 500; // Firestore batch limit

      for (const [email, teacherData] of mergedTeachers) {
        const docRef = db.collection('teachers').doc(email);
        batch.set(docRef, teacherData);
        count++;

        // Commit in batches
        if (count % BATCH_SIZE === 0) {
          await batch.commit();
          console.log(`   ✓ Committed batch of ${BATCH_SIZE} (${count}/${mergedTeachers.size})`);
        }
      }

      // Commit remaining
      if (count % BATCH_SIZE !== 0) {
        await batch.commit();
        console.log(`   ✓ Committed final batch (${count}/${mergedTeachers.size})`);
      }

      console.log(`\n✅ Migration complete!`);
      console.log(`   Created/Updated ${mergedTeachers.size} teacher documents`);
      console.log(`   Collection: teachers`);
      console.log(`   Document IDs: email addresses (lowercase)\n`);
      
      console.log('⚠️  NEXT STEPS:');
      console.log('   1. Verify the data in Firebase Console');
      console.log('   2. Update application code to use "teachers" collection');
      console.log('   3. Update Firestore security rules');
      console.log('   4. Test authentication and authorization');
      console.log('   5. After verification, manually delete "teachers_index" collection\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateTeachers();
