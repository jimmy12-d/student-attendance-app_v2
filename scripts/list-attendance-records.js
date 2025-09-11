/**
 * Script to list all attendance records to understand data structure
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

async function listAttendanceRecords() {
  try {
    console.log('🚀 Listing all attendance records...\n');

    // Query for all attendance records (limit to 50 for overview)
    const attendanceQuery = db.collection('attendance').limit(50);
    const attendanceSnapshot = await attendanceQuery.get();

    if (attendanceSnapshot.empty) {
      console.log('⚠️  No attendance records found.');
      return;
    }

    console.log(`📊 Found ${attendanceSnapshot.size} attendance records (showing first 50):\n`);

    let classes = new Set();
    let dates = new Set();

    // Process each record
    attendanceSnapshot.docs.forEach((doc, index) => {
      const data = doc.data();

      console.log(`${(index + 1).toString().padStart(2, ' ')}. ${data.studentName || 'Unknown'}`);
      console.log(`   Date: ${data.date || 'N/A'}`);
      console.log(`   Class: ${data.class || 'N/A'}`);
      console.log(`   Shift: ${data.shift || 'N/A'}`);
      console.log(`   startTime: ${data.startTime || 'N/A'}`);
      console.log(`   timeIn: ${data.timeIn || 'N/A'}`);
      console.log(`   Status: ${data.status || 'N/A'}`);
      console.log('─'.repeat(60));

      // Collect unique classes and dates
      if (data.class) classes.add(data.class);
      if (data.date) dates.add(data.date);
    });

    console.log('\n📊 UNIQUE CLASSES FOUND:');
    Array.from(classes).sort().forEach(cls => console.log(`   • ${cls}`));

    console.log('\n📅 UNIQUE DATES FOUND:');
    Array.from(dates).sort().forEach(date => console.log(`   • ${date}`));

    // Check for September 2025 dates specifically
    const sept2025Dates = Array.from(dates).filter(date => date && date.includes('2025-09'));
    if (sept2025Dates.length > 0) {
      console.log('\n📅 SEPTEMBER 2025 DATES FOUND:');
      sept2025Dates.forEach(date => console.log(`   • ${date}`));
    } else {
      console.log('\n⚠️  No September 2025 dates found in the sample.');
    }

  } catch (error) {
    console.error('❌ Error listing attendance records:', error);
    throw error;
  }
}

// Main execution
if (require.main === module) {
  listAttendanceRecords()
    .then(() => {
      console.log('\n✨ Attendance records listing completed successfully!');
    })
    .catch((error) => {
      console.error('\n💥 Listing failed:', error);
      process.exit(1);
    });
}

module.exports = { listAttendanceRecords };
