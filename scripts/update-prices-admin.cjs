/**
 * Script to update academy prices in Firebase Firestore using Admin SDK
 * This script reviews current prices and updates them if needed
 * 
 * Usage: 
 *   node scripts/update-prices-admin.cjs
 * 
 * Note: This requires a service account key file or GOOGLE_APPLICATION_CREDENTIALS
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
let app;
try {
  app = admin.apps.length > 0 
    ? admin.app() 
    : admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: 'iyf-orlando-academy'
      });
} catch (error) {
  console.error('❌ Error initializing Firebase Admin:', error.message);
  console.log('\n💡 Options to fix this:');
  console.log('   1. Set GOOGLE_APPLICATION_CREDENTIALS environment variable');
  console.log('   2. Run: gcloud auth application-default login');
  console.log('   3. Or provide a service account key file');
  process.exit(1);
}

const db = admin.firestore();

// Expected prices according to configuration
const EXPECTED_PRICES = {
  'art': 100,
  'english': 50,
  'kids_academy': 50,
  'korean_language': 50,
  'piano': 100,
  'pickleball': 50,
  'soccer': 50,
  'taekwondo': 100
};

const COLLECTION_NAME = 'academies_2026_spring';

/**
 * Update academy prices
 */
async function updatePrices() {
  try {
    console.log('💰 Reviewing and updating academy prices...');
    console.log(`📦 Collection: ${COLLECTION_NAME}\n`);
    
    // Get all academies
    const academiesRef = db.collection(COLLECTION_NAME);
    const snapshot = await academiesRef.get();
    
    if (snapshot.empty) {
      console.log('⚠️  No academies found in the collection.');
      console.log('💡 Run seed-academies-admin.cjs first to create academies.');
      process.exit(0);
    }
    
    console.log(`📋 Found ${snapshot.size} academies\n`);
    console.log('─'.repeat(60));
    
    let updated = 0;
    let correct = 0;
    let notFound = [];
    
    // Review and update each academy
    for (const docSnap of snapshot.docs) {
      const academy = {
        id: docSnap.id,
        ...docSnap.data()
      };
      
      const currentPrice = academy.price || 0;
      const expectedPrice = EXPECTED_PRICES[academy.id];
      
      if (expectedPrice === undefined) {
        console.log(`⚠️  ${academy.name || academy.id}: $${currentPrice} (not in expected prices list)`);
        notFound.push(academy.id);
        continue;
      }
      
      if (currentPrice === expectedPrice) {
        console.log(`✅ ${academy.name || academy.id}: $${currentPrice} (correct)`);
        correct++;
      } else {
        console.log(`🔄 ${academy.name || academy.id}: $${currentPrice} → $${expectedPrice} (updating...)`);
        
        try {
          await docSnap.ref.update({
            price: expectedPrice,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          
          console.log(`   ✅ Updated successfully`);
          updated++;
        } catch (error) {
          console.error(`   ❌ Error updating:`, error.message);
        }
      }
    }
    
    // Check for missing academies
    console.log('\n' + '─'.repeat(60));
    console.log('🔍 Checking for missing academies...\n');
    
    const existingIds = snapshot.docs.map(doc => doc.id);
    const missingAcademies = Object.keys(EXPECTED_PRICES).filter(id => !existingIds.includes(id));
    
    if (missingAcademies.length > 0) {
      console.log(`⚠️  Missing academies in Firestore:`);
      missingAcademies.forEach(id => {
        console.log(`   - ${id} (expected price: $${EXPECTED_PRICES[id]})`);
      });
      console.log('\n💡 Run seed-academies-admin.cjs to create these academies.');
    } else {
      console.log('✅ All expected academies are in Firestore.');
    }
    
    // Final summary
    console.log('\n' + '═'.repeat(60));
    console.log('📊 SUMMARY');
    console.log('═'.repeat(60));
    console.log(`✅ Correct prices: ${correct}`);
    console.log(`🔄 Updated prices: ${updated}`);
    if (notFound.length > 0) {
      console.log(`⚠️  Academies not in list: ${notFound.length}`);
      console.log(`   IDs: ${notFound.join(', ')}`);
    }
    if (missingAcademies.length > 0) {
      console.log(`⚠️  Missing academies: ${missingAcademies.length}`);
    }
    console.log('═'.repeat(60));
    console.log('\n🎉 Process completed!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating prices:', error);
    process.exit(1);
  }
}

// Run the update function
updatePrices();
