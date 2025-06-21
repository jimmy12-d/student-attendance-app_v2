import React, { useState, useEffect } from "react";

const statusConfig = {
  "No Registered": {
    percent: 0,
    message: "Not registered yet!",
    color: "text-red-500",
    bar: "bg-red-500",
  },
  "Registered": {
    percent: 50,
    message: "Registered for Mock Exam",
    color: "text-blue-400",
    bar: "bg-blue-600",
  },
  "Paid Star": {
    percent: 100,
    message: "Star has been Paid! Good Luck on the Exam.",
    color: "text-green-500",
    bar: "bg-green-500",
  },
};

export default function ProgressBar({ status, loading }: { status: string, loading: boolean }) {
  const [visualPercent, setVisualPercent] = useState(0);
  const cfg = statusConfig[status] || statusConfig["No Registered"];

  useEffect(() => {
    if (!loading) {
      // Use a short timeout to ensure the CSS transition is applied
      const timer = setTimeout(() => {
        setVisualPercent(cfg.percent);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [loading, cfg.percent]);

  if (loading) {
    return (
      <div className="bg-slate-900 rounded-2xl px-6 pt-4 pb-6 max-w-2xl mx-auto my-6 animate-pulse">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Mock Exam 3</h2>
          <span className="text-sm text-gray-400 font-semibold">Your progress</span>
        </div>
        <div className="mb-4">
          <div className="h-8 w-3/4 bg-slate-700 rounded"></div>
        </div>
        <div className="relative h-2 bg-slate-700 rounded-full">
          {/* Pulsing background bar */}
        </div>
      </div>
    );
  }
  
  const stepIndex = Object.keys(statusConfig).indexOf(status);

  return (
    <div className="bg-slate-900 rounded-2xl px-6 pt-4 pb-6 max-w-2xl mx-auto my-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white">Mock Exam 3</h2>
        <span className="text-sm text-gray-400 font-semibold">Your progress</span>
      </div>

      <div className="mb-4">
        <span className={`text-2xl font-bold ${cfg.color}`}>{cfg.message}</span>
      </div>

      <div className="relative h-2 bg-slate-700 rounded-full">
        {/* Progress bar fill */}
        <div
          className={`absolute top-0 left-0 h-2 rounded-full transition-all duration-700 ease-out ${cfg.bar}`}
          style={{ width: `${visualPercent}%` }}
        />
        {/* Step dots with tooltips */}
        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-between">
          {Object.keys(statusConfig).map((key, idx) => (
            <div key={key} className="relative flex justify-center group">
              <div className={`w-4 h-4 rounded-full transition-colors duration-500 ${
                idx <= stepIndex ? cfg.bar : 'bg-slate-600'
              }`} />
              <div className="absolute bottom-full mb-2 w-max px-3 py-1.5 bg-gray-800 text-white text-xs font-semibold rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-300 pointer-events-none">
                {`${idx + 1}. ${key}`}
                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-800"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 