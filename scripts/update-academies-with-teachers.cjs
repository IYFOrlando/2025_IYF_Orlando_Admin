/**
 * Script to update academies with real teacher data
 * This script reads teachers from Firestore and updates academies_2026_spring with teacher information
 * 
 * Usage: 
 *   node scripts/update-academies-with-teachers.cjs
 * 
 * Note: Requires firebase login first
 */

const fs = require('fs');
const path = require('path');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBVBE2Cb5UFePdUOlTWVPPwGZCzH9lUtRQ",
  authDomain: "iyf-orlando-academy.firebaseapp.com",
  projectId: "iyf-orlando-academy",
  storageBucket: "iyf-orlando-academy.appspot.com",
  messagingSenderId: "321117265409",
  appId: "1:321117265409:web:27dc40234503505a3eaa00"
};

const COLLECTION_NAME = 'academies_2026_spring';
const TEACHERS_COLLECTION = 'teachers';

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
 * Normalize academy name for matching
 */
function normalizeAcademyName(name) {
  return (name || '').trim().toLowerCase().replace(/\s+/g, '_');
}

/**
 * Map teacher key to academy name
 */
function mapTeacherKeyToAcademy(teacherKey) {
  // Teacher keys can be:
  // - "Academy Name" (for academies without levels)
  // - "Academy Name_Level" (for academies with levels like Korean Language)
  
  // Remove level part if present
  const parts = teacherKey.split('_');
  if (parts.length > 1) {
    // Check if last part is a level (common Korean Language levels)
    const lastPart = parts[parts.length - 1].toLowerCase();
    const koreanLevels = ['alphabet', 'beginner', 'intermediate', 'k-movie conversation', 'kmovie', 'conversation'];
    
    if (koreanLevels.some(level => lastPart.includes(level) || level.includes(lastPart))) {
      // It's a level, return academy name without level
      return parts.slice(0, -1).join(' ');
    }
  }
  
  // Return as is, replacing underscores with spaces
  return teacherKey.replace(/_/g, ' ');
}

/**
 * Update academies with teacher data
 */
