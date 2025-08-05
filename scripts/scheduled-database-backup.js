#!/usr/bin/env node

/**
 * Scheduled Database Backup
 * Runs automatic database backups at midnight
 * Only backs up Firebase data, not code
 */

const cron = require('node-cron');
const DatabaseBackup = require('./database-backup');
const fs = require('fs').promises;
const path = require('path');

const LOG_FILE = path.join(process.cwd(), 'logs', 'database-backup.log');
const CRON_SCHEDULE = '0 0 * * *'; // Daily at midnight

class ScheduledDatabaseBackup {
    constructor() {
        this.isRunning = false;
        this.lastBackup = null;
    }

    async log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${level}] ${message}\n`;
        
        console.log(logMessage.trim());
        
        try {
            await fs.mkdir(path.dirname(LOG_FILE), { recursive: true });
            await fs.appendFile(LOG_FILE, logMessage);
        } catch (error) {
            console.error('Failed to write log:', error);
        }
    }

    async runBackup() {
        if (this.isRunning) {
            await this.log('Backup already in progress, skipping...', 'WARN');
            return;
        }

        this.isRunning = true;
        await this.log('Starting scheduled database backup...');

        try {
            const backup = new DatabaseBackup();
            const result = await backup.run();
            
            this.lastBackup = {
                timestamp: new Date(),
                success: result.success,
                summary: result.summary
            };

            if (result.success) {
                await this.log(`Database backup completed: ${result.summary.backupId}`, 'SUCCESS');
                await this.log(`  - Collections: ${result.summary.totalCollections}`);
                await this.log(`  - Documents: ${result.summary.totalDocuments}`);
                await this.log(`  - Duration: ${result.summary.duration.toFixed(2)}s`);
            } else {
                await this.log(`Database backup failed: ${result.error}`, 'ERROR');
            }
        } catch (error) {
            await this.log(`Database backup failed: ${error.message}`, 'ERROR');
            this.lastBackup = {
                timestamp: new Date(),
                success: false,
                error: error.message
            };
        }

        this.isRunning = false;
    }

    start() {
        this.log(`Starting database backup scheduler (daily at midnight)`);
        
        this.task = cron.schedule(CRON_SCHEDULE, async () => {
            await this.runBackup();
        });

        // Handle graceful shutdown
        process.on('SIGINT', () => {
            this.log('Received SIGINT, shutting down...');
            if (this.task) this.task.stop();
            process.exit(0);
        });

        this.log('Database backup scheduler started. Press Ctrl+C to stop.');
    }

    async runOnce() {
        await this.log('Running one-time database backup...');
        await this.runBackup();
    }
}

// Command line usage
if (require.main === module) {
    const scheduler = new ScheduledDatabaseBackup();
    
    if (process.argv.includes('--once')) {
        scheduler.runOnce().then(() => process.exit(0));
    } else {
        scheduler.start();
    }
}

module.exports = ScheduledDatabaseBackup;
