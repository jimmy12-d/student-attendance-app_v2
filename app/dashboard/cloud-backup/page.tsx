'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../../../firebase-config';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '../../_contexts/AuthContext';
import { toast } from 'sonner';
import {
    mdiCloudUpload,
    mdiDatabase,
    mdiClockOutline,
    mdiCheckCircle,
    mdiAlertCircle,
    mdiRefresh
} from "@mdi/js";

import SectionMain from "../../_components/Section/Main";
import SectionTitleLineWithButton from "../../_components/Section/TitleLineWithButton";
import CardBox from "../../_components/CardBox";
import Button from "../../_components/Button";
import Icon from "../../_components/Icon";
import LoadingSpinner from "../../_components/LoadingSpinner";

interface BackupRecord {
  backupId: string;
  timestamp: any;
  status: 'completed' | 'failed' | 'running';
  totalCollections?: number;
  totalDocuments?: number;
  totalSize?: number;
  duration?: number;
  backupType: string;
  error?: string;
  storagePath?: string;
}

export default function CloudBackupPage() {
  const { isAuthorizedAdmin, isLoading: isAuthLoading } = useAuthContext();
  const router = useRouter();
  const [backupHistory, setBackupHistory] = useState<BackupRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);

  useEffect(() => {
    if (!isAuthLoading) {
      checkUserPermissions();
      if (isAuthorizedAdmin) {
        loadBackupHistory();
      }
    }
  }, [isAuthorizedAdmin, isAuthLoading]);

  const checkUserPermissions = () => {
    if (!isAuthorizedAdmin) {
      router.push('/dashboard');
      return;
    }
  };

  const loadBackupHistory = async () => {
    try {
      const backupHistoryRef = collection(db, 'backupHistory');
      const q = query(backupHistoryRef, orderBy('timestamp', 'desc'), limit(20));
      const snapshot = await getDocs(q);
      
      const backups: BackupRecord[] = [];
      snapshot.forEach(doc => {
        backups.push({ ...doc.data() } as BackupRecord);
      });
      
      setBackupHistory(backups);
    } catch (error) {
      console.error('Error loading backup history:', error);
    } finally {
      setLoading(false);
    }
  };

  const createManualBackup = async () => {
    if (isCreatingBackup) return;
    
    setIsCreatingBackup(true);
    toast.info('Creating backup...');
    
    try {
      const functions = getFunctions();
      const manualBackup = httpsCallable(functions, 'manualBackup');
      
      const result = await manualBackup();
      console.log('Backup created:', result.data);
      
      toast.success('Backup created successfully!');
      
      // Reload backup history after a short delay
      setTimeout(() => {
        loadBackupHistory();
      }, 2000);
      
    } catch (error: any) {
      console.error('Error creating backup:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(2)} MB`;
  };

  const formatDuration = (ms: number) => {
    const seconds = ms / 1000;
    return `${seconds.toFixed(1)} seconds`;
  };

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    
    let date;
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else if (timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else {
      date = new Date(timestamp);
    }
    
    return date.toLocaleString();
  };

  if (isAuthLoading || loading) {
    return <LoadingSpinner />;
  }

  return (
    <SectionMain>
      <SectionTitleLineWithButton 
        icon={mdiDatabase} 
        title="Cloud Backup Management"
        main
      >
        <Button
          onClick={createManualBackup}
          color="info"
          icon={mdiCloudUpload}
          disabled={isCreatingBackup}
          label={isCreatingBackup ? 'Creating...' : 'Create Manual Backup'}
        />
      </SectionTitleLineWithButton>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <CardBox className="bg-blue-50 dark:bg-blue-900/20">
          <div className="p-4">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">Total Backups</h3>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{backupHistory.length}</p>
          </div>
        </CardBox>
        
        <CardBox className="bg-green-50 dark:bg-green-900/20">
          <div className="p-4">
            <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-2">Successful Backups</h3>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {backupHistory.filter(b => b.status === 'completed').length}
            </p>
          </div>
        </CardBox>
        
        <CardBox className="bg-yellow-50 dark:bg-yellow-900/20">
          <div className="p-4">
            <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100 mb-2">Last Backup</h3>
            <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
              {backupHistory.length > 0 
                ? formatTimestamp(backupHistory[0].timestamp)
                : 'No backups yet'
              }
            </p>
          </div>
        </CardBox>
      </div>

      <CardBox className="mb-6">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Automated daily backups run at midnight UTC. No laptop required!
          </h2>
          
          {backupHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Icon path={mdiDatabase} size="3rem" className="mx-auto mb-4 opacity-50" />
              <p>No backups found. Create your first backup using the button above.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Backup ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Collections
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Documents
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Size
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Type
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {backupHistory.map((backup) => (
                    <tr key={backup.backupId} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-gray-100">
                        {backup.backupId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {formatTimestamp(backup.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Icon 
                            path={backup.status === 'completed' ? mdiCheckCircle : mdiAlertCircle}
                            size="1rem"
                            className={`mr-2 ${
                              backup.status === 'completed' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                            }`}
                          />
                          <span className={`text-sm font-medium ${
                            backup.status === 'completed' ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
                          }`}>
                            {backup.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {backup.totalCollections || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {backup.totalDocuments || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {backup.totalSize ? formatFileSize(backup.totalSize) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {backup.duration ? formatDuration(backup.duration) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                          backup.backupType === 'scheduled_cloud_function'
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                            : 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200'
                        }`}>
                          {backup.backupType === 'scheduled_cloud_function' ? 'Scheduled' : 'Manual'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </CardBox>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CardBox>
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-4 flex items-center">
              <Icon path={mdiClockOutline} size="1.2rem" className="mr-2 text-blue-600 dark:text-blue-400" />
              Automatic Backups
            </h3>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <li>• Run daily at midnight UTC</li>
              <li>• Backup all Firestore collections</li>
              <li>• Store in Google Cloud Storage</li>
              <li>• Automatic cleanup (keep 30 days)</li>
              <li>• No laptop required - runs in the cloud</li>
            </ul>
          </div>
        </CardBox>
        
        <CardBox>
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-4 flex items-center">
              <Icon path={mdiCloudUpload} size="1.2rem" className="mr-2 text-purple-600 dark:text-purple-400" />
              Manual Backups
            </h3>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <li>• Create on-demand backups</li>
              <li>• Same cloud storage location</li>
              <li>• Available to admin users only</li>
              <li>• Useful before major changes</li>
              <li>• Instant availability</li>
            </ul>
          </div>
        </CardBox>
      </div>
    </SectionMain>
  );
}