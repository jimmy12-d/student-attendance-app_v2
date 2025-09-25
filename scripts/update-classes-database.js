/**
 * Script to update the classes database with detailed information
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
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'rodwell-attendance'
    });
    console.log('✅ Firebase Admin initialized with default credentials');
  }
}

const db = admin.firestore();

async function updateClassesDatabase() {
  try {
    console.log('🔄 Updating classes database...\n');

    // Data for Class 10E
    const classData = {
      name: "Class 10E",
      schedule: "fix",
      shifts: {
        Evening: {
          maxStudents: 12,
          startTime: "17:45",
          endTime: "19:45", // Added endTime at the same level as startTime
          studyDays: [0, 1, 2, 3, 4, 5] // Monday to Saturday
        }
      },
      type: "Grade 10"
    };

    // Update the document
    const classRef = db.collection('classes').doc('10E');
    await classRef.set(classData, { merge: true });

    console.log('✅ Successfully updated Class 10E with detailed information');
    console.log('📊 Updated data:');
    console.log(JSON.stringify(classData, null, 2));

  } catch (error) {
    console.error('❌ Error updating classes database:', error);
    throw error;
  }
}

// Main execution
if (require.main === module) {
  updateClassesDatabase()
    .then(() => {
      console.log('✨ Classes database update completed successfully!');
    })
    .catch((error) => {
      console.error('💥 Classes database update failed:', error);
      process.exit(1);
    });
}

module.exports = { updateClassesDatabase };