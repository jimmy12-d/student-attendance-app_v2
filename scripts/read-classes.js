/**
 * Script to read classes collection and display class information
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

async function readClassesCollection() {
  try {
    console.log('🚀 Reading classes collection...\n');

    const classesSnapshot = await db.collection('classes').get();

    if (classesSnapshot.empty) {
      console.log('⚠️  No classes found.');
      return;
    }

    console.log(`📊 Found ${classesSnapshot.size} classes:\n`);

    classesSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`🔹 Class ID: ${doc.id}`);
      console.log(`   Name: ${data.name || 'N/A'}`);
      console.log(`   Type: ${data.type || 'N/A'}`);
      console.log(`   Schedule: ${data.schedule || 'N/A'}`);
      if (data.shifts) {
        console.log(`   Shifts: ${Object.keys(data.shifts).join(', ')}`);
        Object.entries(data.shifts).forEach(([shiftName, shiftData]) => {
          console.log(`     ${shiftName}: ${shiftData.startTime} - ${shiftData.endTime || 'N/A'} (${shiftData.maxStudents || 'N/A'} students)`);
        });
      }
      console.log('');
    });

    // Specifically look for 9E
    const class9EDoc = classesSnapshot.docs.find(doc => doc.id === '9E');
    if (class9EDoc) {
      console.log('🎯 Found Class 9E:');
      console.log(JSON.stringify(class9EDoc.data(), null, 2));
    } else {
      console.log('⚠️  Class 9E not found.');
    }

  } catch (error) {
    console.error('❌ Error reading classes:', error);
    throw error;
  }
}

// Main execution
if (require.main === module) {
  readClassesCollection()
    .then(() => {
      console.log('\n✨ Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { readClassesCollection };