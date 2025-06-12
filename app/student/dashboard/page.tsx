"use client";

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { PermissionRequestForm } from './_components/PermissionRequestForm';
import { useAppSelector } from '../../_stores/hooks';
import Button from '../../_components/Button';
import { mdiQrcode, mdiFileDocumentPlusOutline } from '@mdi/js';
import CardBoxModal from '../../_components/CardBox/Modal';
import StudentQRCode from '../../dashboard/students/StudentQRCode';

// Dynamically import StudentLayout and disable server-side rendering
const StudentLayout = dynamic(
  () => import('../_components/StudentLayout'),
  { 
    ssr: false,
    // You can provide a loading component to show while the layout is loading
    loading: () => (
        <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-slate-900">
            <p className="text-lg dark:text-white">Loading Student Portal...</p>
        </div>
    )
  }
);

const StudentDashboard = () => {
  const [isQrModalActive, setIsQrModalActive] = useState(false);
  const [isPermissionModalActive, setIsPermissionModalActive] = useState(false);
  const studentDocId = useAppSelector((state) => state.main.studentDocId);
  const studentName = useAppSelector((state) => state.main.userName);

  const handlePermissionSuccess = () => {
    setIsPermissionModalActive(false);
  };

  return (
    <StudentLayout>
      {(userName) => (
        <>
          <CardBoxModal
            title="Your Personal QR Code"
            buttonColor="info"
            buttonLabel="Done"
            isActive={isQrModalActive}
            onConfirm={() => setIsQrModalActive(false)}
          >
            {studentDocId && studentName && (
              <div className="flex flex-col items-center justify-center w-full">
                <p className="mb-4 text-center">Scan this code for attendance.</p>
                <StudentQRCode
                  studentName={studentName}
                  qrSize={200}
                />
              </div>
            )}
          </CardBoxModal>
          
          <CardBoxModal
            title="Request Permission for Absence"
            isActive={isPermissionModalActive}
            onCancel={() => setIsPermissionModalActive(false)}
          >
            <PermissionRequestForm onSuccess={handlePermissionSuccess} />
          </CardBoxModal>
        
          <div className="p-4">
            <div className="flex justify-between items-center mb-2">
              <h1 className="text-3xl font-bold">Student Dashboard</h1>
            </div>
            <p className="mb-8 text-lg text-gray-600 dark:text-gray-400">Welcome, <span className="font-semibold text-gray-800 dark:text-white">{userName}</span>!</p>
            
            <div className="flex flex-col items-center space-y-4 my-8">
              <Button
                color="glowing-purple"
                label="Show My QR"
                icon={mdiQrcode}
                onClick={() => setIsQrModalActive(true)}
              />
              <Button
                color="glowing-red"
                label="Request Absence"
                icon={mdiFileDocumentPlusOutline}
                onClick={() => setIsPermissionModalActive(true)}
              />
            </div>

          </div>
        </>
      )}
    </StudentLayout>
  );
};

export default StudentDashboard;