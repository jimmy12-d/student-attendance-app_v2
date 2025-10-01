/**
 * Script to create username mappings for authentication
 */

const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    // Try to use service account key if it exists
    const serviceAccount = require(path.join(__dirname, '../firestore-upload/serviceAccountKey.json'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'rodwell-attendance'
    });
    console.log('✅ Firebase Admin initialized with service account');
  } catch (error) {
    // Fallback to environment variables
    console.log('Service account not found, using environment variables...');
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'rodwell-attendance'
    });
    console.log('✅ Firebase Admin initialized with default credentials');
  }
}

const db = admin.firestore();

async function createUsernameMappings() {
  try {
    console.log('🚀 Creating username mappings for authentication...\n');

    // Get all students
    const studentsSnapshot = await db.collection('students').get();

    if (studentsSnapshot.empty) {
      console.log('⚠️  No students found.');
      return;
    }

    console.log(`📊 Found ${studentsSnapshot.size} students...\n`);

    let createdCount = 0;
    let skippedCount = 0;

    // Process each student
    for (const doc of studentsSnapshot.docs) {
      const data = doc.data();
      const username = data.username;
      const phone = data.phone;

      if (!username || !phone) {
        console.log(`⚠️  Skipping student ${doc.id}: missing username or phone`);
        skippedCount++;
        continue;
      }

      try {
        // Create mapping document with username as ID
        await db.collection('usernameMappings').doc(username).set({
          phone: phone,
          studentId: doc.id,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`✅ Created mapping: ${username} -> ${phone}`);
        createdCount++;
      } catch (error) {
        console.error(`❌ Failed to create mapping for ${username}:`, error);
        skippedCount++;
      }
    }

    console.log('\n📈 Username Mappings Creation Summary:');
    console.log(`   📊 Total students processed: ${studentsSnapshot.size}`);
    console.log(`   ✅ Mappings created: ${createdCount}`);
    console.log(`   ⚠️  Students skipped: ${skippedCount}`);

    console.log('\n🎉 Username mappings creation complete!');

  } catch (error) {
    console.error('❌ Error during mapping creation:', error);
    throw error;
  }
}

// Main execution
if (require.main === module) {
  createUsernameMappings()
    .then(() => {
      console.log('\n✨ Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { createUsernameMappings };