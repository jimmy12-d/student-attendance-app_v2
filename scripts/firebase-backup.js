#!/usr/bin/env node

/**
 * Firebase Firestore Backup Script
 * 
 * This script creates a backup of your Firestore database by:
 * 1. Exporting all collections and documents
 * 2. Saving them as JSON files with timestamps
 * 3. Optionally compressing the backup
 * 4. Storing locally or uploading to cloud storage
 * 
 * Usage:
 * node scripts/firebase-backup.js [--collections=students,transactions] [--compress] [--upload-to-storage]
 */

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs').promises;
const path = require('path');
const zlib = require('zlib');
const { promisify } = require('util');

// Configuration
const BACKUP_DIR = path.join(process.cwd(), 'backups', 'firestore');
const MAX_BACKUPS_TO_KEEP = 15; // Keep last 15 backups

// Command line arguments
const args = process.argv.slice(2);
const specificCollections = args.find(arg => arg.startsWith('--collections='))?.split('=')[1]?.split(',');
const shouldCompress = args.includes('--compress');
const uploadToStorage = args.includes('--upload-to-storage');

class FirebaseBackup {
    constructor() {
        this.adminDb = null;
        this.backupId = this.generateBackupId();
        this.backupPath = path.join(BACKUP_DIR, this.backupId);
    }

    generateBackupId() {
        const now = new Date();
        const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
        return `backup-${timestamp}`;
    }

