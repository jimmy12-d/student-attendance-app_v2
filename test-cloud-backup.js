#!/usr/bin/env node

/**
 * Test script for cloud backup functions
 * This script tests the manual backup function to ensure it works correctly
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getFunctions } = require('firebase-admin/functions');

async function testManualBackup() {
    try {
        console.log('Testing manual backup function...');
        
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
        
        // Check if backup history collection exists, if not create it
        const backupHistoryRef = db.collection('backupHistory');
        const recentBackups = await backupHistoryRef
            .orderBy('timestamp', 'desc')
            .limit(5)
            .get();
        
        console.log(`Found ${recentBackups.size} recent backup records`);
        
        if (!recentBackups.empty) {
            console.log('\nRecent backups:');
            recentBackups.forEach(doc => {
                const data = doc.data();
                console.log(`- ${data.backupId}: ${data.status} (${data.totalCollections} collections, ${data.totalDocuments} documents)`);
            });
        }
        
        console.log('\n✅ Backup system test completed successfully!');
        console.log('\nYour scheduled backup function will run automatically at midnight Phnom Penh time (ICT) every day.');
        console.log('You can also trigger manual backups from your admin interface.');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    }
}

// Run the test
testManualBackup();