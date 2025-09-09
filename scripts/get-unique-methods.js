/**
 * Script to read all unique method values from the attendance collection
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

async function getUniqueMethods() {
  try {
    console.log('🚀 Reading unique method values from attendance collection...\n');

    // Get all attendance records
    const attendanceSnapshot = await db.collection('attendance').get();

    if (attendanceSnapshot.empty) {
      console.log('⚠️  No attendance records found.');
      return;
    }

    console.log(`📊 Found ${attendanceSnapshot.size} attendance records to analyze...\n`);

    const methods = new Set();
    let recordsWithMethod = 0;
    let recordsWithoutMethod = 0;

    // Process each attendance record
    attendanceSnapshot.forEach((doc) => {
      const data = doc.data();
      const method = data.method;

      if (method && method.trim() !== '') {
        methods.add(method.trim());
        recordsWithMethod++;
      } else {
        recordsWithoutMethod++;
      }
    });

    console.log('📈 Analysis Results:');
    console.log(`   ✅ Records with method: ${recordsWithMethod}`);
    console.log(`   ⚠️  Records without method: ${recordsWithoutMethod}`);
    console.log(`   🎯 Total unique methods: ${methods.size}\n`);

    if (methods.size > 0) {
      console.log('📋 Unique Method Values:');
      Array.from(methods).sort().forEach((method, index) => {
        console.log(`   ${index + 1}. "${method}"`);
      });
    } else {
      console.log('⚠️  No method values found in any records.');
    }

    console.log('\n🎉 Analysis complete!');

  } catch (error) {
    console.error('❌ Error reading attendance data:', error);
    throw error;
  }
}

// Main execution
if (require.main === module) {
  getUniqueMethods()
    .then(() => {
      console.log('\n✨ Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { getUniqueMethods };
