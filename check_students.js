const admin = require('firebase-admin');
const serviceAccount = require('./firebase-admin-config.js');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://student-attendance-app-v2-default-rtdb.firebaseio.com'
});

const db = admin.firestore();

async function checkStudents() {
  console.log('Checking students...');

  // Get all students from 2026
  const studentsRef = db.collection('students');
  const snapshot = await studentsRef.where('ay', '==', '2026').get();

  let total = 0;
  let active = 0;
  let inactive = 0;
  let onBreak = 0;
  let onWaitlist = 0;
  let dropped = 0;

  snapshot.forEach(doc => {
    const data = doc.data();
    total++;

    if (data.isActive === false) inactive++;
    if (data.onBreak) onBreak++;
    if (data.onWaitlist) onWaitlist++;
    if (data.dropped) dropped++;

    // Dashboard logic: NOT dropped AND NOT onBreak AND NOT onWaitlist
    if (!data.dropped && !data.onBreak && !data.onWaitlist) {
      active++;
    }
  });

  console.log('Total students AY 2026:', total);
  console.log('Dashboard active count (not dropped, not onBreak, not onWaitlist):', active);
  console.log('Inactive (isActive=false):', inactive);
  console.log('On break:', onBreak);
  console.log('On waitlist:', onWaitlist);
  console.log('Dropped:', dropped);

  process.exit(0);
}

checkStudents().catch(console.error);