import React from 'react';

const AttendanceSummaryCardSkeleton = () => {
  return (
    <div className="relative rounded-2xl p-4 h-32 overflow-hidden bg-slate-900 animate-pulse w-full">
      <div className="absolute top-4 left-4 z-10">
        <div className="h-10 w-12 bg-slate-700 rounded"></div>
      </div>
      <div className="absolute bottom-4 left-4 z-10 flex items-center w-3/4">
        <div className="h-6 w-6 bg-slate-700 rounded-full mr-2"></div>
        <div className="h-6 w-1/2 bg-slate-700 rounded"></div>
      </div>
      <div
        className="absolute bottom-0 left-0 w-full bg-slate-700"
        style={{
          height: `30%`,
        }}
      ></div>
    </div>
  );
};

export default AttendanceSummaryCardSkeleton; 