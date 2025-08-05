#!/usr/bin/env node

/**
 * Create a mock backup for testing the web interface
 * This helps test the backup management UI while Firebase credentials are being fixed
 */

const fs = require('fs').promises;
const path = require('path');

const BACKUP_DIR = path.join(process.cwd(), 'backups', 'firestore');

async function createMockBackup() {
    console.log('🧪 Creating mock backup for testing...');
    
    try {
        // Create backup directory
        await fs.mkdir(BACKUP_DIR, { recursive: true });
        
        // Generate mock backup ID
        const backupId = `backup-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)}`;
        const backupPath = path.join(BACKUP_DIR, backupId);
        
        await fs.mkdir(backupPath, { recursive: true });
        console.log(`📁 Created mock backup directory: ${backupId}`);
        
        // Create mock collection data
        const mockCollections = [
            {
                collection: 'students',
                documentCount: 125,
                filePath: 'students.json',
                size: 512000
            },
            {
                collection: 'transactions', 
                documentCount: 1250,
                filePath: 'transactions.json',
                size: 256000
            },
            {
                collection: 'classes',
                documentCount: 15,
                filePath: 'classes.json',
                size: 32000
            },
            {
                collection: 'classTypes',
                documentCount: 8,
                filePath: 'classTypes.json',
                size: 16000
            }
        ];
        
        // Create mock data files
        for (const collection of mockCollections) {
            const mockData = {
                collection: collection.collection,
                totalDocuments: collection.documentCount,
                backupTimestamp: new Date().toISOString(),
                documents: [
                    {
                        id: 'mock-doc-1',
                        data: { name: 'Mock Data', createdAt: new Date().toISOString() }
                    },
                    {
                        id: 'mock-doc-2', 
                        data: { name: 'Test Data', createdAt: new Date().toISOString() }
                    }
                ]
            };
            
            const filePath = path.join(backupPath, collection.filePath);
            await fs.writeFile(filePath, JSON.stringify(mockData, null, 2));
        }
        
        // Create manifest
        const manifest = {
            backupId: backupId,
            timestamp: new Date().toISOString(),
            projectId: 'mock-project-id',
            totalCollections: mockCollections.length,
            totalDocuments: mockCollections.reduce((sum, col) => sum + col.documentCount, 0),
            totalSize: mockCollections.reduce((sum, col) => sum + col.size, 0),
            collections: mockCollections,
            compressed: false,
            version: '1.0.0',
            note: 'This is a mock backup for testing the web interface'
        };
        
        const manifestPath = path.join(backupPath, 'backup-manifest.json');
        await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
        
        console.log(`✅ Mock backup created successfully!`);
        console.log(`📊 ${manifest.totalCollections} collections, ${manifest.totalDocuments} documents`);
        console.log(`📁 Backup ID: ${backupId}`);
        console.log(`💡 You can now test the web interface at /admin/backup`);
        
        return {
            success: true,
            backupId: backupId,
            manifest: manifest
        };
        
    } catch (error) {
        console.error('❌ Failed to create mock backup:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

if (require.main === module) {
    createMockBackup().then(result => {
        process.exit(result.success ? 0 : 1);
    });
}

module.exports = createMockBackup;
