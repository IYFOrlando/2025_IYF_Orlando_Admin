const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, 'service-account.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
const app = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'iyf-orlando-academy'
});

const db = admin.firestore();

async function checkTeachers() {
  console.log('📋 Checking teachers collection...\n');
  
  const snapshot = await db.collection('teachers').get();
  console.log(`Total documents: ${snapshot.size}\n`);
  
  const teachers = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    teachers.push({
      id: doc.id,
      name: data.name,
      email: data.email
    });
  });
  
  // Sort by name
  teachers.sort((a, b) => a.name.localeCompare(b.name));
  
  console.log('All teachers:');
  teachers.forEach(t => {
    console.log(`  ${t.name} (${t.email}) [ID: ${t.id}]`);
  });
  
  // Check for duplicate names
  const nameCount = {};
  teachers.forEach(t => {
    nameCount[t.name] = (nameCount[t.name] || 0) + 1;
  });
  
  console.log('\n📊 Duplicate names:');
  Object.entries(nameCount).forEach(([name, count]) => {
    if (count > 1) {
      console.log(`  ${name}: ${count} times`);
      const matches = teachers.filter(t => t.name === name);
      matches.forEach(m => console.log(`    - ${m.email} [ID: ${m.id}]`));
    }
  });
  
  process.exit(0);
}

checkTeachers().catch(e => {
  console.error(e);
  process.exit(1);
});
