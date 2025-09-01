const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('./firestore-upload/serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function checkDateFormats() {
  try {
    console.log('🔍 Checking date formats in attendance records...');
    
    // Get today's date in different formats
    const todayJS = new Date().toISOString().split('T')[0]; // JavaScript format: 2025-09-01
    const todayJSFull = new Date().toString(); // Full JS format: Mon Sep 01 2025 ...
    const todayJSDateString = new Date().toDateString(); // Mon Sep 01 2025
    
    console.log(`📅 Today in different formats:`);
    console.log(`  - JS ISO (expected): ${todayJS}`);
    console.log(`  - JS toString(): ${todayJSFull}`);
    console.log(`  - JS toDateString(): ${todayJSDateString}`);
    
    // Get all attendance records from the past few days
    const recentAttendance = await db.collection('attendance')
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get();
    
    console.log(`\n📊 Found ${recentAttendance.docs.length} recent attendance records`);
    
    // Group by date format
    const dateFormats = {};
    const methodCounts = {};
    
    recentAttendance.docs.forEach(doc => {
      const data = doc.data();
      const dateValue = data.date;
      const method = data.method || 'unknown';
      
      // Count methods
      methodCounts[method] = (methodCounts[method] || 0) + 1;
      
      // Analyze date formats
      if (dateValue) {
        const dateType = typeof dateValue;
        const dateString = String(dateValue);
        
        // Categorize date format
        let format = 'unknown';
        if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
          format = 'ISO (YYYY-MM-DD)';
        } else if (dateString.match(/^\w{3} \w{3} \d{2} \d{4}/)) {
          format = 'JS toDateString()';
        } else if (dateString.includes('T')) {
          format = 'ISO with time';
        }
        
        const key = `${format} (${dateType})`;
        if (!dateFormats[key]) {
          dateFormats[key] = { count: 0, examples: [] };
        }
        dateFormats[key].count++;
        if (dateFormats[key].examples.length < 3) {
          dateFormats[key].examples.push({
            recordId: doc.id,
            dateValue: dateString,
            studentName: data.studentName,
            method: method
          });
        }
      }
    });
    
    console.log('\n📋 Date format distribution:');
    Object.entries(dateFormats).forEach(([format, info]) => {
      console.log(`  ${format}: ${info.count} records`);
      info.examples.forEach(example => {
        console.log(`    - ${example.recordId}: "${example.dateValue}" (${example.studentName}, ${example.method})`);
      });
    });
    
    console.log('\n🔧 Method distribution:');
    Object.entries(methodCounts).forEach(([method, count]) => {
      console.log(`  ${method}: ${count} records`);
    });
    
    // Specifically check face-api records
    console.log('\n🤖 Checking face-api method records:');
    const faceApiRecords = recentAttendance.docs.filter(doc => {
      const data = doc.data();
      return data.method === 'face-api';
    });
    
    console.log(`Found ${faceApiRecords.length} face-api records:`);
    faceApiRecords.forEach(doc => {
      const data = doc.data();
      console.log(`  - ${doc.id}: ${data.studentName}, date: "${data.date}", status: ${data.status}`);
    });
    
    // Check today's records with different date filters
    console.log('\n🎯 Testing different date filters for today:');
    
    // Test 1: ISO format
    const isoQuery = await db.collection('attendance')
      .where('date', '==', todayJS)
      .get();
    console.log(`  ISO format (${todayJS}): ${isoQuery.docs.length} records`);
    
    // Test 2: JS toDateString format
    const jsQuery = await db.collection('attendance')
      .where('date', '==', todayJSDateString)
      .get();
    console.log(`  JS toDateString (${todayJSDateString}): ${jsQuery.docs.length} records`);
    
    // Show all today's records regardless of format
    console.log('\n📝 All records that could be "today":');
    recentAttendance.docs.forEach(doc => {
      const data = doc.data();
      const dateStr = String(data.date);
      const couldBeToday = dateStr.includes('2025-09-01') || dateStr.includes('Sep 01 2025');
      
      if (couldBeToday) {
        console.log(`  ✅ ${doc.id}: ${data.studentName}, date: "${data.date}", method: ${data.method || 'unknown'}`);
      }
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking date formats:', error);
    process.exit(1);
  }
}

checkDateFormats();
