// Test script to verify parent notification status in attendance records
// Run this in the browser console on the Record page

(async function testParentNotificationStatus() {
  console.log('🔍 Testing Parent Notification Status...\n');
  
  // Get Firestore instance
  const { db } = await import('/firebase-config.js');
  const { collection, query, orderBy, limit, getDocs } = await import('firebase/firestore');
  
  // Fetch latest 5 attendance records
  const recordsRef = collection(db, 'attendance');
  const q = query(recordsRef, orderBy('timestamp', 'desc'), limit(5));
  const snapshot = await getDocs(q);
  
  console.log(`📊 Found ${snapshot.docs.length} recent attendance records:\n`);
  
  snapshot.docs.forEach((doc, index) => {
    const data = doc.data();
    console.log(`\n--- Record ${index + 1} ---`);
    console.log(`Student: ${data.studentName}`);
    console.log(`Date: ${data.date}`);
    console.log(`Time: ${data.timeIn || 'N/A'}`);
    console.log(`Status: ${data.status}`);
    console.log(`\n🔔 Parent Notification:`);
    console.log(`  Status: ${data.parentNotificationStatus || 'NOT SET'}`);
    console.log(`  Error: ${data.parentNotificationError || 'None'}`);
    console.log(`  Sent Count: ${data.parentNotificationsSent || 0}`);
    console.log(`  Timestamp: ${data.parentNotificationTimestamp ? new Date(data.parentNotificationTimestamp.toDate()).toLocaleString() : 'N/A'}`);
  });
  
  // Check if any records have notification status
  const withStatus = snapshot.docs.filter(doc => doc.data().parentNotificationStatus);
  const withoutStatus = snapshot.docs.filter(doc => !doc.data().parentNotificationStatus);
  
  console.log(`\n\n📈 Summary:`);
  console.log(`  Records with notification status: ${withStatus.length}`);
  console.log(`  Records without notification status: ${withoutStatus.length}`);
  
  if (withoutStatus.length > 0) {
    console.log(`\n⚠️ ${withoutStatus.length} records are missing notification status.`);
    console.log(`   These are likely old records created before the feature was added.`);
    console.log(`   New attendance markings should have notification status.`);
  }
  
  if (withStatus.length > 0) {
    console.log(`\n✅ ${withStatus.length} records have notification status!`);
    console.log(`   The feature is working correctly.`);
  }
})();
