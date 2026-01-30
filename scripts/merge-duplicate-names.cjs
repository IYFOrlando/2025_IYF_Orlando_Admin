/**
 * Interactive Script: Merge Duplicate Teacher Names
 * 
 * This script helps identify teachers with the same name but different emails,
 * allows you to select which one to keep, and merges/deletes the duplicates.
 * 
 * Usage:
 *   node scripts/merge-duplicate-names.cjs
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, 'service-account.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
const app = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'iyf-orlando-academy'
});

const db = admin.firestore();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function mergeDuplicateNames() {
  console.log('🔍 Finding teachers with duplicate names...\n');
  
  const snapshot = await db.collection('teachers').get();
  const teachers = [];
  
  snapshot.forEach(doc => {
    const data = doc.data();
    teachers.push({
      id: doc.id,
      name: data.name,
      email: data.email,
      phone: data.phone || '',
      assignments: data.assignments || [],
      data: data
    });
  });
  
  // Group by name
  const nameGroups = {};
  teachers.forEach(t => {
    if (!nameGroups[t.name]) nameGroups[t.name] = [];
    nameGroups[t.name].push(t);
  });
  
  // Find duplicates
  const duplicates = Object.entries(nameGroups).filter(([_, group]) => group.length > 1);
  
  if (duplicates.length === 0) {
    console.log('✅ No duplicate names found!');
    rl.close();
    process.exit(0);
  }
  
  console.log(`Found ${duplicates.length} teachers with duplicate names:\n`);
  
  for (const [name, group] of duplicates) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`👤 ${name} (${group.length} records)`);
    console.log('='.repeat(60));
    
    group.forEach((teacher, idx) => {
      console.log(`\n[${idx + 1}] Email: ${teacher.email}`);
      console.log(`    Phone: ${teacher.phone || 'N/A'}`);
      console.log(`    Assignments: ${teacher.assignments.length}`);
      if (teacher.assignments.length > 0) {
        teacher.assignments.forEach(a => {
          console.log(`      - ${a.academyName}${a.levelName ? ` (${a.levelName})` : ''}`);
        });
      }
    });
    
    console.log('');
    const choice = await question(`Which record should we KEEP? (1-${group.length}, or 's' to skip): `);
    
    if (choice.toLowerCase() === 's') {
      console.log('⏭️  Skipped.');
      continue;
    }
    
    const keepIndex = parseInt(choice) - 1;
    if (keepIndex < 0 || keepIndex >= group.length) {
      console.log('❌ Invalid choice. Skipping.');
      continue;
    }
    
    const keepRecord = group[keepIndex];
    const deleteRecords = group.filter((_, idx) => idx !== keepIndex);
    
    console.log(`\n✅ Keeping: ${keepRecord.email}`);
    console.log(`❌ Will delete: ${deleteRecords.map(r => r.email).join(', ')}`);
    
    const confirm = await question('Proceed with merge? (y/n): ');
    if (confirm.toLowerCase() !== 'y') {
      console.log('⏭️  Skipped.');
      continue;
    }
    
    // Merge assignments from all records
    const allAssignments = [];
    const assignmentSet = new Set();
    
    group.forEach(teacher => {
      teacher.assignments.forEach(a => {
        const key = `${a.academyId}-${a.levelName || 'ALL'}`;
        if (!assignmentSet.has(key)) {
          assignmentSet.add(key);
          allAssignments.push(a);
        }
      });
    });
    
    // Update the kept record with merged assignments
    await db.collection('teachers').doc(keepRecord.email.toLowerCase()).set({
      ...keepRecord.data,
      assignments: allAssignments,
      authorizedAcademies: [...new Set(allAssignments.map(a => a.academyName))],
      authorizedAcademyIds: [...new Set(allAssignments.map(a => a.academyId))],
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`✅ Updated ${keepRecord.email} with merged assignments`);
    
    // Now update all academies to use the kept record
    const academiesSnap = await db.collection('academies_2026_spring').get();
    const batch = db.batch();
    let academyUpdates = 0;
    
    academiesSnap.forEach(doc => {
      const academy = doc.data();
      let needsUpdate = false;
      const updates = {};
      
      // Check main teacher
      if (academy.teacher && deleteRecords.some(d => d.email === academy.teacher.email)) {
        updates.teacher = {
          name: keepRecord.name,
          email: keepRecord.email,
          phone: keepRecord.phone
        };
        needsUpdate = true;
      }
      
      // Check level teachers
      if (academy.levels) {
        const newLevels = academy.levels.map(level => {
          if (level.teacher && deleteRecords.some(d => d.email === level.teacher.email)) {
            needsUpdate = true;
            return {
              ...level,
              teacher: {
                name: keepRecord.name,
                email: keepRecord.email,
                phone: keepRecord.phone
              }
            };
          }
          return level;
        });
        if (needsUpdate) updates.levels = newLevels;
      }
      
      if (needsUpdate) {
        batch.update(db.collection('academies_2026_spring').doc(doc.id), updates);
        academyUpdates++;
      }
    });
    
    if (academyUpdates > 0) {
      await batch.commit();
      console.log(`✅ Updated ${academyUpdates} academies to use ${keepRecord.email}`);
    }
    
    // Delete the duplicate records
    for (const deleteRecord of deleteRecords) {
      await db.collection('teachers').doc(deleteRecord.email.toLowerCase()).delete();
      console.log(`❌ Deleted ${deleteRecord.email}`);
    }
    
    console.log('✅ Merge complete!');
  }
  
  console.log('\n✅ All duplicates processed!');
  rl.close();
  process.exit(0);
}

mergeDuplicateNames().catch(e => {
  console.error('❌ Error:', e);
  rl.close();
  process.exit(1);
});
