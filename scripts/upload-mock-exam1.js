/**
 * Script to upload mockExam1.json data to mockExam1 collection with studentId lookup by fullName
 */

const admin = require('firebase-admin');
const fs = require('fs');
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

async function uploadMockExam1Data() {
  try {
    console.log('🚀 Uploading mockExam1.json data to mockExam1 collection...\n');

    // Read the mockExam1.json file
    const mockExamDataPath = path.join(__dirname, '../mockExam1.json');
    const mockExamData = JSON.parse(fs.readFileSync(mockExamDataPath, 'utf8'));

    console.log(`📊 Found ${mockExamData.length} mock exam entries to upload...\n`);

    let uploadedCount = 0;
    let skippedCount = 0;

    // Process each mock exam entry
    for (const examEntry of mockExamData) {
      const fullName = examEntry['Full Name'];
      const room = examEntry.Room;
      const seat = examEntry.Seat;
      const phone = examEntry.Phone;

      if (!fullName) {
        console.log(`⚠️  Skipping entry - no full name found:`, examEntry);
        skippedCount++;
        continue;
      }

      try {
        // Find student by fullName - try exact match first, then try without spaces
        let studentsQuery = db.collection('students').where('fullName', '==', fullName);
        let studentsSnapshot = await studentsQuery.get();

        // If no exact match, try removing spaces from the name
        if (studentsSnapshot.empty) {
          const nameWithoutSpaces = fullName.replace(/\s+/g, '');
          studentsQuery = db.collection('students').where('fullName', '==', nameWithoutSpaces);
          studentsSnapshot = await studentsQuery.get();
        }

        // If still no match, try a broader search (case insensitive partial match)
        if (studentsSnapshot.empty) {
          const studentsRef = db.collection('students');
          const allStudents = await studentsRef.get();
          const matchingStudents = allStudents.docs.filter(doc => {
            const studentName = doc.data().fullName || '';
            return studentName.toLowerCase().replace(/\s+/g, '') === fullName.toLowerCase().replace(/\s+/g, '');
          });
          if (matchingStudents.length === 1) {
            studentsSnapshot = { docs: matchingStudents, empty: false, size: 1 };
          }
        }

        if (studentsSnapshot.empty) {
          console.log(`⚠️  Skipping ${fullName} - no student found with this full name`);
          skippedCount++;
          continue;
        }

        if (studentsSnapshot.size > 1) {
          console.log(`⚠️  Skipping ${fullName} - multiple students found with this full name`);
          skippedCount++;
          continue;
        }

        const studentDoc = studentsSnapshot.docs[0];
        const studentId = studentDoc.id;

        // Prepare data for mockExam1 collection
        const mockExamDocData = {
          fullName: fullName,
          room: room,
          seat: seat,
          phonePocket: phone,
          studentId: studentId,
          uploadedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        // Add to mockExam1 collection
        await db.collection('mockExam1').add(mockExamDocData);

        console.log(`✅ Uploaded ${fullName} (Room: ${room}, Seat: ${seat}) - linked to student ${studentId}`);
        uploadedCount++;

      } catch (error) {
        console.error(`❌ Failed to upload ${fullName}:`, error);
        skippedCount++;
      }
    }

    console.log('\n� Mock Exam 1 Upload Summary:');
    console.log(`   📊 Total entries processed: ${mockExamData.length}`);
    console.log(`   ✅ Entries uploaded: ${uploadedCount}`);
    console.log(`   ⚠️  Entries skipped: ${skippedCount}`);

    console.log('\n🎉 Mock Exam 1 data upload complete!');

  } catch (error) {
    console.error('❌ Error during operation:', error);
    throw error;
  }
}

// Main execution
if (require.main === module) {
  uploadMockExam1Data()
    .then(() => {
      console.log('\n✨ Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { uploadMockExam1Data };