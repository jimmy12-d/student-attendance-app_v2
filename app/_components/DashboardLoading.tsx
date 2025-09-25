import React from 'react';

const DashboardLoading = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="text-center">
        <div className="relative mx-auto w-52 h-52 mb-6">
          <div className="absolute inset-0 border-4 border-gray-200 dark:border-slate-700 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-transparent border-t-blue-500 border-r-blue-500 rounded-full animate-spin"></div>
          <div className="absolute inset-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center animate-pulse overflow-hidden">
            <img 
              src="/nemo-400x512.png" 
              alt="Nemo the cat" 
              className="w-36 h-36 object-cover rounded-full"
            />
          </div>
        </div>
        <div className="flex items-center justify-center space-x-1 mb-4">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2 animate-pulse">
          Loading Dashboard
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Preparing your admin interface...
        </p>
      </div>
    </div>
  );
};

export default DashboardLoading;