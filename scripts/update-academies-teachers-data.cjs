/**
 * Script to update academies with real teacher data
 * Maps teachers to academies and updates academy documents
 * 
 * Usage: 
 *   node scripts/update-academies-teachers-data.cjs
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

// Mapping of academy names to teacher keys
const ACADEMY_TO_TEACHER_MAP = {
  'Art': 'Art',
  'English': null, // No teacher found
  'Kids Academy': 'Kids',
  'Korean Language': {
    'Alphabet': 'Korean Language_Alphabet',
    'Beginner': 'Korean Language_Beginner',
    'Intermediate': 'Korean Language_Intermediate',
    'K-Movie Conversation': 'Korean Language_K-Movie Conversation'
  },
  'Piano': 'Piano',
  'Pickleball': 'Pickleball',
  'Soccer': 'Soccer',
  'Taekwondo': null // No teacher found
};

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
 * Normalize level name for matching
 */
function normalizeLevelName(level) {
  const levelLower = (level || '').toLowerCase();
  
  // Map variations
  if (levelLower.includes('alphabet')) return 'Alphabet';
  if (levelLower.includes('beginner')) return 'Beginner';
  if (levelLower.includes('intermediate')) return 'Intermediate';
  if (levelLower.includes('k-movie') || levelLower.includes('kmovie') || levelLower.includes('conversation')) {
    return 'K-Movie Conversation';
  }
  
  return level;
}

/**
 * Update academies with teacher data
 */
async function updateAcademiesWithTeachers() {
  try {
    console.log('👨‍🏫 Updating academies with teacher data...\n');
    
    const accessToken = getFirebaseToken();
    console.log('✅ Using Firebase CLI access token\n');
    
    const projectId = 'iyf-orlando-academy';
    const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
    
    // Get all teachers
    console.log('📊 Fetching teachers...');
    const teachersUrl = `${baseUrl}/${TEACHERS_COLLECTION}`;
    const teachersResponse = await fetch(teachersUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!teachersResponse.ok) {
      throw new Error(`Failed to fetch teachers: ${teachersResponse.status}`);
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
    
    console.log(`✅ Found ${Object.keys(teachers).length} teachers\n`);
    
    // Get all academies
    console.log('📊 Fetching academies...');
    const academiesUrl = `${baseUrl}/${COLLECTION_NAME}`;
    const academiesResponse = await fetch(academiesUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!academiesResponse.ok) {
      throw new Error(`Failed to fetch academies: ${academiesResponse.status}`);
    }
    
    const academiesData = await academiesResponse.json();
    
    if (!academiesData.documents || academiesData.documents.length === 0) {
      console.log('⚠️  No academies found.');
      process.exit(0);
    }
    
    console.log(`✅ Found ${academiesData.documents.length} academies\n`);
    console.log('─'.repeat(60));
    
    let updated = 0;
    let skipped = 0;
    const missingTeachers = [];
    
    // Process each academy
    for (const docData of academiesData.documents) {
      const docId = docData.name.split('/').pop();
      const academyName = docData.fields?.name?.stringValue || '';
      const hasLevels = docData.fields?.hasLevels?.booleanValue || false;
      
      console.log(`\n📚 ${academyName}`);
      
      if (hasLevels && academyName === 'Korean Language') {
        // Korean Language with levels
        const levels = docData.fields?.levels?.arrayValue?.values || [];
        const levelMappings = ACADEMY_TO_TEACHER_MAP[academyName] || {};
        
        let levelsUpdated = false;
        const updatedLevels = levels.map(levelValue => {
          const levelMap = levelValue.mapValue?.fields || {};
          const levelName = levelMap.name?.stringValue || '';
          const normalizedLevel = normalizeLevelName(levelName);
          
          const teacherKey = levelMappings[normalizedLevel];
          const teacher = teacherKey ? teachers[teacherKey] : null;
          
          if (teacher) {
            console.log(`   ✅ Level "${levelName}": ${teacher.name}`);
            levelsUpdated = true;
            
            // Add teacher info to level (if needed for display)
            return {
              mapValue: {
                fields: {
                  ...levelMap,
                  teacherName: { stringValue: teacher.name },
                  teacherEmail: { stringValue: teacher.email || '' },
                  teacherPhone: { stringValue: teacher.phone || '' }
                }
              }
            };
          } else {
            console.log(`   ⚠️  Level "${levelName}": No teacher found`);
            missingTeachers.push(`${academyName} - ${levelName}`);
            return levelValue; // Keep original
          }
        });
        
        if (levelsUpdated) {
          // Update academy document with teacher info in levels
          const updateUrl = `${baseUrl}/${COLLECTION_NAME}/${docId}`;
          const updateFields = { ...docData.fields };
          updateFields.levels = { arrayValue: { values: updatedLevels } };
          updateFields.updatedAt = { timestampValue: new Date().toISOString() };
          
          const updateResponse = await fetch(updateUrl, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ fields: updateFields })
          });
          
          if (updateResponse.ok) {
            updated++;
            console.log(`   ✅ Updated academy document`);
          } else {
            console.log(`   ⚠️  Could not update document`);
          }
        } else {
          skipped++;
        }
      } else {
        // Academy without levels
        const teacherKey = ACADEMY_TO_TEACHER_MAP[academyName];
        const teacher = teacherKey ? teachers[teacherKey] : null;
        
        if (teacher) {
          console.log(`   ✅ Teacher: ${teacher.name}`);
          console.log(`      Email: ${teacher.email || 'N/A'}`);
          console.log(`      Phone: ${teacher.phone || 'N/A'}`);
          
          // Update academy document with teacher info
          const updateUrl = `${baseUrl}/${COLLECTION_NAME}/${docId}`;
          const updateFields = { ...docData.fields };
          updateFields.teacher = {
            mapValue: {
              fields: {
                name: { stringValue: teacher.name },
                email: { stringValue: teacher.email || '' },
                phone: { stringValue: teacher.phone || '' },
                credentials: { stringValue: teacher.credentials || '' }
              }
            }
          };
          updateFields.updatedAt = { timestampValue: new Date().toISOString() };
          
          const updateResponse = await fetch(updateUrl, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ fields: updateFields })
          });
          
          if (updateResponse.ok) {
            updated++;
            console.log(`   ✅ Updated academy document with teacher info`);
          } else {
            const errorText = await updateResponse.text();
            console.log(`   ⚠️  Could not update: ${errorText}`);
          }
        } else {
          console.log(`   ⚠️  No teacher found`);
          missingTeachers.push(academyName);
          skipped++;
        }
      }
    }
    
    // Summary
    console.log('\n' + '═'.repeat(60));
    console.log('📊 SUMMARY');
    console.log('═'.repeat(60));
    console.log(`✅ Academies updated: ${updated}`);
    console.log(`⏭️  Academies skipped: ${skipped}`);
    
    if (missingTeachers.length > 0) {
      console.log(`\n⚠️  Academies missing teachers:`);
      missingTeachers.forEach(academy => {
        console.log(`   - ${academy}`);
      });
      console.log(`\n💡 Add teachers through the admin dashboard or update the mapping in this script.`);
    }
    
    console.log('═'.repeat(60));
    console.log('\n🎉 Process completed!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the update function
updateAcademiesWithTeachers();
