const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('./firestore-upload/serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function fixDateFormats() {
  try {
    console.log('🔧 Starting to fix date formats in attendance records...');
    
    // Get all attendance records
    const snapshot = await db.collection('attendance').get();
    console.log(`📊 Found ${snapshot.docs.length} total attendance records`);
    
    let fixedCount = 0;
    let alreadyCorrectCount = 0;
    let errorCount = 0;
    
    const batch = db.batch();
    let batchCount = 0;
    const BATCH_SIZE = 500; // Firestore limit
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const currentDate = data.date;
      
      if (!currentDate) {
        console.log(`⚠️  Skipping record ${doc.id} - no date field`);
        continue;
      }
      
      // Check if date is in JS toDateString format (e.g., "Mon Sep 01 2025")
      const isJSDateString = /^\w{3} \w{3} \d{2} \d{4}$/.test(currentDate);
      
      if (isJSDateString) {
        try {
          // Convert JS toDateString to ISO format
          const dateObj = new Date(currentDate);
          const isoDate = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD
          
          // Update the record
          batch.update(doc.ref, { date: isoDate });
          batchCount++;
          fixedCount++;
          
          console.log(`✅ Will fix ${doc.id}: "${currentDate}" → "${isoDate}" (${data.studentName})`);
          
          // Commit batch if we hit the limit
          if (batchCount >= BATCH_SIZE) {
            await batch.commit();
            console.log(`📦 Committed batch of ${batchCount} records`);
            batchCount = 0;
          }
          
        } catch (error) {
          console.error(`❌ Error parsing date for record ${doc.id}: ${currentDate}`, error);
          errorCount++;
        }
      } else if (/^\d{4}-\d{2}-\d{2}/.test(currentDate)) {
        // Already in correct ISO format
        alreadyCorrectCount++;
      } else {
        console.log(`⚠️  Unknown date format in record ${doc.id}: "${currentDate}"`);
        errorCount++;
      }
    }
    
    // Commit any remaining records in the batch
    if (batchCount > 0) {
      await batch.commit();
      console.log(`📦 Committed final batch of ${batchCount} records`);
    }
    
    console.log('\n🎉 Date format fix completed!');
    console.log(`✅ Fixed: ${fixedCount} records`);
    console.log(`✔️  Already correct: ${alreadyCorrectCount} records`);
    console.log(`❌ Errors: ${errorCount} records`);
    console.log(`📊 Total processed: ${fixedCount + alreadyCorrectCount + errorCount} records`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing date formats:', error);
    process.exit(1);
  }
}

fixDateFormats();
