// app/dashboard/import-students/page.tsx
"use client";

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import React, { useState } from 'react';
import { getFunctions, httpsCallable } from "firebase/functions";
import { app as firebaseApp } from "../../../firebase-config";
import SectionMain from '../../_components/Section/Main';
import CardBox from '../../_components/CardBox';
import Button from '../../_components/Button';
import NotificationBar from '../../_components/NotificationBar';
import { mdiCloudUploadOutline } from '@mdi/js';

const ImportStudentsPage = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'danger' } | null>(null);

    const handleImportClick = async () => {
        if (!confirm("This will import new students from your Google Sheet. It will skip any students whose phone numbers already exist. Continue?")) {
            return;
        }

        setIsLoading(true);
        setFeedback(null);

        try {
            const functions = getFunctions(firebaseApp, "asia-southeast1");
            const importStudents = httpsCallable(functions, 'importStudentsFromSheet');
            const result: any = await importStudents();
            setFeedback({ message: result.data.message, type: 'success' });
        } catch (err: any) {
            console.error(err);
            setFeedback({ message: err.message || "An unknown error occurred.", type: 'danger' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SectionMain>
            <h1 className="text-3xl font-bold mb-6">Import Students from Google Sheet</h1>
            <CardBox>
                <div className="space-y-4">
                    <p>
                        Clicking the button below will read your configured Google Sheet and add any new students to the database.
                    </p>
                    <p className="text-sm text-gray-500">
                        This process automatically checks for duplicate phone numbers and will only add students that are not already in the system. Make sure your Google Sheet is up-to-date.
                    </p>
                </div>
                <div className="mt-6">
                    <Button
                        label={isLoading ? "Importing..." : "Start Import"}
                        color="info"
                        icon={mdiCloudUploadOutline}
                        onClick={handleImportClick}
                        disabled={isLoading}
                    />
                </div>
                
                {feedback && (
                   <div className="mt-6">
                     <NotificationBar color={feedback.type}>
                        {feedback.message}
                     </NotificationBar>
                   </div>
                )}
            </CardBox>
        </SectionMain>
    );
};

export default ImportStudentsPage;
