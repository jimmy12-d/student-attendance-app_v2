const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = require('./firestore-upload/serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://your-project-id.firebaseio.com' // Replace with your project URL
  });
}

const db = admin.firestore();

async function addDroppedFieldToExistingStudents() {
  console.log('Starting migration to add dropped field to existing students...');
  
  try {
    // Get all students
    const studentsSnapshot = await db.collection('students').get();
    const batch = db.batch();
    let updateCount = 0;

    studentsSnapshot.forEach((doc) => {
      const data = doc.data();
      
      // Only update if the dropped field doesn't exist
      if (data.dropped === undefined) {
        const studentRef = db.collection('students').doc(doc.id);
        batch.update(studentRef, { 
          dropped: false,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        updateCount++;
        console.log(`Queued update for student: ${data.fullName || doc.id}`);
      } else if (data.dropped === true && !data.droppedAt) {
        // If student is already dropped but doesn't have droppedAt timestamp, add it
        const studentRef = db.collection('students').doc(doc.id);
        batch.update(studentRef, { 
          droppedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        updateCount++;
        console.log(`Added droppedAt timestamp for student: ${data.fullName || doc.id}`);
      }
    });

    if (updateCount > 0) {
      await batch.commit();
      console.log(`✅ Successfully updated ${updateCount} students with dropped field.`);
    } else {
      console.log('📝 All students already have the dropped field. No updates needed.');
    }
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
    process.exit(1);
  }
}

// Run the migration
addDroppedFieldToExistingStudents()
  .then(() => {
    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });
