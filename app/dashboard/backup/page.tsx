"use client";

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
import React, { useState, useEffect } from "react";
import { toast } from 'sonner';
import {
    mdiCloudUpload as mdiBackup,
    mdiDelete,
    mdiRestore,
    mdiRefresh,
    mdiDatabase,
    mdiClockOutline,
    mdiFileDocument,
    mdiHarddisk as mdiHardDisk,
    mdiAlertCircle,
    mdiCheckCircle,
    mdiLoading
} from "@mdi/js";

import SectionMain from "../../_components/Section/Main";
import SectionTitleLineWithButton from "../../_components/Section/TitleLineWithButton";
import CardBox from "../../_components/CardBox";
import Button from "../../_components/Button";
import Icon from "../../_components/Icon";
import LoadingSpinner from "../../_components/LoadingSpinner";
import NotificationBar from "../../_components/NotificationBar";
import CardBoxModal from "../../_components/CardBox/Modal";

interface BackupManifest {
    backupId: string;
    timestamp: string;
    projectId: string;
    totalCollections: number;
    totalDocuments: number;
    totalSize: number;
    actualSize?: number;
    fileCount?: number;
    collections: Array<{
        collection: string;
        documentCount: number;
        filePath: string;
        size: number;
    }>;
    compressed: boolean;
    version: string;
    status?: string;
    error?: string;
}

