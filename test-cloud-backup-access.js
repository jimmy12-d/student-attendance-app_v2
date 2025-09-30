#!/usr/bin/env node

/**
 * Quick test script to verify cloud backup accessibility
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

async function testCloudBackupAccess() {
    try {
        console.log('🧪 Testing cloud backup access...');
        
        // Initialize Firebase Admin (using environment variables)
        if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
            const serviceAccount = {
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            };
            
            initializeApp({
                credential: cert(serviceAccount),
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
            });
        } else {
            // Use default credentials
            initializeApp();
        }
        
        const db = getFirestore();
        
        // Test access to backupHistory collection
        console.log('📊 Checking backupHistory collection access...');
        const backupHistoryRef = db.collection('backupHistory');
        const recentBackups = await backupHistoryRef
            .orderBy('timestamp', 'desc')
            .limit(3)
            .get();
        
        console.log(`✅ Found ${recentBackups.size} backup records`);
        
        if (!recentBackups.empty) {
            console.log('\n📋 Recent backups:');
            recentBackups.forEach(doc => {
                const data = doc.data();
                const timestamp = data.timestamp?.toDate?.() || new Date(data.timestamp);
                console.log(`   - ${data.backupId}: ${data.status} (${timestamp.toISOString()})`);
            });
        }
        
        // Test access to authorizedUsers collection (for admin verification)
        console.log('\n🔐 Testing admin access verification...');
        const adminEmail = 'kemhoutlem@gmail.com'; // Replace with your admin email
        const authorizedUserDoc = await db.collection('authorizedUsers').doc(adminEmail).get();
        
        if (authorizedUserDoc.exists) {
            console.log(`✅ Admin verification works for ${adminEmail}`);
        } else {
            console.log(`⚠️  Admin email ${adminEmail} not found in authorizedUsers`);
        }
        
        console.log('\n🎉 Cloud backup system test completed!');
        console.log('\n📱 Next steps:');
        console.log('   1. Visit /dashboard/cloud-backup in your app');
        console.log('   2. Look for "Admin Tools" in the left navigation menu');
        console.log('   3. Click "Cloud Backup" to access the interface');
        console.log('   4. Try creating a manual backup');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        
        if (error.message.includes('credentials')) {
            console.log('\n💡 Tips:');
            console.log('   - Make sure your .env.local file has the Firebase credentials');
            console.log('   - Or run this from a machine with gcloud credentials');
        }
        
        if (error.message.includes('permission')) {
            console.log('\n💡 Tips:');
            console.log('   - Check your Firestore security rules');
            console.log('   - Make sure your admin email is in the authorizedUsers collection');
        }
        
        process.exit(1);
    }
}

// Run the test
testCloudBackupAccess();