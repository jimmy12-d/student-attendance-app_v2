/**
 * Script to add day2 schedule data to mockExam1 collection
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

// Normalize name for matching (remove extra spaces, lowercase)
function normalizeName(name) {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

async function addDay2Data() {
  try {
    console.log('📖 Reading day2 schedule data...');
    const day2DataPath = path.join(__dirname, '../mock_scheudle_day_2.json');
    const day2Data = JSON.parse(fs.readFileSync(day2DataPath, 'utf8'));
    console.log(`✅ Loaded ${day2Data.length} records from day2 schedule\n`);

    // Create a map of students by full name from day2 data
    const day2Map = new Map();
    day2Data.forEach(record => {
      if (record['Full Name']) {
        const normalizedName = normalizeName(record['Full Name']);
        if (!day2Map.has(normalizedName)) {
          day2Map.set(normalizedName, []);
        }
        day2Map.get(normalizedName).push({
          shift: record.Shift,
          room: record.Room,
          seat: record.Seat,
          phone: record.Phone
        });
      }
    });

    console.log(`📊 Processing ${day2Map.size} unique students from day2 data\n`);

    // Fetch all documents from mockExam1
    console.log('🔍 Fetching mockExam1 collection...');
    const snapshot = await db.collection('mockExam1').get();
    console.log(`✅ Found ${snapshot.size} documents in mockExam1\n`);

    let matchedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    const notFoundInFirestore = [];
    const batch = db.batch();
    let batchCount = 0;
    const MAX_BATCH_SIZE = 500;

    // Process each document
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const normalizedFirestoreName = normalizeName(data.fullName);

      if (day2Map.has(normalizedFirestoreName)) {
        matchedCount++;
        const day2Shifts = day2Map.get(normalizedFirestoreName);

        // Build day2 object following the same structure as day1
        const day2Object = {};
        day2Shifts.forEach(shiftData => {
          const shift = shiftData.shift; // Morning, Afternoon, Evening
          day2Object[shift] = {
            room: shiftData.room,
            seat: shiftData.seat,
            phone: shiftData.phone
          };
        });

        // Add day2 to the document
        const docRef = db.collection('mockExam1').doc(doc.id);
        batch.update(docRef, {
          day2: day2Object,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        batchCount++;
        updatedCount++;

        // Commit batch if it reaches max size
        if (batchCount >= MAX_BATCH_SIZE) {
          console.log(`💾 Committing batch of ${batchCount} updates...`);
          await batch.commit();
          batchCount = 0;
        }

        // Remove from map to track what's left
        day2Map.delete(normalizedFirestoreName);
      }
    }

    // Commit remaining batch
    if (batchCount > 0) {
      console.log(`💾 Committing final batch of ${batchCount} updates...`);
      await batch.commit();
    }

    // Report results
    console.log('\n📊 Update Summary:');
    console.log(`   ✅ Matched students: ${matchedCount}`);
    console.log(`   📝 Updated documents: ${updatedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   ⚠️  Students in day2 JSON not found in Firestore: ${day2Map.size}`);

    if (day2Map.size > 0) {
      console.log('\n⚠️  Students not found in Firestore:');
      let count = 0;
      for (const [name, shifts] of day2Map.entries()) {
        count++;
        if (count <= 20) { // Show first 20
          console.log(`   - ${name} (${shifts.length} shift(s))`);
        }
      }
      if (day2Map.size > 20) {
        console.log(`   ... and ${day2Map.size - 20} more`);
      }
    }

    console.log('\n✨ Day2 data update completed successfully!');

  } catch (error) {
    console.error('\n💥 Update failed:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  addDay2Data()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = { addDay2Data };