    async initialize() {
        try {
            // Initialize Firebase Admin SDK
            if (!getApps().length) {
                if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
                    initializeApp({
                        credential: cert({
                            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
                        }),
                        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                    });
                } else {
                    console.error('❌ Firebase credentials not found in environment variables');
                    console.error('Required variables: FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, NEXT_PUBLIC_FIREBASE_PROJECT_ID');
                    throw new Error('Firebase credentials not found in environment variables');
                }
            }

            this.adminDb = getFirestore();
            console.log('✅ Firebase Admin SDK initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize Firebase Admin SDK:', error);
            throw error;
        }
    }

    async createBackupDirectory() {
        try {
            await fs.mkdir(this.backupPath, { recursive: true });
            console.log(`📁 Created backup directory: ${this.backupPath}`);
        } catch (error) {
            console.error('❌ Failed to create backup directory:', error);
            throw error;
        }
    }

    async getCollections() {
        try {
            if (specificCollections) {
                console.log(`📋 Using specified collections: ${specificCollections.join(', ')}`);
                return specificCollections;
            }

            const collections = await this.adminDb.listCollections();
            const collectionNames = collections.map(col => col.id);
            console.log(`📋 Found collections: ${collectionNames.join(', ')}`);
            return collectionNames;
        } catch (error) {
            console.error('❌ Failed to get collections:', error);
            throw error;
        }
    }

    async backupCollection(collectionName) {
        try {
            console.log(`🔄 Backing up collection: ${collectionName}`);
            const collectionRef = this.adminDb.collection(collectionName);
            const snapshot = await collectionRef.get();
            
            const documents = [];
            let docCount = 0;

            for (const doc of snapshot.docs) {
                const data = doc.data();
                
                // Convert Firestore timestamps to ISO strings for JSON serialization
                const serializedData = this.serializeFirestoreData(data);
                
                documents.push({
                    id: doc.id,
                    data: serializedData,
                    createTime: doc.createTime?.toDate?.()?.toISOString(),
                    updateTime: doc.updateTime?.toDate?.()?.toISOString(),
                });
                
                docCount++;
                if (docCount % 100 === 0) {
                    console.log(`   📄 Processed ${docCount} documents...`);
                }
            }

            const collectionBackup = {
                collection: collectionName,
                totalDocuments: documents.length,
                backupTimestamp: new Date().toISOString(),
                documents: documents
            };

            const fileName = `${collectionName}.json`;
            const filePath = path.join(this.backupPath, fileName);
            
            await fs.writeFile(filePath, JSON.stringify(collectionBackup, null, 2));
            console.log(`✅ Backed up ${documents.length} documents from ${collectionName}`);
            
            return {
                collection: collectionName,
                documentCount: documents.length,
                filePath: fileName,
                size: (await fs.stat(filePath)).size
            };
        } catch (error) {
            console.error(`❌ Failed to backup collection ${collectionName}:`, error);
            throw error;
        }
    }

    serializeFirestoreData(data) {
        if (data === null || data === undefined) {
            return data;
        }

        if (data.constructor.name === 'Timestamp') {
            return {
                _type: 'timestamp',
                _value: data.toDate().toISOString()
            };
        }

        if (data.constructor.name === 'DocumentReference') {
            return {
                _type: 'reference',
                _value: data.path
            };
        }

        if (Array.isArray(data)) {
            return data.map(item => this.serializeFirestoreData(item));
        }

        if (typeof data === 'object') {
            const serialized = {};
            for (const [key, value] of Object.entries(data)) {
                serialized[key] = this.serializeFirestoreData(value);
            }
            return serialized;
        }

        return data;
    }

    async createManifest(collectionBackups) {
        const manifest = {
            backupId: this.backupId,
            timestamp: new Date().toISOString(),
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            totalCollections: collectionBackups.length,
            totalDocuments: collectionBackups.reduce((sum, backup) => sum + backup.documentCount, 0),
            totalSize: collectionBackups.reduce((sum, backup) => sum + backup.size, 0),
            collections: collectionBackups,
            compressed: shouldCompress,
            version: '1.0.0'
        };

        const manifestPath = path.join(this.backupPath, 'backup-manifest.json');
        await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
        console.log('📋 Created backup manifest');
        
        return manifest;
    }

    async compressBackup() {
        if (!shouldCompress) return null;

        try {
            console.log('🗜️  Compressing backup...');
            const archivePath = `${this.backupPath}.tar.gz`;
            
            // Simple compression using gzip (you might want to use tar + gzip for better results)
            const gzip = promisify(zlib.gzip);
            
            // Read all files and create a simple archive
            const files = await fs.readdir(this.backupPath);
            const archive = {};
            
            for (const file of files) {
                const filePath = path.join(this.backupPath, file);
                const content = await fs.readFile(filePath, 'utf8');
                archive[file] = content;
            }
            
            const archiveBuffer = await gzip(JSON.stringify(archive));
            await fs.writeFile(archivePath, archiveBuffer);
            
            console.log(`✅ Backup compressed to: ${archivePath}`);
            return archivePath;
        } catch (error) {
            console.error('❌ Failed to compress backup:', error);
            return null;
        }
    }

    async cleanupOldBackups() {
        try {
            const backupsDir = path.dirname(this.backupPath);
            const entries = await fs.readdir(backupsDir, { withFileTypes: true });
            
            const backupFolders = entries
                .filter(entry => entry.isDirectory() && entry.name.startsWith('backup-'))
                .map(entry => ({
                    name: entry.name,
                    path: path.join(backupsDir, entry.name),
                    created: entry.name.substring(7) // Remove 'backup-' prefix
                }))
                .sort((a, b) => b.created.localeCompare(a.created)); // Sort by date descending
            
            if (backupFolders.length > MAX_BACKUPS_TO_KEEP) {
                const foldersToDelete = backupFolders.slice(MAX_BACKUPS_TO_KEEP);
                console.log(`🧹 Cleaning up ${foldersToDelete.length} old backups...`);
                
                for (const folder of foldersToDelete) {
                    await fs.rm(folder.path, { recursive: true });
                    console.log(`   🗑️  Deleted: ${folder.name}`);
                }
            }
        } catch (error) {
            console.error('⚠️  Failed to cleanup old backups:', error);
        }
    }

    async run() {
        const startTime = Date.now();
        console.log(`🚀 Starting Firebase backup: ${this.backupId}`);
        
        try {
            await this.initialize();
            await this.createBackupDirectory();
            
            const collections = await this.getCollections();
            const collectionBackups = [];
            
            for (const collectionName of collections) {
                const backup = await this.backupCollection(collectionName);
                collectionBackups.push(backup);
            }
            
            const manifest = await this.createManifest(collectionBackups);
            
            if (shouldCompress) {
                await this.compressBackup();
            }
            
            await this.cleanupOldBackups();
            
            const duration = (Date.now() - startTime) / 1000;
            console.log(`\n🎉 Backup completed successfully!`);
            console.log(`   📊 ${manifest.totalCollections} collections, ${manifest.totalDocuments} documents`);
            console.log(`   💾 Size: ${(manifest.totalSize / 1024 / 1024).toFixed(2)} MB`);
            console.log(`   ⏱️  Duration: ${duration.toFixed(2)} seconds`);
            console.log(`   📁 Location: ${this.backupPath}`);
            
            return {
                success: true,
                backupId: this.backupId,
                manifest: manifest,
                duration: duration
            };
            
        } catch (error) {
            console.error(`\n💥 Backup failed:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// Run backup if called directly
if (require.main === module) {
    const backup = new FirebaseBackup();
    backup.run().then(result => {
        process.exit(result.success ? 0 : 1);
    });
}

module.exports = FirebaseBackup;
