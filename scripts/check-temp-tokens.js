const admin = require('firebase-admin');
const serviceAccount = require('../firestore-upload/serviceAccountKey.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkTempTokens() {
    console.log('🔍 Checking tempRegistrationTokens collection...');
    
    try {
        const tokensRef = db.collection('tempRegistrationTokens');
        const snapshot = await tokensRef.get();
        
        if (snapshot.empty) {
            console.log('No tokens found in tempRegistrationTokens collection.');
            return;
        }
        
        console.log(`Found ${snapshot.size} token(s):`);
        snapshot.forEach(doc => {
            const data = doc.data();
            console.log(`- Token: ${doc.id}`);
            console.log(`  Student ID: ${data.studentId}`);
            console.log(`  Created: ${data.createdAt?.toDate()}`);
            console.log(`  Expires: ${data.expiresAt?.toDate()}`);
            console.log('---');
        });
        
    } catch (error) {
        console.error('❌ Error checking tokens:', error);
        process.exit(1);
    }
}

// Run the check
checkTempTokens()
    .then(() => {
        console.log('🎉 Token check completed!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Token check failed:', error);
        process.exit(1);
    });
