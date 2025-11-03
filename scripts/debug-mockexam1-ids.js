const admin = require('firebase-admin');
const serviceAccount = require('../firestore-upload/serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function debugMockExam1Ids() {
  try {
    console.log('🔍 Checking mockExam1 collection structure...\n');
    
    const mockExam1Ref = db.collection('mockExam1');
    const snapshot = await mockExam1Ref.limit(5).get();
    
    console.log(`Found ${snapshot.size} documents (showing first 5):\n`);
    
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log('─────────────────────────────────────');
      console.log('Document ID (docId):', doc.id);
      console.log('studentId field:', data.studentId || 'NOT SET');
      console.log('fullName:', data.fullName || 'N/A');
      console.log('classType:', data.classType || 'N/A');
      
      // Show a few subject fields
      const subjects = ['math', 'chemistry', 'physics', 'khmer'];
      console.log('\nSubject values:');
      subjects.forEach(subject => {
        if (data[subject] !== undefined) {
          console.log(`  ${subject}:`, data[subject]);
        }
      });
      console.log('');
    });
    
    console.log('─────────────────────────────────────');
    console.log('\n✅ Analysis complete!');
    console.log('\n💡 Key findings:');
    console.log('   - Document ID (docId) = Firestore auto-generated ID');
    console.log('   - studentId field = May or may not exist in document');
    console.log('   - Use docId when updating documents in Firebase');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

debugMockExam1Ids();
