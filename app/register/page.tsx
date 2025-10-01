"use client";

import React from 'react';
import StudentRegistrationForm from './_components/StudentRegistrationForm';

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <img 
              src="/icon-512x512.png" 
              alt="Rodwell Learning Center Logo" 
              className="w-24 h-24 md:w-32 md:h-32 mx-auto mb-4"
            />
            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white leading-tight">
              <span className="text-gray-700 dark:text-gray-300 font-medium">Registration Form for</span><br />
              <span className="text-purple-600 dark:text-purple-400 font-extrabold">Rodwell Learning Center</span>
            </h2>
          </div>
          
          <StudentRegistrationForm />
        </div>
      </div>
    </div>
  );
}