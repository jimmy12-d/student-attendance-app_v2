// API endpoint for Firebase backup management
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const BACKUP_DIR = path.join(process.cwd(), 'backups', 'firestore');

// For now, let's create a workaround that uses the simple backup script
// This avoids the complex Firebase admin initialization issues

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action');

        switch (action) {
            case 'list':
                return await listBackups();
            case 'manifest':
                const backupId = searchParams.get('backupId');
                if (!backupId) {
                    return NextResponse.json({ error: 'Backup ID is required' }, { status: 400 });
                }
                return await getBackupManifest(backupId);
            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }
    } catch (error) {
        console.error('Backup API error:', error);
        return NextResponse.json({ 
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, ...options } = body;

        switch (action) {
            case 'create':
                return await createBackup(options);
            case 'restore':
                return await restoreBackup(options);
            case 'delete':
                return await deleteBackup(options.backupId);
            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }
    } catch (error) {
        console.error('Backup API error:', error);
        return NextResponse.json({ 
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

async function listBackups() {
    try {
        // Ensure backup directory exists
        await fs.mkdir(BACKUP_DIR, { recursive: true });
        
        const entries = await fs.readdir(BACKUP_DIR, { withFileTypes: true });
        const backups = [];

        for (const entry of entries) {
            if (entry.isDirectory() && entry.name.startsWith('backup-')) {
                try {
                    const manifestPath = path.join(BACKUP_DIR, entry.name, 'backup-manifest.json');
                    const manifestContent = await fs.readFile(manifestPath, 'utf8');
                    const manifest = JSON.parse(manifestContent);
                    
                    // Get directory stats for size
                    const backupPath = path.join(BACKUP_DIR, entry.name);
                    const stats = await getDirectorySize(backupPath);
                    
                    backups.push({
                        ...manifest,
                        actualSize: stats.size,
                        fileCount: stats.fileCount
                    });
                } catch (error) {
                    console.error(`Failed to read manifest for ${entry.name}:`, error);
                    // Include backup even if manifest is corrupted
                    backups.push({
                        backupId: entry.name,
                        timestamp: new Date().toISOString(),
                        error: 'Corrupted backup - manifest unreadable',
                        status: 'corrupted'
                    });
                }
            }
        }

        // Sort by timestamp (newest first)
        backups.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        return NextResponse.json({
            success: true,
            backups: backups,
            totalBackups: backups.length
        });
    } catch (error) {
        throw new Error(`Failed to list backups: ${error.message}`);
    }
}

async function getBackupManifest(backupId: string) {
    try {
        const manifestPath = path.join(BACKUP_DIR, backupId, 'backup-manifest.json');
        const manifestContent = await fs.readFile(manifestPath, 'utf8');
        const manifest = JSON.parse(manifestContent);

        return NextResponse.json({
            success: true,
            manifest: manifest
        });
    } catch (error) {
        return NextResponse.json({
            error: 'Backup not found or corrupted',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 404 });
    }
}

async function createBackup(options: any) {
    try {
        console.log('Creating backup with options:', options);
        
        // Use the simple backup script instead of the complex one
        let command = 'node scripts/simple-backup.js';

        console.log('Executing command:', command);
        
        // Execute the backup script
        const { stdout, stderr } = await execAsync(command, {
            cwd: process.cwd(),
            env: { ...process.env },
            timeout: 300000 // 5 minutes timeout
        });

        console.log('Backup stdout:', stdout);
        if (stderr) console.log('Backup stderr:', stderr);

        // Check if the backup was successful
        if (stdout.includes('Backup completed successfully!')) {
            // Extract backup ID from output
            const backupIdMatch = stdout.match(/Backup ID: (backup-[^\s]+)/);
            const backupId = backupIdMatch ? backupIdMatch[1] : null;

            if (backupId) {
                try {
                    // Try to read the manifest
                    const manifestPath = path.join(BACKUP_DIR, backupId, 'backup-manifest.json');
                    const manifestContent = await fs.readFile(manifestPath, 'utf8');
                    const manifest = JSON.parse(manifestContent);
                    
                    return NextResponse.json({
                        success: true,
                        backupId: backupId,
                        manifest: manifest,
                        stdout: stdout
                    });
                } catch (manifestError) {
                    return NextResponse.json({
                        success: true,
                        backupId: backupId,
                        message: 'Backup created but manifest could not be read',
                        stdout: stdout
                    });
                }
            }
        }
        
        // If we get here, something went wrong
        throw new Error('Backup did not complete successfully. Check logs for details.');

    } catch (error) {
        console.error('Backup creation error:', error);
        
        // If the error contains private key issues, provide helpful message
        if (error.message?.includes('DECODER routines') || error.message?.includes('private key')) {
            return NextResponse.json({
                success: false,
                error: 'Firebase authentication failed. Please check your private key format in .env.local',
                details: 'The private key may have incorrect line endings. Make sure it starts with "-----BEGIN PRIVATE KEY-----" and ends with "-----END PRIVATE KEY-----" with proper \\n line breaks.',
                stdout: error.stdout,
                stderr: error.stderr
            }, { status: 500 });
        }
        
        return NextResponse.json({
            success: false,
            error: error.message,
            details: error.stdout || error.stderr || 'Unknown error',
            troubleshooting: 'Check your Firebase credentials in .env.local and ensure the service account has proper permissions.'
        }, { status: 500 });
    }
}

async function restoreBackup(options: any) {
    try {
        const { backupId, collections, dryRun } = options;
        
        if (!backupId) {
            throw new Error('Backup ID is required');
        }

        console.log('Restoring backup with options:', options);
        
        // Build command arguments
        let command = `node scripts/firebase-restore.js --backup-id=${backupId}`;
        
        if (collections && Array.isArray(collections) && collections.length > 0) {
            command += ` --collections=${collections.join(',')}`;
        }
        if (dryRun) {
            command += ' --dry-run';
        }

        console.log('Executing restore command:', command);
        
        // Execute the restore script
        const { stdout, stderr } = await execAsync(command, {
            cwd: process.cwd(),
            env: { ...process.env },
            timeout: 300000 // 5 minutes timeout
        });

        console.log('Restore stdout:', stdout);
        if (stderr) console.log('Restore stderr:', stderr);

        // Parse results from output
        let totalDocuments = 0;
        const lines = stdout.split('\n');
        
        for (const line of lines) {
            if (line.includes('documents')) {
                const match = line.match(/(\d+)\s+documents/);
                if (match) {
                    totalDocuments += parseInt(match[1]);
                }
            }
        }

        return NextResponse.json({
            success: true,
            backupId: backupId,
            totalDocuments: totalDocuments,
            dryRun: !!dryRun,
            stdout: stdout,
            stderr: stderr
        });

    } catch (error) {
        console.error('Restore error:', error);
        return NextResponse.json({
            success: false,
            error: error.message,
            details: error.stdout || error.stderr || 'Unknown error'
        }, { status: 500 });
    }
}

async function deleteBackup(backupId: string) {
    try {
        if (!backupId) {
            throw new Error('Backup ID is required');
        }

        const backupPath = path.join(BACKUP_DIR, backupId);
        
        // Check if backup exists
        try {
            await fs.access(backupPath);
        } catch {
            return NextResponse.json({
                error: 'Backup not found'
            }, { status: 404 });
        }

        // Delete the backup directory
        await fs.rm(backupPath, { recursive: true });

        return NextResponse.json({
            success: true,
            message: `Backup ${backupId} deleted successfully`
        });
    } catch (error) {
        throw new Error(`Failed to delete backup: ${error.message}`);
    }
}

async function getDirectorySize(dirPath: string): Promise<{ size: number; fileCount: number }> {
    let totalSize = 0;
    let fileCount = 0;

    async function calculateSize(currentPath: string) {
        const entries = await fs.readdir(currentPath, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(currentPath, entry.name);
            
            if (entry.isDirectory()) {
                await calculateSize(fullPath);
            } else {
                const stats = await fs.stat(fullPath);
                totalSize += stats.size;
                fileCount++;
            }
        }
    }

    await calculateSize(dirPath);
    return { size: totalSize, fileCount };
}
