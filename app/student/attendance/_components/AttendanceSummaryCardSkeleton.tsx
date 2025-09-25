import React from 'react';

const AttendanceSummaryCardSkeleton = () => {
  return (
    <div className="relative rounded-xl p-4 h-32 overflow-hidden bg-white dark:bg-slate-800 shadow-lg border border-gray-100 dark:border-slate-700 animate-pulse w-full">
      <div className="absolute top-4 left-4 z-10">
        <div className="h-10 w-12 bg-gray-200 dark:bg-slate-700 rounded"></div>
      </div>
      <div className="absolute bottom-4 left-4 z-10 flex items-center w-3/4">
        <div className="h-6 w-6 bg-gray-200 dark:bg-slate-700 rounded-full mr-2"></div>
        <div className="h-6 w-1/2 bg-gray-200 dark:bg-slate-700 rounded"></div>
      </div>
      <div
        className="absolute bottom-0 left-0 w-full bg-gray-200 dark:bg-slate-700"
        style={{
          height: `30%`,
        }}
      ></div>
    </div>
  );
};

export default AttendanceSummaryCardSkeleton; 