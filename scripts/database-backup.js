#!/usr/bin/env node

/**
 * Simple Firebase Database Backup
 * This script backs up only your Firebase database data (students, transactions, etc.)
 * No code backup needed since you have Git for that.
 */

require('dotenv').config({ path: '.env.local' });
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs').promises;
const path = require('path');

const BACKUP_DIR = path.join(process.cwd(), 'database-backups');
const MAX_BACKUPS = 15; // Keep last 15 backups

class DatabaseBackup {
    constructor() {
        this.backupId = this.generateBackupId();
        this.backupPath = path.join(BACKUP_DIR, this.backupId);
    }

    generateBackupId() {
        const now = new Date();
        return `database-backup-${now.toISOString().replace(/[:.]/g, '-').slice(0, -5)}`;
    }

    async initialize() {
        try {
            if (!getApps().length) {
                const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
                
                if (!privateKey || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
                    throw new Error('Missing Firebase credentials in .env.local');
                }

                initializeApp({
                    credential: cert({
                        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                        privateKey: privateKey,
                    }),
                    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                });
            }

            this.db = getFirestore();
            console.log('✅ Connected to Firebase');
        } catch (error) {
            console.error('❌ Firebase connection failed:', error.message);
            throw error;
        }
    }

    async createBackupDir() {
        await fs.mkdir(this.backupPath, { recursive: true });
        console.log(`📁 Created backup directory: ${this.backupId}`);
    }

    async backupCollection(collectionName) {
        try {
            console.log(`📥 Backing up: ${collectionName}...`);
            
            const collection = this.db.collection(collectionName);
            const snapshot = await collection.get();
            
            const documents = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                
                // Convert Firestore timestamps to ISO strings
                const processedData = this.processFirestoreData(data);
                
                documents.push({
                    id: doc.id,
                    data: processedData
                });
            });

            // Save collection data
            const fileName = `${collectionName}.json`;
            const filePath = path.join(this.backupPath, fileName);
            
            await fs.writeFile(filePath, JSON.stringify({
                collection: collectionName,
                timestamp: new Date().toISOString(),
                documentCount: documents.length,
                documents: documents
            }, null, 2));

            console.log(`   ✅ ${documents.length} documents backed up`);
            return { collection: collectionName, count: documents.length };

        } catch (error) {
            console.error(`   ❌ Failed to backup ${collectionName}:`, error.message);
            return { collection: collectionName, count: 0, error: error.message };
        }
    }

    processFirestoreData(data) {
        if (data === null || data === undefined) return data;

        if (data.constructor.name === 'Timestamp') {
            return data.toDate().toISOString();
        }

        if (Array.isArray(data)) {
            return data.map(item => this.processFirestoreData(item));
        }

        if (typeof data === 'object') {
            const processed = {};
            for (const [key, value] of Object.entries(data)) {
                processed[key] = this.processFirestoreData(value);
            }
            return processed;
        }

        return data;
    }

    async cleanupOldBackups() {
        try {
            const entries = await fs.readdir(BACKUP_DIR, { withFileTypes: true });
            const backupFolders = entries
                .filter(entry => entry.isDirectory() && entry.name.startsWith('database-backup-'))
                .sort((a, b) => b.name.localeCompare(a.name)); // Sort newest first

            if (backupFolders.length > MAX_BACKUPS) {
                const toDelete = backupFolders.slice(MAX_BACKUPS);
                console.log(`🧹 Cleaning up ${toDelete.length} old backups...`);
                
                for (const folder of toDelete) {
                    await fs.rm(path.join(BACKUP_DIR, folder.name), { recursive: true });
                    console.log(`   🗑️  Deleted: ${folder.name}`);
                }
            }
        } catch (error) {
            console.error('⚠️  Cleanup warning:', error.message);
        }
    }

    async run() {
        const startTime = Date.now();
        console.log(`🚀 Starting database backup: ${this.backupId}\n`);

        try {
            await this.initialize();
            await this.createBackupDir();

            // Get all collections
            const collections = await this.db.listCollections();
            console.log(`📋 Found collections: ${collections.map(c => c.id).join(', ')}\n`);

            const results = [];
            let totalDocuments = 0;

            // Backup each collection
            for (const collection of collections) {
                const result = await this.backupCollection(collection.id);
                results.push(result);
                totalDocuments += result.count || 0;
            }

            // Create summary
            const summary = {
                backupId: this.backupId,
                timestamp: new Date().toISOString(),
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                totalCollections: collections.length,
                totalDocuments: totalDocuments,
                collections: results,
                duration: (Date.now() - startTime) / 1000
            };

            await fs.writeFile(
                path.join(this.backupPath, 'backup-summary.json'),
                JSON.stringify(summary, null, 2)
            );

            await this.cleanupOldBackups();

            console.log(`\n🎉 Database backup completed!`);
            console.log(`📊 ${summary.totalCollections} collections, ${summary.totalDocuments} documents`);
            console.log(`⏱️  Duration: ${summary.duration.toFixed(2)} seconds`);
            console.log(`📁 Saved to: ${this.backupPath}`);

            return { success: true, summary };

        } catch (error) {
            console.error(`\n💥 Backup failed:`, error.message);
            return { success: false, error: error.message };
        }
    }
}

// Run backup if called directly
if (require.main === module) {
    const backup = new DatabaseBackup();
    backup.run().then(result => {
        process.exit(result.success ? 0 : 1);
    });
}

module.exports = DatabaseBackup;
