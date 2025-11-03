/**
 * Script to inspect mockExam1 documents to find "absent" values
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

async function inspectMockExam1Scores() {
  try {
    console.log('\n🔍 Inspecting mockExam1 documents for score values...\n');

    const mockExam1Ref = db.collection('mockExam1');
    const snapshot = await mockExam1Ref.limit(10).get(); // Get first 10 documents

    if (snapshot.empty) {
      console.log('📭 No documents found in mockExam1 collection');
      return;
    }

    console.log(`📊 Inspecting ${snapshot.size} sample documents:\n`);

    let absentCount = 0;
    let nullCount = 0;
    let undefinedCount = 0;
    let numberCount = 0;

    snapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`\n📄 Document ID: ${doc.id}`);
      console.log(`   Student: ${data.studentName || 'N/A'}`);
      console.log(`   Class Type: ${data.classType || 'N/A'}`);
      console.log(`   Scores:`);

      // List of possible subjects
      const subjects = ['math', 'chemistry', 'physics', 'biology', 'history', 'khmer', 'geometry', 'earth', 'geography', 'moral'];

      subjects.forEach(subject => {
        const score = data[subject];
        if (score !== undefined) {
          const scoreType = score === null ? 'null' : typeof score;
          const scoreValue = score === null ? 'null' : score;
          
          console.log(`      ${subject}: ${scoreValue} (type: ${scoreType})`);

          // Count types
          if (typeof score === 'string' && score.toLowerCase() === 'absent') {
            absentCount++;
          } else if (score === null) {
            nullCount++;
          } else if (typeof score === 'number') {
            numberCount++;
          }
        }
      });
    });

    console.log(`\n\n📊 Summary of score types found in ${snapshot.size} documents:`);
    console.log(`   Numbers: ${numberCount}`);
    console.log(`   "absent" strings: ${absentCount}`);
    console.log(`   null values: ${nullCount}`);
    console.log(`   undefined (not set): (not counted individually)`);

    // Now let's search specifically for documents with "absent" values
    console.log('\n\n🔍 Searching for documents with "absent" scores...\n');

    const allSnapshot = await mockExam1Ref.get();
    let docsWithAbsent = 0;
    const absentExamples = [];

    allSnapshot.forEach((doc) => {
      const data = doc.data();
      const subjects = ['math', 'chemistry', 'physics', 'biology', 'history', 'khmer', 'geometry', 'earth', 'geography', 'moral'];
      
      let hasAbsent = false;
      const absentSubjects = [];

      subjects.forEach(subject => {
        const score = data[subject];
        if (typeof score === 'string' && score.toLowerCase() === 'absent') {
          hasAbsent = true;
          absentSubjects.push(subject);
        }
      });

      if (hasAbsent) {
        docsWithAbsent++;
        if (absentExamples.length < 5) {
          absentExamples.push({
            id: doc.id,
            student: data.studentName,
            classType: data.classType,
            absentSubjects
          });
        }
      }
    });

    console.log(`📊 Total documents with "absent" scores: ${docsWithAbsent} out of ${allSnapshot.size}`);
    
    if (absentExamples.length > 0) {
      console.log('\n📋 Examples of documents with "absent" scores:');
      absentExamples.forEach((example, index) => {
        console.log(`\n${index + 1}. Document ID: ${example.id}`);
        console.log(`   Student: ${example.student}`);
        console.log(`   Class: ${example.classType}`);
        console.log(`   Absent in: ${example.absentSubjects.join(', ')}`);
      });
    } else {
      console.log('\n⚠️  No documents found with "absent" scores!');
      console.log('   This explains why absent count is showing 0.');
    }

    console.log('\n✨ Inspection completed!');
  } catch (error) {
    console.error('❌ Error inspecting mockExam1:', error.message);
    console.error(error);
  }
}

async function main() {
  await inspectMockExam1Scores();
  process.exit(0);
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { inspectMockExam1Scores };