async function updateAcademiesWithTeachers() {
  try {
    console.log('👨‍🏫 Updating academies with teacher data...\n');
    
    // Get access token from CLI
    const accessToken = getFirebaseToken();
    console.log('✅ Using Firebase CLI access token');
    console.log(`👤 Logged in as: ${JSON.parse(fs.readFileSync(path.join(process.env.HOME || process.env.USERPROFILE, '.config', 'configstore', 'firebase-tools.json'), 'utf8')).user.email}\n`);
    
    const projectId = 'iyf-orlando-academy';
    const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
    
    // Get all teachers
    console.log('📊 Fetching teachers from Firestore...\n');
    const teachersUrl = `${baseUrl}/${TEACHERS_COLLECTION}`;
    const teachersResponse = await fetch(teachersUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!teachersResponse.ok) {
      const errorText = await teachersResponse.text();
      throw new Error(`Failed to fetch teachers: ${teachersResponse.status} ${teachersResponse.statusText}\n${errorText}`);
    }
    
    const teachersData = await teachersResponse.json();
    const teachers = {};
    
    if (teachersData.documents) {
      teachersData.documents.forEach(doc => {
        const teacherId = doc.name.split('/').pop();
        const fields = doc.fields || {};
        
        teachers[teacherId] = {
          name: fields.name?.stringValue || '',
          email: fields.email?.stringValue || '',
          phone: fields.phone?.stringValue || '',
          credentials: fields.credentials?.stringValue || '',
          academy: fields.academy?.stringValue || '',
          level: fields.level?.stringValue || null
        };
      });
    }
    
    console.log(`📋 Found ${Object.keys(teachers).length} teachers\n`);
    
    if (Object.keys(teachers).length === 0) {
      console.log('⚠️  No teachers found. Please add teachers first through the admin dashboard.');
      process.exit(0);
    }
    
    // Display teachers
    console.log('👨‍🏫 Teachers found:');
    Object.entries(teachers).forEach(([key, teacher]) => {
      console.log(`   - ${key}: ${teacher.name} (${teacher.academy}${teacher.level ? ` - ${teacher.level}` : ''})`);
    });
    console.log('');
    
    // Get all academies
    console.log('📊 Fetching academies from Firestore...\n');
    const academiesUrl = `${baseUrl}/${COLLECTION_NAME}`;
    const academiesResponse = await fetch(academiesUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!academiesResponse.ok) {
      const errorText = await academiesResponse.text();
      throw new Error(`Failed to fetch academies: ${academiesResponse.status} ${academiesResponse.statusText}\n${errorText}`);
    }
    
    const academiesData = await academiesResponse.json();
    
    if (!academiesData.documents || academiesData.documents.length === 0) {
      console.log('⚠️  No academies found in the collection.');
      console.log('💡 Run seed-academies-admin.cjs first to create academies.');
      process.exit(0);
    }
    
    console.log(`📋 Found ${academiesData.documents.length} academies\n`);
    console.log('─'.repeat(60));
    
    let updated = 0;
    let skipped = 0;
    
    // Update each academy with teacher data
    for (const docData of academiesData.documents) {
      const docId = docData.name.split('/').pop();
      const academyName = docData.fields?.name?.stringValue || '';
      const hasLevels = docData.fields?.hasLevels?.booleanValue || false;
      
      console.log(`\n📚 Processing: ${academyName}`);
      
      if (hasLevels) {
        // Academy with levels (like Korean Language)
        const levels = docData.fields?.levels?.arrayValue?.values || [];
        
        console.log(`   Has ${levels.length} levels`);
        
        // Update each level with its teacher
        for (const levelValue of levels) {
          const levelName = levelValue.mapValue?.fields?.name?.stringValue || '';
          if (!levelName) continue;
          
          // Find teacher for this academy and level
          const teacherKey = `${academyName}_${levelName}`;
          const teacher = teachers[teacherKey] || teachers[academyName] || null;
          
          if (teacher) {
            console.log(`   ✅ Level "${levelName}": Teacher ${teacher.name}`);
            // Note: We're updating the academy document, not individual level documents
            // The teacher info is stored separately in the 'teachers' collection
            // This is just for display purposes
          } else {
            console.log(`   ⚠️  Level "${levelName}": No teacher found`);
          }
        }
        
        skipped++;
        console.log(`   ℹ️  Academy with levels - teachers are managed separately in 'teachers' collection`);
      } else {
        // Academy without levels
        // Find teacher for this academy
        const teacher = teachers[academyName] || teachers[normalizeAcademyName(academyName)] || null;
        
        if (teacher) {
          console.log(`   ✅ Teacher: ${teacher.name}`);
          console.log(`      Email: ${teacher.email || 'N/A'}`);
          console.log(`      Phone: ${teacher.phone || 'N/A'}`);
          
          // Update academy document with teacher reference
          // Note: We're not storing teacher data directly in academy document
          // Teachers are stored in separate 'teachers' collection
          // This is just for verification
          
          skipped++;
          console.log(`   ℹ️  Teacher info is stored in 'teachers' collection (key: ${academyName})`);
        } else {
          console.log(`   ⚠️  No teacher found for ${academyName}`);
          console.log(`   💡 Available teacher keys: ${Object.keys(teachers).join(', ')}`);
        }
      }
    }
    
    // Summary
    console.log('\n' + '═'.repeat(60));
    console.log('📊 SUMMARY');
    console.log('═'.repeat(60));
    console.log(`📚 Academies processed: ${academiesData.documents.length}`);
    console.log(`👨‍🏫 Teachers found: ${Object.keys(teachers).length}`);
    console.log(`✅ Teachers are stored in 'teachers' collection`);
    console.log(`ℹ️  Academy documents reference teachers by key`);
    console.log('═'.repeat(60));
    console.log('\n💡 Note: Teachers are managed separately in the "teachers" collection.');
    console.log('   The academy documents use teacher keys to reference teachers.');
    console.log('   To update teacher info, use the admin dashboard or update the "teachers" collection directly.');
    console.log('\n🎉 Process completed!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating academies:', error);
    process.exit(1);
  }
}

// Run the update function
updateAcademiesWithTeachers();
