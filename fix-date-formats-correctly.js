const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('./firestore-upload/serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function fixDateFormatsCorrectly() {
  try {
    console.log('🔧 Starting to fix date formats correctly...');
    
    // Test the date conversion first
    const testDate = "Mon Sep 01 2025";
    const testObj = new Date(testDate);
    console.log(`🧪 Test conversion: "${testDate}" → ${testObj.toISOString()} → ${testObj.toISOString().split('T')[0]}`);
    console.log(`🧪 Test with UTC: "${testDate}" → ${testObj.getUTCFullYear()}-${String(testObj.getUTCMonth() + 1).padStart(2, '0')}-${String(testObj.getUTCDate()).padStart(2, '0')}`);
    
    // Better conversion function that handles timezone correctly
    function convertJSDateStringToISO(jsDateString) {
      // Parse the JS date string and ensure we get the correct date regardless of timezone
      const dateObj = new Date(jsDateString + ' 12:00:00'); // Add noon to avoid timezone issues
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    // Test the improved function
    console.log(`🧪 Improved conversion: "${testDate}" → ${convertJSDateStringToISO(testDate)}`);
    
    // Get records that were incorrectly converted (have 2025-08-31 when they should be 2025-09-01)
    const snapshot = await db.collection('attendance')
      .where('date', '==', '2025-08-31')
      .get();
    
    console.log(`📊 Found ${snapshot.docs.length} records with date 2025-08-31 that might need correction`);
    
    let fixedCount = 0;
    const batch = db.batch();
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      // Check if this record should actually be 2025-09-01 based on timestamp
      if (data.timestamp && data.timestamp.toDate) {
        const actualDate = data.timestamp.toDate();
        const actualDateString = actualDate.toISOString().split('T')[0];
        
        console.log(`📅 Record ${doc.id} (${data.studentName}): stored date=${data.date}, timestamp date=${actualDateString}`);
        
        // If the timestamp indicates September 1st, fix it
        if (actualDateString === '2025-09-01') {
          batch.update(doc.ref, { date: '2025-09-01' });
          fixedCount++;
          console.log(`✅ Will fix ${doc.id}: ${data.date} → 2025-09-01`);
        }
      }
    }
    
    if (fixedCount > 0) {
      await batch.commit();
      console.log(`📦 Committed ${fixedCount} date corrections`);
    }
    
    console.log('\n🎉 Date correction completed!');
    console.log(`✅ Fixed: ${fixedCount} records`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing dates:', error);
    process.exit(1);
  }
}

fixDateFormatsCorrectly();
