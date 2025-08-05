#!/usr/bin/env node

/**
 * Scheduled Firebase Backup Service
 * 
 * This script sets up automated daily backups of your Firestore database.
 * It uses node-cron to schedule backups and includes error handling and notifications.
 * 
 * Usage:
 * node scripts/scheduled-backup.js [--start-daemon] [--cron-schedule="0 2 * * *"]
 */

const cron = require('node-cron');
const FirebaseBackup = require('./firebase-backup');
const path = require('path');
const fs = require('fs').promises;

// Configuration
const DEFAULT_CRON_SCHEDULE = '0 0 * * *'; // Daily at 12 AM (midnight)
const LOG_FILE = path.join(process.cwd(), 'logs', 'backup-scheduler.log');

// Command line arguments
const args = process.argv.slice(2);
const isDaemon = args.includes('--start-daemon');
const customSchedule = args.find(arg => arg.startsWith('--cron-schedule='))?.split('=')[1];
const cronSchedule = customSchedule || DEFAULT_CRON_SCHEDULE;

class BackupScheduler {
    constructor() {
        this.isRunning = false;
        this.lastBackupTime = null;
        this.lastBackupResult = null;
    }

    async ensureLogDirectory() {
        const logDir = path.dirname(LOG_FILE);
        await fs.mkdir(logDir, { recursive: true });
    }

    async log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${level}] ${message}\n`;
        
        console.log(logMessage.trim());
        
        try {
            await this.ensureLogDirectory();
            await fs.appendFile(LOG_FILE, logMessage);
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }

    async createBackup() {
        if (this.isRunning) {
            await this.log('Backup already in progress, skipping...', 'WARN');
            return;
        }

        this.isRunning = true;
        await this.log('Starting scheduled backup...');

        try {
            const backup = new FirebaseBackup();
            const result = await backup.run();
            
            this.lastBackupTime = new Date();
            this.lastBackupResult = result;

            if (result.success) {
                await this.log(`Backup completed successfully: ${result.backupId}`, 'SUCCESS');
                await this.log(`  - Duration: ${result.duration.toFixed(2)} seconds`);
                await this.log(`  - Collections: ${result.manifest.totalCollections}`);
                await this.log(`  - Documents: ${result.manifest.totalDocuments}`);
                await this.log(`  - Size: ${(result.manifest.totalSize / 1024 / 1024).toFixed(2)} MB`);
            } else {
                await this.log(`Backup failed: ${result.error}`, 'ERROR');
            }
        } catch (error) {
            await this.log(`Backup failed with exception: ${error.message}`, 'ERROR');
            this.lastBackupResult = {
                success: false,
                error: error.message
            };
        }

        this.isRunning = false;
    }

    getStatus() {
        return {
            isRunning: this.isRunning,
            lastBackupTime: this.lastBackupTime,
            lastBackupResult: this.lastBackupResult,
            nextBackupTime: this.task ? this.task.nextDates().next().value : null,
            cronSchedule: cronSchedule
        };
    }

    start() {
        if (this.task) {
            this.log('Backup scheduler is already running', 'WARN');
            return;
        }

        // Validate cron schedule
        if (!cron.validate(cronSchedule)) {
            throw new Error(`Invalid cron schedule: ${cronSchedule}`);
        }

        this.task = cron.schedule(cronSchedule, async () => {
            await this.createBackup();
        }, {
            scheduled: true,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        });

        this.log(`Backup scheduler started with schedule: ${cronSchedule}`);
        this.log(`Next backup scheduled for: ${this.task.nextDates().next().value}`);
        
        // If daemon mode, keep the process running
        if (isDaemon) {
            this.log('Running in daemon mode - process will continue running...');
            
            // Handle graceful shutdown
            process.on('SIGINT', () => {
                this.log('Received SIGINT, shutting down gracefully...');
                this.stop();
                process.exit(0);
            });
            
            process.on('SIGTERM', () => {
                this.log('Received SIGTERM, shutting down gracefully...');
                this.stop();
                process.exit(0);
            });
        }
    }

    stop() {
        if (this.task) {
            this.task.stop();
            this.task.destroy();
            this.task = null;
            this.log('Backup scheduler stopped');
        }
    }

    async runOnce() {
        this.log('Running one-time backup...');
        await this.createBackup();
    }
}

// Main execution
if (require.main === module) {
    const scheduler = new BackupScheduler();

    // Handle different command modes
    if (args.includes('--run-once')) {
        // Run backup once and exit
        scheduler.runOnce().then(() => {
            process.exit(scheduler.lastBackupResult?.success ? 0 : 1);
        });
    } else if (args.includes('--status')) {
        // Just show status (you'd need to implement status file storage for this to work across processes)
        console.log('Status checking not implemented for standalone script');
        process.exit(0);
    } else {
        // Start the scheduler
        try {
            scheduler.start();
            
            if (!isDaemon) {
                scheduler.log('Scheduler started. Use --start-daemon to run continuously.');
                scheduler.log('Use Ctrl+C to stop.');
                
                // For non-daemon mode, show next few scheduled times
                const nextDates = scheduler.task.nextDates(5);
                scheduler.log('Next 5 scheduled backups:');
                let count = 0;
                for (const date of nextDates) {
                    scheduler.log(`  ${count + 1}. ${date}`);
                    count++;
                    if (count >= 5) break;
                }
            }
        } catch (error) {
            console.error('Failed to start backup scheduler:', error);
            process.exit(1);
        }
    }
}

module.exports = BackupScheduler;