const BackupManagementPage = () => {
    const [backups, setBackups] = useState<BackupManifest[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreatingBackup, setIsCreatingBackup] = useState(false);
    const [selectedBackup, setSelectedBackup] = useState<BackupManifest | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showRestoreModal, setShowRestoreModal] = useState(false);
    const [restoreOptions, setRestoreOptions] = useState({
        collections: [] as string[],
        dryRun: true
    });

    const fetchBackups = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/admin/backup?action=list');
            const data = await response.json();
            
            if (data.success) {
                setBackups(data.backups);
            } else {
                throw new Error(data.error || 'Failed to fetch backups');
            }
        } catch (error) {
            console.error('Error fetching backups:', error);
            toast.error('Failed to fetch backups');
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchBackups();
    }, []);

    const handleCreateBackup = async () => {
        setIsCreatingBackup(true);
        try {
            const response = await fetch('/api/admin/backup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'create',
                    compress: true
                })
            });

            const data = await response.json();
            
            if (data.success) {
                toast.success(`Backup created successfully: ${data.backupId}`);
                await fetchBackups(); // Refresh the list
            } else {
                throw new Error(data.error || 'Failed to create backup');
            }
        } catch (error) {
            console.error('Error creating backup:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to create backup');
        }
        setIsCreatingBackup(false);
    };

    const handleDeleteBackup = async () => {
        if (!selectedBackup) return;
        
        try {
            const response = await fetch('/api/admin/backup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'delete',
                    backupId: selectedBackup.backupId
                })
            });

            const data = await response.json();
            
            if (data.success) {
                toast.success('Backup deleted successfully');
                await fetchBackups(); // Refresh the list
                setShowDeleteModal(false);
                setSelectedBackup(null);
            } else {
                throw new Error(data.error || 'Failed to delete backup');
            }
        } catch (error) {
            console.error('Error deleting backup:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to delete backup');
        }
    };

    const handleRestoreBackup = async () => {
        if (!selectedBackup) return;
        
        try {
            const response = await fetch('/api/admin/backup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'restore',
                    backupId: selectedBackup.backupId,
                    collections: restoreOptions.collections.length > 0 ? restoreOptions.collections : undefined,
                    dryRun: restoreOptions.dryRun
                })
            });

            const data = await response.json();
            
            if (data.success) {
                const message = data.dryRun 
                    ? `Restore simulation completed: ${data.totalDocuments} documents would be restored`
                    : `Restore completed successfully: ${data.totalDocuments} documents restored`;
                toast.success(message);
                setShowRestoreModal(false);
                setSelectedBackup(null);
            } else {
                throw new Error(data.error || 'Failed to restore backup');
            }
        } catch (error) {
            console.error('Error restoring backup:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to restore backup');
        }
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDate = (timestamp: string): string => {
        return new Date(timestamp).toLocaleString();
    };

    const getBackupStatus = (backup: BackupManifest) => {
        if (backup.error || backup.status === 'corrupted') {
            return { color: 'danger', icon: mdiAlertCircle, text: 'Corrupted' };
        }
        return { color: 'success', icon: mdiCheckCircle, text: 'Healthy' };
    };

    return (
        <SectionMain>
            <SectionTitleLineWithButton 
                icon={mdiBackup} 
                title="Database Backup Management" 
                main
            >
                <div className="flex gap-2">
                    <Button
                        color="info"
                        icon={mdiRefresh}
                        label="Refresh"
                        onClick={fetchBackups}
                        disabled={loading || isCreatingBackup}
                    />
                    <Button
                        color="success"
                        icon={mdiBackup}
                        label={isCreatingBackup ? "Creating..." : "Create Backup"}
                        onClick={handleCreateBackup}
                        disabled={loading || isCreatingBackup}
                    />
                </div>
            </SectionTitleLineWithButton>

            {/* Backup Instructions */}
            <CardBox className="mb-6">
                <div className="p-4">
                    <h3 className="text-lg font-semibold mb-3 flex items-center">
                        <Icon path={mdiDatabase} className="mr-2" />
                        Database Backup System
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                            <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Automatic Backups</h4>
                            <p className="text-blue-700 dark:text-blue-300">
                                Backups are created automatically daily at 12 AM (midnight). Manual backups can be created anytime.
                            </p>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                            <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">Data Protection</h4>
                            <p className="text-green-700 dark:text-green-300">
                                All student data, transactions, and configurations are backed up with full integrity checks.
                            </p>
                        </div>
                        <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                            <h4 className="font-medium text-purple-800 dark:text-purple-200 mb-2">Retention Policy</h4>
                            <p className="text-purple-700 dark:text-purple-300">
                                Last 15 backups are kept. Older backups are automatically cleaned up.
                            </p>
                        </div>
                    </div>
                </div>
            </CardBox>

            {/* Backup List */}
            <CardBox>
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Available Backups</h3>
                        {isCreatingBackup && (
                            <div className="flex items-center text-blue-600">
                                <Icon path={mdiLoading} className="animate-spin mr-2" />
                                <span className="text-sm">Creating backup...</span>
                            </div>
                        )}
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-8">
                            <LoadingSpinner />
                        </div>
                    ) : backups.length === 0 ? (
                        <div className="text-center py-8">
                            <Icon path={mdiBackup} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" size={3} />
                            <p className="text-gray-500 text-lg">No backups found</p>
                            <p className="text-sm text-gray-400 mt-2">Create your first backup to get started</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {backups.map((backup) => {
                                const status = getBackupStatus(backup);
                                return (
                                    <div
                                        key={backup.backupId}
                                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <h4 className="font-medium text-gray-900 dark:text-gray-100">
                                                        {backup.backupId}
                                                    </h4>
                                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                                                        ${status.color === 'success' 
                                                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                                        }`}>
                                                        <Icon path={status.icon} className="mr-1" size="12px" />
                                                        {status.text}
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 dark:text-gray-400">
                                                    <div className="flex items-center">
                                                        <Icon path={mdiClockOutline} className="mr-1" size="14px" />
                                                        {formatDate(backup.timestamp)}
                                                    </div>
                                                    <div className="flex items-center">
                                                        <Icon path={mdiDatabase} className="mr-1" size="14px" />
                                                        {backup.totalCollections} collections
                                                    </div>
                                                    <div className="flex items-center">
                                                        <Icon path={mdiFileDocument} className="mr-1" size="14px" />
                                                        {backup.totalDocuments?.toLocaleString()} documents
                                                    </div>
                                                    <div className="flex items-center">
                                                        <Icon path={mdiHardDisk} className="mr-1" size="14px" />
                                                        {formatFileSize(backup.actualSize || backup.totalSize)}
                                                    </div>
                                                </div>
                                                {backup.error && (
                                                    <div className="mt-2">
                                                        <NotificationBar color="danger" icon={mdiAlertCircle}>
                                                            {backup.error}
                                                        </NotificationBar>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 ml-4">
                                                <Button
                                                    color="info"
                                                    icon={mdiRestore}
                                                    label="Restore"
                                                    small
                                                    onClick={() => {
                                                        setSelectedBackup(backup);
                                                        setRestoreOptions({
                                                            collections: [],
                                                            dryRun: true
                                                        });
                                                        setShowRestoreModal(true);
                                                    }}
                                                    disabled={backup.status === 'corrupted'}
                                                />
                                                <Button
                                                    color="danger"
                                                    icon={mdiDelete}
                                                    label="Delete"
                                                    small
                                                    onClick={() => {
                                                        setSelectedBackup(backup);
                                                        setShowDeleteModal(true);
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </CardBox>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && selectedBackup && (
                <CardBoxModal
                    title="Confirm Backup Deletion"
                    isActive={true}
                    onConfirm={handleDeleteBackup}
                    onCancel={() => {
                        setShowDeleteModal(false);
                        setSelectedBackup(null);
                    }}
                    buttonLabel="Delete Backup"
                    buttonColor="danger"
                >
                    <div className="space-y-4">
                        <NotificationBar color="danger" icon={mdiAlertCircle}>
                            This action cannot be undone. The backup will be permanently deleted.
                        </NotificationBar>
                        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                            <h4 className="font-medium mb-2">Backup Details:</h4>
                            <div className="text-sm space-y-1">
                                <p><strong>ID:</strong> {selectedBackup.backupId}</p>
                                <p><strong>Created:</strong> {formatDate(selectedBackup.timestamp)}</p>
                                <p><strong>Collections:</strong> {selectedBackup.totalCollections}</p>
                                <p><strong>Documents:</strong> {selectedBackup.totalDocuments?.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                </CardBoxModal>
            )}

            {/* Restore Modal */}
            {showRestoreModal && selectedBackup && (
                <CardBoxModal
                    title="Restore Database Backup"
                    isActive={true}
                    onConfirm={handleRestoreBackup}
                    onCancel={() => {
                        setShowRestoreModal(false);
                        setSelectedBackup(null);
                    }}
                    buttonLabel={restoreOptions.dryRun ? "Simulate Restore" : "Restore Database"}
                    buttonColor={restoreOptions.dryRun ? "info" : "warning"}
                >
                    <div className="space-y-6">
                        {!restoreOptions.dryRun && (
                            <NotificationBar color="warning" icon={mdiAlertCircle}>
                                <strong>Warning:</strong> This will overwrite existing data in your database. 
                                Consider running a simulation first.
                            </NotificationBar>
                        )}
                        
                        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                            <h4 className="font-medium mb-2">Backup Details:</h4>
                            <div className="text-sm space-y-1">
                                <p><strong>ID:</strong> {selectedBackup.backupId}</p>
                                <p><strong>Created:</strong> {formatDate(selectedBackup.timestamp)}</p>
                                <p><strong>Collections:</strong> {selectedBackup.totalCollections}</p>
                                <p><strong>Documents:</strong> {selectedBackup.totalDocuments?.toLocaleString()}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        checked={restoreOptions.dryRun}
                                        onChange={(e) => setRestoreOptions(prev => ({ ...prev, dryRun: e.target.checked }))}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm font-medium">Dry Run (Simulation Only)</span>
                                </label>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    Recommended: Test the restore process without making any changes
                                </p>
                            </div>

                            <div>
                                <h5 className="font-medium mb-2">Available Collections:</h5>
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {selectedBackup.collections?.map((collection) => (
                                        <label key={collection.collection} className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                checked={restoreOptions.collections.includes(collection.collection)}
                                                onChange={(e) => {
                                                    setRestoreOptions(prev => ({
                                                        ...prev,
                                                        collections: e.target.checked
                                                            ? [...prev.collections, collection.collection]
                                                            : prev.collections.filter(c => c !== collection.collection)
                                                    }));
                                                }}
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-sm">
                                                {collection.collection} ({collection.documentCount} documents)
                                            </span>
                                        </label>
                                    ))}
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                                    Leave empty to restore all collections
                                </p>
                            </div>
                        </div>
                    </div>
                </CardBoxModal>
            )}
        </SectionMain>
    );
};

export default BackupManagementPage;
