/**
 * Script to verify lateFeePermission field was added to students
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

async function verifyLateFeePermissionField() {
  try {
    console.log('🔍 Verifying lateFeePermission field in students...');
    
    // Get a sample of students to verify
    const studentsRef = db.collection('students');
    const snapshot = await studentsRef.limit(10).get();
    
    if (snapshot.empty) {
      console.log('❌ No students found in the database.');
      return;
    }
    
    console.log(`📊 Checking ${snapshot.size} sample students...`);
    
    let hasField = 0;
    let missingField = 0;
    
    snapshot.forEach((doc) => {
      const studentData = doc.data();
      const studentName = studentData.fullName || doc.id;
      
      if (studentData.lateFeePermission !== undefined) {
        console.log(`✅ ${studentName}: lateFeePermission = ${studentData.lateFeePermission}`);
        hasField++;
      } else {
        console.log(`❌ ${studentName}: missing lateFeePermission field`);
        missingField++;
      }
    });
    
    console.log(`\n📋 Sample Verification Summary:`);
    console.log(`   - Students with lateFeePermission field: ${hasField}`);
    console.log(`   - Students missing lateFeePermission field: ${missingField}`);
    
    if (missingField === 0) {
      console.log('🎉 All sample students have the lateFeePermission field!');
    } else {
      console.log('⚠️  Some students are missing the lateFeePermission field.');
    }
    
  } catch (error) {
    console.error('❌ Error verifying lateFeePermission field:', error);
    throw error;
  }
}

// Run the script if called directly
if (require.main === module) {
  verifyLateFeePermissionField()
    .then(() => {
      console.log('✨ Verification completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Verification failed:', error);
      process.exit(1);
    });
}

module.exports = { verifyLateFeePermissionField };
