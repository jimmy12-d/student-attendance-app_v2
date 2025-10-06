/**
 * Script to update existing parent notifications with correct class start times
 */

const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    const serviceAccount = require(path.join(__dirname, '../firestore-upload/serviceAccountKey.json'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'rodwell-attendance'
    });
    console.log('✅ Firebase Admin initialized with service account');
  } catch (error) {
    console.log('Service account not found, using environment variables...');
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'rodwell-attendance'
    });
    console.log('✅ Firebase Admin initialized with default credentials');
  }
}

const db = admin.firestore();

async function updateParentNotifications() {
  try {
    console.log('🚀 Updating parent notifications with class start times...\n');

    // Get all parent notifications
    const parentNotificationsSnapshot = await db.collection('parentNotifications').get();

    if (parentNotificationsSnapshot.empty) {
      console.log('⚠️  No parent notifications found.');
      return;
    }

    console.log(`📊 Found ${parentNotificationsSnapshot.size} parent notifications...\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const doc of parentNotificationsSnapshot.docs) {
      const parentData = doc.data();
      const { studentId, studentClass, studentShift } = parentData;

      // Skip if already has classStartTime
      if (parentData.classStartTime) {
        skippedCount++;
        continue;
      }

      // Skip if missing class or shift
      if (!studentClass || !studentShift) {
        console.log(`⚠️  Skipping ${doc.id}: missing class or shift`);
        skippedCount++;
        continue;
      }

      try {
        // Get student to confirm data
        const studentDoc = await db.collection('students').doc(studentId).get();
        if (!studentDoc.exists) {
          console.log(`⚠️  Skipping ${doc.id}: student ${studentId} not found`);
          skippedCount++;
          continue;
        }

        const student = studentDoc.data();

        // Get class start time
        let classStartTime = null;
        const classDoc = await db.collection('classes').doc(studentClass.replace(/^Class\s+/, '')).get();
        if (classDoc.exists) {
          const classData = classDoc.data();
          if (classData.shifts && classData.shifts[studentShift] && classData.shifts[studentShift].startTime) {
            classStartTime = classData.shifts[studentShift].startTime;
          }
        }

        if (classStartTime) {
          await doc.ref.update({ classStartTime });
          console.log(`✅ Updated ${doc.id} with start time: ${classStartTime}`);
          updatedCount++;
        } else {
          console.log(`⚠️  No start time found for class ${studentClass}, shift ${studentShift}`);
          skippedCount++;
        }

      } catch (error) {
        console.error(`❌ Error updating ${doc.id}:`, error);
        skippedCount++;
      }
    }

    console.log(`\n✅ Completed!`);
    console.log(`📊 Updated: ${updatedCount}`);
    console.log(`⏭️  Skipped: ${skippedCount}`);

  } catch (error) {
    console.error('Error in updateParentNotifications:', error);
  }
}

// Run the function
updateParentNotifications().then(() => {
  console.log('Script completed.');
  process.exit(0);
}).catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});