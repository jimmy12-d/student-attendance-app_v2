#!/usr/bin/env node

/**
 * Simple test script to verify Firebase backup functionality
 * This helps debug API route issues
 */

require('dotenv').config({ path: '.env.local' });

async function testBackup() {
    console.log('🧪 Testing Firebase Backup System...\n');
    
    // Check environment variables
    console.log('1. Checking environment variables:');
    const requiredVars = [
        'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
        'FIREBASE_CLIENT_EMAIL', 
        'FIREBASE_PRIVATE_KEY'
    ];
    
    let envOk = true;
    for (const varName of requiredVars) {
        if (process.env[varName]) {
            console.log(`   ✅ ${varName}: Set`);
        } else {
            console.log(`   ❌ ${varName}: Missing`);
            envOk = false;
        }
    }
    
    if (!envOk) {
        console.log('\n❌ Missing required environment variables!');
        console.log('Please check your .env.local file');
        return;
    }
    
    console.log('\n2. Testing Firebase connection:');
    try {
        const { initializeApp, cert, getApps } = require('firebase-admin/app');
        const { getFirestore } = require('firebase-admin/firestore');
        
        if (!getApps().length) {
            initializeApp({
                credential: cert({
                    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
                }),
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            });
        }
        
        const db = getFirestore();
        const collections = await db.listCollections();
        console.log(`   ✅ Connected successfully`);
        console.log(`   📊 Found ${collections.length} collections:`, collections.map(c => c.id).join(', '));
        
    } catch (error) {
        console.log(`   ❌ Connection failed:`, error.message);
        return;
    }
    
    console.log('\n3. Testing backup creation:');
    try {
        const FirebaseBackup = require('./firebase-backup');
        const backup = new FirebaseBackup();
        
        console.log('   🚀 Starting backup...');
        const result = await backup.run();
        
        if (result.success) {
            console.log(`   ✅ Backup created successfully!`);
            console.log(`   📁 Backup ID: ${result.backupId}`);
            console.log(`   📊 Collections: ${result.manifest.totalCollections}`);
            console.log(`   📄 Documents: ${result.manifest.totalDocuments}`);
            console.log(`   ⏱️  Duration: ${result.duration.toFixed(2)}s`);
        } else {
            console.log(`   ❌ Backup failed:`, result.error);
        }
        
    } catch (error) {
        console.log(`   ❌ Backup creation failed:`, error.message);
        console.error('   Full error:', error);
    }
    
    console.log('\n🎉 Test completed!');
}

if (require.main === module) {
    testBackup().catch(console.error);
}

module.exports = testBackup;
