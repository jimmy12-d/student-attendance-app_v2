#!/usr/bin/env node

/**
 * Firebase Firestore Restore Script
 * 
 * This script restores a Firestore database from a backup created by firebase-backup.js
 * 
 * Usage:
 * node scripts/firebase-restore.js --backup-id=backup-2024-01-15T10-30-00 [--collections=students,transactions] [--dry-run]
 */

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const BACKUP_DIR = path.join(process.cwd(), 'backups', 'firestore');

// Command line arguments
const args = process.argv.slice(2);
const backupId = args.find(arg => arg.startsWith('--backup-id='))?.split('=')[1];
const specificCollections = args.find(arg => arg.startsWith('--collections='))?.split('=')[1]?.split(',');
const isDryRun = args.includes('--dry-run');

class FirebaseRestore {
    constructor(backupId) {
        this.backupId = backupId;
        this.backupPath = path.join(BACKUP_DIR, backupId);
        this.adminDb = null;
        this.manifest = null;
    }

    async initialize() {
        try {
            // Initialize Firebase Admin SDK
            if (!getApps().length) {
                // Try to use service account key file first
                const serviceAccountPath = path.join(process.cwd(), 'firestore-upload', 'serviceAccountKey.json');
                try {
                    await fs.access(serviceAccountPath);
                    const serviceAccount = JSON.parse(await fs.readFile(serviceAccountPath, 'utf8'));
                    
                    initializeApp({
                        credential: cert(serviceAccount),
                        projectId: serviceAccount.project_id,
                    });
                    
                    console.log('✅ Using service account key file for authentication');
                } catch (serviceAccountError) {
                    // Fallback to environment variables
                    if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
                        initializeApp({
                            credential: cert({
                                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
                            }),
                            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                        });
                        
                        console.log('✅ Using environment variables for authentication');
                    } else {
                        throw new Error('Neither service account key file nor Firebase credentials found in environment variables');
                    }
                }
            }

            this.adminDb = getFirestore();
            console.log('✅ Firebase Admin SDK initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize Firebase Admin SDK:', error);
            throw error;
        }
    }

    async loadManifest() {
        try {
            const manifestPath = path.join(this.backupPath, 'backup-manifest.json');
            const manifestContent = await fs.readFile(manifestPath, 'utf8');
            this.manifest = JSON.parse(manifestContent);
            
            console.log(`📋 Loaded backup manifest:`);
            console.log(`   🆔 Backup ID: ${this.manifest.backupId}`);
            console.log(`   📅 Created: ${this.manifest.timestamp}`);
            console.log(`   📊 Collections: ${this.manifest.totalCollections}`);
            console.log(`   📄 Documents: ${this.manifest.totalDocuments}`);
            
            return this.manifest;
        } catch (error) {
            console.error('❌ Failed to load backup manifest:', error);
            throw error;
        }
    }

    async validateBackup() {
        try {
            // Check if backup directory exists
            await fs.access(this.backupPath);
            
            // Load and validate manifest
            await this.loadManifest();
            
            // Check if all collection files exist
            for (const collection of this.manifest.collections) {
                const filePath = path.join(this.backupPath, collection.filePath);
                await fs.access(filePath);
            }
            
            console.log('✅ Backup validation successful');
            return true;
        } catch (error) {
            console.error('❌ Backup validation failed:', error);
            throw error;
        }
    }

    deserializeFirestoreData(data) {
        if (data === null || data === undefined) {
            return data;
        }

        if (typeof data === 'object' && data._type) {
            switch (data._type) {
                case 'timestamp':
                    // Use the Timestamp from firebase-admin/firestore
                    const { Timestamp } = require('firebase-admin/firestore');
                    return Timestamp.fromDate(new Date(data._value));
                case 'reference':
                    return this.adminDb.doc(data._value);
                default:
                    return data;
            }
        }

        if (Array.isArray(data)) {
            return data.map(item => this.deserializeFirestoreData(item));
        }

        if (typeof data === 'object') {
            const deserialized = {};
            for (const [key, value] of Object.entries(data)) {
                deserialized[key] = this.deserializeFirestoreData(value);
            }
            return deserialized;
        }

        return data;
    }

    async restoreCollection(collectionName) {
        try {
            console.log(`🔄 Restoring collection: ${collectionName}`);
            
            const filePath = path.join(this.backupPath, `${collectionName}.json`);
            const backupContent = await fs.readFile(filePath, 'utf8');
            const backup = JSON.parse(backupContent);
            
            if (isDryRun) {
                console.log(`   📊 [DRY RUN] Would restore ${backup.documents.length} documents to ${collectionName}`);
                return {
                    collection: collectionName,
                    documentsRestored: backup.documents.length,
                    dryRun: true
                };
            }
            
            const batch = this.adminDb.batch();
            let batchCount = 0;
            let totalRestored = 0;
            
            for (const document of backup.documents) {
                const docRef = this.adminDb.collection(collectionName).doc(document.id);
                const deserializedData = this.deserializeFirestoreData(document.data);
                
                batch.set(docRef, deserializedData);
                batchCount++;
                
                // Firestore batch limit is 500 operations
                if (batchCount >= 500) {
                    await batch.commit();
                    totalRestored += batchCount;
                    console.log(`   📄 Restored ${totalRestored} documents...`);
                    batchCount = 0;
                }
            }
            
            // Commit remaining documents
            if (batchCount > 0) {
                await batch.commit();
                totalRestored += batchCount;
            }
            
            console.log(`✅ Restored ${totalRestored} documents to ${collectionName}`);
            
            return {
                collection: collectionName,
                documentsRestored: totalRestored,
                dryRun: false
            };
            
        } catch (error) {
            console.error(`❌ Failed to restore collection ${collectionName}:`, error);
            throw error;
        }
    }

    async run() {
        const startTime = Date.now();
        console.log(`🚀 Starting Firebase restore${isDryRun ? ' (DRY RUN)' : ''}: ${this.backupId}`);
        
        try {
            await this.initialize();
            await this.validateBackup();
            
            const collectionsToRestore = specificCollections || 
                this.manifest.collections.map(col => col.collection);
            
            console.log(`📋 Collections to restore: ${collectionsToRestore.join(', ')}`);
            
            if (!isDryRun) {
                console.log('\n⚠️  WARNING: This will overwrite existing data in Firestore!');
                console.log('   Press Ctrl+C to cancel or wait 5 seconds to continue...');
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
            
            const restoredCollections = [];
            
            for (const collectionName of collectionsToRestore) {
                const result = await this.restoreCollection(collectionName);
                restoredCollections.push(result);
            }
            
            const totalDocuments = restoredCollections.reduce((sum, col) => sum + col.documentsRestored, 0);
            const duration = (Date.now() - startTime) / 1000;
            
            console.log(`\n🎉 Restore ${isDryRun ? 'simulation ' : ''}completed successfully!`);
            console.log(`   📊 ${restoredCollections.length} collections, ${totalDocuments} documents`);
            console.log(`   ⏱️  Duration: ${duration.toFixed(2)} seconds`);
            
            return {
                success: true,
                backupId: this.backupId,
                collectionsRestored: restoredCollections,
                totalDocuments: totalDocuments,
                duration: duration,
                dryRun: isDryRun
            };
            
        } catch (error) {
            console.error(`\n💥 Restore failed:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// Run restore if called directly
if (require.main === module) {
    if (!backupId) {
        console.error('❌ Please provide a backup ID using --backup-id=<backup-id>');
        console.log('\nUsage examples:');
        console.log('  node scripts/firebase-restore.js --backup-id=backup-2024-01-15T10-30-00');
        console.log('  node scripts/firebase-restore.js --backup-id=backup-2024-01-15T10-30-00 --collections=students,transactions');
        console.log('  node scripts/firebase-restore.js --backup-id=backup-2024-01-15T10-30-00 --dry-run');
        process.exit(1);
    }
    
    const restore = new FirebaseRestore(backupId);
    restore.run().then(result => {
        process.exit(result.success ? 0 : 1);
    });
}

module.exports = FirebaseRestore;
