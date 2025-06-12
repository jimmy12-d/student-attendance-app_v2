"use client";

import React from 'react';
import dynamic from 'next/dynamic';
import { PermissionRequestForm } from './_components/PermissionRequestForm';

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
  return (
    <StudentLayout>
      {(userName) => (
        <div className="p-4">
          <h1 className="text-3xl font-bold mb-2">Student Dashboard</h1>
          <p className="mb-8 text-lg text-gray-600 dark:text-gray-400">Welcome, <span className="font-semibold text-gray-800 dark:text-white">{userName}</span>!</p>
          <PermissionRequestForm />
        </div>
      )}
    </StudentLayout>
  );
};

export default StudentDashboard;