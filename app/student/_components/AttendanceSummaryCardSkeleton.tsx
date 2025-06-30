import React from 'react';

const AttendanceSummaryCardSkeleton = () => {
  return (
    <div className="relative rounded-2xl p-4 h-40 overflow-hidden bg-gray-200 animate-pulse">
      <div className="relative z-10">
        <div className="h-10 w-1/4 bg-gray-300 rounded"></div>
      </div>
      <div className="absolute bottom-4 left-4 z-10 flex items-center w-3/4">
        <div className="h-6 w-1/4 bg-gray-300 rounded"></div>
      </div>
    </div>
  );
};

export default AttendanceSummaryCardSkeleton; 