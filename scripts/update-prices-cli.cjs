/**
 * Script to update academy prices using Firebase CLI token
 * This script uses the access token from Firebase CLI
 * 
 * Usage: 
 *   node scripts/update-prices-cli.cjs
 * 
 * Note: Requires firebase login first
 */

const fs = require('fs');
const path = require('path');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc } = require('firebase/firestore');
const { getAuth, signInWithCustomToken } = require('firebase/auth');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBVBE2Cb5UFePdUOlTWVPPwGZCzH9lUtRQ",
  authDomain: "iyf-orlando-academy.firebaseapp.com",
  projectId: "iyf-orlando-academy",
  storageBucket: "iyf-orlando-academy.appspot.com",
  messagingSenderId: "321117265409",
  appId: "1:321117265409:web:27dc40234503505a3eaa00"
};

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
 * Get Firebase CLI token from config file
 */
function getFirebaseToken() {
  try {
    const configPath = path.join(process.env.HOME || process.env.USERPROFILE, '.config', 'configstore', 'firebase-tools.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    if (!config.tokens || !config.tokens.access_token) {
      throw new Error('No access token found in Firebase CLI config');
    }
    
    // Check if token is expired
    if (config.tokens.expires_at && Date.now() > config.tokens.expires_at) {
      console.warn('⚠️  Access token has expired. Please run: firebase login');
      throw new Error('Token expired');
    }
    
    return config.tokens.access_token;
  } catch (error) {
    console.error('❌ Error reading Firebase CLI token:', error.message);
    console.log('\n💡 Make sure you are logged in: firebase login');
    process.exit(1);
  }
}

/**
 * Update academy prices
 */
async function updatePrices() {
  try {
    console.log('💰 Reviewing and updating academy prices...');
    console.log(`📦 Collection: ${COLLECTION_NAME}\n`);
    
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    // Get access token from CLI
    const accessToken = getFirebaseToken();
    console.log('✅ Using Firebase CLI access token');
    console.log(`👤 Logged in as: ${JSON.parse(fs.readFileSync(path.join(process.env.HOME || process.env.USERPROFILE, '.config', 'configstore', 'firebase-tools.json'), 'utf8')).user.email}\n`);
    
    // Note: We can't directly use the access token with Firestore client SDK
    // The token is for REST API calls. We need to use the REST API directly
    // or use Admin SDK. Let's use REST API instead.
    
    const projectId = 'iyf-orlando-academy';
    const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
    
    // Get all academies using REST API
    console.log('📊 Fetching academies from Firestore...\n');
    const listUrl = `${baseUrl}/${COLLECTION_NAME}`;
    const listResponse = await fetch(listUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!listResponse.ok) {
      const errorText = await listResponse.text();
      throw new Error(`Failed to fetch academies: ${listResponse.status} ${listResponse.statusText}\n${errorText}`);
    }
    
    const listData = await listResponse.json();
    
    if (!listData.documents || listData.documents.length === 0) {
      console.log('⚠️  No academies found in the collection.');
      console.log('💡 Run seed-academies-admin.cjs first to create academies.');
      process.exit(0);
    }
    
    console.log(`📋 Found ${listData.documents.length} academies\n`);
    console.log('─'.repeat(60));
    
    let updated = 0;
    let correct = 0;
    let notFound = [];
    
    // Map expected prices by academy name (normalized)
    const expectedPricesByName = {};
    Object.entries(EXPECTED_PRICES).forEach(([id, price]) => {
      // Convert ID to name format (e.g., 'kids_academy' -> 'Kids Academy')
      const name = id.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
      expectedPricesByName[name.toLowerCase()] = price;
    });
    
    // Special cases
    expectedPricesByName['korean language'] = EXPECTED_PRICES['korean_language'];
    
    // Review and update each academy
    for (const docData of listData.documents) {
      const docId = docData.name.split('/').pop();
      const academyName = docData.fields?.name?.stringValue || '';
      const currentPrice = Number(docData.fields?.price?.integerValue || docData.fields?.price?.doubleValue || 0);
      
      // Find expected price by name
      const expectedPrice = expectedPricesByName[academyName.toLowerCase()];
      
      if (expectedPrice === undefined) {
        console.log(`⚠️  ${academyName}: $${currentPrice} (not in expected prices list)`);
        notFound.push(academyName);
        continue;
      }
      
      if (currentPrice === expectedPrice) {
        console.log(`✅ ${academyName}: $${currentPrice} (correct)`);
        correct++;
      } else {
        console.log(`🔄 ${academyName}: $${currentPrice} → $${expectedPrice} (updating...)`);
        
        try {
          // Update using REST API
          const updateUrl = `${baseUrl}/${COLLECTION_NAME}/${docId}`;
          
          // Build update fields - preserve existing fields and update price
          const updateFields = { ...docData.fields };
          updateFields.price = { integerValue: expectedPrice };
          updateFields.updatedAt = { timestampValue: new Date().toISOString() };
          
          const updateData = { fields: updateFields };
          
          const updateResponse = await fetch(updateUrl, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
          });
          
          if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            throw new Error(`Update failed: ${updateResponse.status} ${updateResponse.statusText}\n${errorText}`);
          }
          
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
    
    const existingNames = listData.documents.map(doc => 
      (doc.fields?.name?.stringValue || '').toLowerCase()
    );
    const missingAcademies = Object.entries(EXPECTED_PRICES).filter(([id, price]) => {
      const name = id.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
      return !existingNames.includes(name.toLowerCase()) && 
             !existingNames.includes('korean language');
    });
    
    if (missingAcademies.length > 0) {
      console.log(`⚠️  Missing academies in Firestore:`);
      missingAcademies.forEach(([id, price]) => {
        const name = id.split('_').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
        console.log(`   - ${name} (expected price: $${price})`);
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
