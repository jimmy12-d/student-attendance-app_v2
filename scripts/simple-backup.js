#!/usr/bin/env node

/**
 * Direct Firebase Backup Test
 * Tests the backup functionality with minimal dependencies
 */

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs').promises;
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const BACKUP_DIR = path.join(process.cwd(), 'backups', 'firestore');

async function createSimpleBackup() {
    console.log('🚀 Starting simple Firebase backup...\n');
    
    try {
        // Initialize Firebase Admin
        if (!getApps().length) {
            const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
            
            initializeApp({
                credential: cert({
                    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: privateKey,
                }),
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            });
        }

        const db = getFirestore();
        console.log('✅ Firebase Admin SDK initialized');
        
        // Generate backup ID
        const backupId = `backup-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)}`;
        const backupPath = path.join(BACKUP_DIR, backupId);
        
        // Create backup directory
        await fs.mkdir(backupPath, { recursive: true });
        console.log(`📁 Created backup directory: ${backupId}`);
        
        // Get all collections
        const collections = await db.listCollections();
        console.log(`📋 Found ${collections.length} collections:`, collections.map(c => c.id).join(', '));
        
        const collectionBackups = [];
        let totalDocuments = 0;
        
        // Backup each collection
        for (const collection of collections) {
            console.log(`🔄 Backing up collection: ${collection.id}`);
            
            const snapshot = await collection.get();
            const documents = [];
            
            snapshot.forEach(doc => {
                const data = doc.data();
                // Convert Firestore types to JSON-serializable format
                const serializedData = JSON.parse(JSON.stringify(data, (key, value) => {
                    if (value && typeof value === 'object' && value.constructor.name === 'Timestamp') {
                        return {
                            _type: 'timestamp',
                            _value: value.toDate().toISOString()
                        };
                    }
                    return value;
                }));
                
                documents.push({
                    id: doc.id,
                    data: serializedData
                });
            });
            
            // Save collection backup
            const collectionBackup = {
                collection: collection.id,
                totalDocuments: documents.length,
                backupTimestamp: new Date().toISOString(),
                documents: documents
            };
            
            const fileName = `${collection.id}.json`;
            const filePath = path.join(backupPath, fileName);
            await fs.writeFile(filePath, JSON.stringify(collectionBackup, null, 2));
            
            collectionBackups.push({
                collection: collection.id,
                documentCount: documents.length,
                filePath: fileName,
                size: (await fs.stat(filePath)).size
            });
            
            totalDocuments += documents.length;
            console.log(`✅ Backed up ${documents.length} documents from ${collection.id}`);
        }
        
        // Create manifest
        const manifest = {
            backupId: backupId,
            timestamp: new Date().toISOString(),
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            totalCollections: collections.length,
            totalDocuments: totalDocuments,
            collections: collectionBackups,
            version: '1.0.0'
        };
        
        const manifestPath = path.join(backupPath, 'backup-manifest.json');
        await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
        
        console.log(`\n🎉 Backup completed successfully!`);
        console.log(`📊 ${collections.length} collections, ${totalDocuments} documents`);
        console.log(`📁 Backup ID: ${backupId}`);
        
        return {
            success: true,
            backupId: backupId,
            manifest: manifest
        };
        
    } catch (error) {
        console.error('❌ Backup failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

if (require.main === module) {
    createSimpleBackup().then(result => {
        process.exit(result.success ? 0 : 1);
    });
}

module.exports = createSimpleBackup;
