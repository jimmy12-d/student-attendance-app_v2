/**
 * Script to set dateOfBirth to null for all students
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

async function setDateOfBirthNull() {
  try {
    console.log('🚀 Setting dateOfBirth to null for all students...\n');

    // Query for all students
    const studentsQuery = db.collection('students');

    const studentsSnapshot = await studentsQuery.get();

    if (studentsSnapshot.empty) {
      console.log('⚠️  No students found.');
      return;
    }

    console.log(`📊 Found ${studentsSnapshot.size} total students...\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    // Process each student
    for (const doc of studentsSnapshot.docs) {
      const data = doc.data();
      const fullName = data.fullName || 'Unknown Student';

      // Update the document with dateOfBirth set to null
      try {
        await doc.ref.update({ dateOfBirth: null });
        console.log(`✅ Updated ${fullName} (ID: ${doc.id}) - dateOfBirth set to null`);
        updatedCount++;
      } catch (error) {
        console.error(`❌ Failed to update ${doc.id}:`, error);
        skippedCount++;
      }
    }

    console.log('\n📋 Date of Birth Nullification Summary:');
    console.log(`   📊 Total students processed: ${studentsSnapshot.size}`);
    console.log(`   ✅ Students updated: ${updatedCount}`);
    console.log(`   ⚠️  Students skipped: ${skippedCount}`);

    console.log('\n🎉 Date of birth nullification complete!');

  } catch (error) {
    console.error('❌ Error during operation:', error);
    throw error;
  }
}

// Main execution
if (require.main === module) {
  setDateOfBirthNull()
    .then(() => {
      console.log('\n✨ Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { setDateOfBirthNull };