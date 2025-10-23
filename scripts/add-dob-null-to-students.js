/**
 * Script to update absentFollowUps collection: replace "Unknown" studentName with actual fullName from students collection
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

async function updateAbsentFollowUpsStudentNames() {
  try {
    console.log('🚀 Updating absentFollowUps: replacing "Unknown" studentName with actual fullName...\n');

    // Query for absentFollowUps where studentName is "Unknown"
    const absentFollowUpsQuery = db.collection('absentFollowUps').where('studentName', '==', 'Unknown');

    const absentFollowUpsSnapshot = await absentFollowUpsQuery.get();

    if (absentFollowUpsSnapshot.empty) {
      console.log('⚠️  No absentFollowUps with "Unknown" studentName found.');
      return;
    }

    console.log(`📊 Found ${absentFollowUpsSnapshot.size} absentFollowUps with "Unknown" studentName...\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    // Process each absentFollowUp
    for (const doc of absentFollowUpsSnapshot.docs) {
      const data = doc.data();
      const studentId = data.studentId;

      if (!studentId) {
        console.log(`⚠️  Skipping ${doc.id} - no studentId found`);
        skippedCount++;
        continue;
      }

      try {
        // Get student document from students collection
        const studentDoc = await db.collection('students').doc(studentId).get();

        if (!studentDoc.exists) {
          console.log(`⚠️  Skipping ${doc.id} - student ${studentId} not found in students collection`);
          skippedCount++;
          continue;
        }

        const studentData = studentDoc.data();
        const fullName = studentData.fullName;

        if (!fullName) {
          console.log(`⚠️  Skipping ${doc.id} - student ${studentId} has no fullName`);
          skippedCount++;
          continue;
        }

        // Update the absentFollowUps document: set studentName to fullName
        await doc.ref.update({ 
          studentName: fullName
        });
        console.log(`✅ Updated ${doc.id} - studentName set to "${fullName}"`);
        updatedCount++;
      } catch (error) {
        console.error(`❌ Failed to update ${doc.id}:`, error);
        skippedCount++;
      }
    }

    console.log('\n📋 Absent FollowUps Update Summary:');
    console.log(`   📊 Total absentFollowUps processed: ${absentFollowUpsSnapshot.size}`);
    console.log(`   ✅ AbsentFollowUps updated: ${updatedCount}`);
    console.log(`   ⚠️  AbsentFollowUps skipped: ${skippedCount}`);

    console.log('\n🎉 Absent followUps update complete!');

  } catch (error) {
    console.error('❌ Error during operation:', error);
    throw error;
  }
}

// Main execution
if (require.main === module) {
  updateAbsentFollowUpsStudentNames()
    .then(() => {
      console.log('\n✨ Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { updateAbsentFollowUpsStudentNames };