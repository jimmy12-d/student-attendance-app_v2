/**
 * Script to add username field to all students based on fullName
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

async function addUsernameToStudents() {
  try {
    console.log('🚀 Adding username field to all students based on fullName...\n');

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
    const usedUsernames = new Set();

    // Process each student
    for (const doc of studentsSnapshot.docs) {
      const data = doc.data();
      const fullName = data.fullName;

      if (!fullName || typeof fullName !== 'string') {
        console.log(`⚠️  Skipping student ${doc.id}: no valid fullName`);
        skippedCount++;
        continue;
      }

      // Generate base username: lowercase, replace spaces with underscores
      let baseUsername = fullName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''); // remove non-alphanumeric except underscore

      let username = baseUsername;
      let suffix = 1;

      // Check for duplicates and append suffix if needed
      while (usedUsernames.has(username)) {
        suffix++;
        username = `${baseUsername}_${suffix}`;
      }

      usedUsernames.add(username);

      // Update the document with username
      try {
        await doc.ref.update({ username });
        console.log(`✅ Updated ${fullName} -> ${username}`);
        updatedCount++;
      } catch (error) {
        console.error(`❌ Failed to update ${doc.id}:`, error);
        skippedCount++;
      }
    }

    console.log('\n� Username Addition Summary:');
    console.log(`   📊 Total students processed: ${studentsSnapshot.size}`);
    console.log(`   ✅ Students updated: ${updatedCount}`);
    console.log(`   ⚠️  Students skipped: ${skippedCount}`);

    console.log('\n� Username addition complete!');

  } catch (error) {
    console.error('❌ Error during analysis:', error);
    throw error;
  }
}

// Main execution
if (require.main === module) {
  addUsernameToStudents()
    .then(() => {
      console.log('\n✨ Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { addUsernameToStudents };
