"use client";

import React from 'react';
import StudentLayout from '../_components/StudentLayout';
import { PermissionRequestForm } from './_components/PermissionRequestForm';

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