
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

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
    console.log('🌐 Trying application default credentials...');
    app = admin.initializeApp({
      projectId: 'iyf-orlando-academy'
    });
  }
} catch (error) {
  console.error('❌ Error initializing Firebase Admin:', error.message);
  process.exit(1);
}

const db = admin.firestore();
const COLLECTION_NAME = "academies_2026_spring";

async function verifyData() {
  console.log(`🔍 Verifying data in collection: ${COLLECTION_NAME}`);
  try {
    const snapshot = await db.collection(COLLECTION_NAME).get();
    console.log(`📊 Found ${snapshot.size} documents.`);
    
    if (snapshot.empty) {
      console.log("❌ Collection is empty!");
    } else {
      console.log("✅ Documents found:");
      snapshot.forEach(doc => {
        console.log(`   - ${doc.id}: ${doc.data().name} (Active: ${doc.data().active !== false})`);
      });
    }
  } catch (error) {
    console.error("❌ Error reading firestore:", error);
  }
}

verifyData();
