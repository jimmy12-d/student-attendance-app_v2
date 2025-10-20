/**
 * Upload Missed Quiz Students to Firestore
 * 
 * This script uploads the list of students who missed the quiz on October 14, 2025
 * to Firestore. The face recognition system will check this list and show the
 * MISSED_QUIZ overlay when these students scan their faces.
 * 
 * Usage: node scripts/upload-missed-quiz-students.js
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require('../firebase-admin-config.js');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function uploadMissedQuizStudents() {
  try {
    console.log('📚 Starting upload of missed quiz students...\n');

    // Read the absent students file
    const filePath = path.join(__dirname, 'absent-students-2025-10-14.json');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const absentStudents = JSON.parse(fileContent);

    console.log(`Found ${absentStudents.length} absent students\n`);

    // Quiz date
    const quizDate = '2025-10-14';
    
    // Reference to the missed quiz collection
    const missedQuizRef = db.collection('missed_quizzes').doc(quizDate);
    
    // Create a batch for efficient writes
    const batch = db.batch();
    
    // Prepare student data
    const studentsData = {};
    let validCount = 0;
    let skippedCount = 0;

    for (const student of absentStudents) {
      // Skip students with "Unknown" name or invalid IDs
      if (!student.studentId || 
          student.studentName === 'Unknown' || 
          student.studentId.includes('hGZU0JIwhcb9WtHqaZxi4a5CsUi2') ||
          student.studentId.includes('puKtVxy3kya4kPq8MI5WkJLepUI2')) {
        console.log(`⏭️  Skipping: ${student.studentName || 'Unknown'} (${student.studentId})`);
        skippedCount++;
        continue;
      }

      studentsData[student.studentId] = {
        studentId: student.studentId,
        studentName: student.studentName,
        class: student.class || 'Unknown',
        shift: student.shift || 'Unknown',
        addedAt: admin.firestore.FieldValue.serverTimestamp(),
        completed: false,
        completedAt: null
      };
      
      validCount++;
    }

    console.log(`\n✅ Valid students: ${validCount}`);
    console.log(`⏭️  Skipped students: ${skippedCount}\n`);

    // Set the document with all students
    batch.set(missedQuizRef, {
      date: quizDate,
      title: 'Quiz - October 14, 2025',
      description: 'Students who missed the quiz need to complete their co-learning',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      totalStudents: validCount,
      completedCount: 0,
      students: studentsData
    });

    // Commit the batch
    await batch.commit();

    console.log('✅ Successfully uploaded missed quiz students to Firestore!');
    console.log(`📍 Location: missed_quizzes/${quizDate}`);
    console.log(`👥 Total students: ${validCount}`);
    
    console.log('\n📋 Sample students uploaded:');
    const sampleStudents = Object.values(studentsData).slice(0, 5);
    sampleStudents.forEach(student => {
      console.log(`   - ${student.studentName} (${student.class}, ${student.shift})`);
    });
    
    console.log('\n🎯 Next steps:');
    console.log('   1. The MISSED_QUIZ overlay is already configured');
    console.log('   2. Update your face-scan page to load this data');
    console.log('   3. Check students against this list during face recognition');
    console.log('   4. Show overlay when matched students scan their face');
    console.log('\n💡 See MISSED-QUIZ-OVERLAY-GUIDE.md for integration instructions');

  } catch (error) {
    console.error('❌ Error uploading missed quiz students:', error);
    process.exit(1);
  }
}

// Run the upload
uploadMissedQuizStudents()
  .then(() => {
    console.log('\n✨ Upload complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
