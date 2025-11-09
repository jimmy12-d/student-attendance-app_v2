/**
 * Script to update student class and shift information from JSON file
 * Transforms class names from "Class12A" to "Class 12A" format
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
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

// Function to transform class name from "Class12A" to "Class 12A"
function transformClassName(className) {
  if (!className || typeof className !== 'string') {
    return className;
  }

  // Match pattern: Class followed by number and letters
  const match = className.match(/^Class(\d+)([A-Z]+)$/);
  if (match) {
    const grade = match[1];
    const section = match[2];
    return `Class ${grade}${section}`;
  }

  return className;
}

async function updateStudentClassAndShift() {
  try {
    console.log('\n🔄 Starting student class and shift updates...\n');

    // Read the JSON file
    const jsonFilePath = path.join(__dirname, 'new_class_for_G12.json');
    const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));

    console.log(`📄 Loaded ${jsonData.length} student records from JSON file\n`);

    let successCount = 0;
    let notFoundCount = 0;
    let errorCount = 0;

    for (const student of jsonData) {
      try {
        const fullName = student['Full Name'];
        const rawClass = student['Class'];
        const shift = student['Shift'];

        // Transform class name
        const transformedClass = transformClassName(rawClass);

        console.log(`🔍 Processing: ${fullName}`);
        console.log(`   Original class: ${rawClass} -> Transformed: ${transformedClass}`);
        console.log(`   Shift: ${shift}`);

        // Find student by full name
        const studentsRef = db.collection('students');
        const querySnapshot = await studentsRef.where('fullName', '==', fullName).get();

        if (querySnapshot.empty) {
          console.log(`   ❌ Student not found: ${fullName}`);
          notFoundCount++;
          continue;
        }

        if (querySnapshot.size > 1) {
          console.log(`   ⚠️  Multiple students found with name: ${fullName} (${querySnapshot.size} matches)`);
          // Update all matches (assuming they are the same person)
        }

        // Update each matching student
        for (const doc of querySnapshot.docs) {
          const studentData = doc.data();
          const currentClass = studentData.class;
          const currentShift = studentData.shift;

          console.log(`   📝 Current: Class="${currentClass}", Shift="${currentShift}"`);

          // Prepare update data
          const updateData = {
            class: transformedClass,
            shift: shift,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          };

          // Update the document
          await doc.ref.update(updateData);
          console.log(`   ✅ Updated student: ${doc.id}`);
          successCount++;
        }

        console.log(''); // Empty line for readability

      } catch (error) {
        console.error(`   💥 Error processing ${student['Full Name']}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📊 Update Summary:');
    console.log(`   ✅ Successfully updated: ${successCount} students`);
    console.log(`   ❌ Students not found: ${notFoundCount}`);
    console.log(`   💥 Errors: ${errorCount}`);

    console.log('\n✨ Student class and shift update completed!');

  } catch (error) {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  updateStudentClassAndShift().then(() => process.exit(0));
}

module.exports = { updateStudentClassAndShift, transformClassName };