const admin = require('firebase-admin');
const serviceAccount = require('../firestore-upload/serviceAccountKey.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function cleanupLegacyTokens() {
    console.log('🧹 Starting cleanup of legacy registration tokens from students collection...');
    
    try {
        // Get all students
        const studentsRef = db.collection('students');
        const snapshot = await studentsRef.get();
        
        if (snapshot.empty) {
            console.log('No students found in the collection.');
            return;
        }
        
        const batch = db.batch();
        let updateCount = 0;
        let totalStudents = 0;
        
        snapshot.forEach(doc => {
            totalStudents++;
            const data = doc.data();
            
            // Check if any legacy token fields exist
            const hasLegacyFields = data.registrationToken || 
                                   data.tokenExpiresAt || 
                                   data.tokenGeneratedAt;
            
            if (hasLegacyFields) {
                console.log(`Cleaning up legacy tokens for student: ${data.fullName || doc.id}`);
                
                // Remove legacy token fields
                const updateData = {
                    registrationToken: admin.firestore.FieldValue.delete(),
                    tokenExpiresAt: admin.firestore.FieldValue.delete(),
                    tokenGeneratedAt: admin.firestore.FieldValue.delete()
                };
                
                batch.update(doc.ref, updateData);
                updateCount++;
            }
        });
        
        if (updateCount > 0) {
            console.log(`📝 Committing batch update for ${updateCount} students...`);
            await batch.commit();
            console.log(`✅ Successfully cleaned up legacy tokens from ${updateCount} out of ${totalStudents} students.`);
        } else {
            console.log(`✅ No legacy tokens found. All ${totalStudents} students are clean.`);
        }
        
    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        process.exit(1);
    }
}

// Run the cleanup
cleanupLegacyTokens()
    .then(() => {
        console.log('🎉 Cleanup completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Cleanup failed:', error);
        process.exit(1);
    });
