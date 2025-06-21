"use client";

import React from 'react';

type Props = {
  percentage: number;
  totalScore: number;
  grade: string;
};

const CircularProgress = ({ percentage, totalScore, grade }: Props) => {
  const radius = 50;
  const strokeWidth = 10;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center p-6 bg-slate-900 rounded-2xl">
      <div className="relative w-40 h-40">
        <svg
          height="100%"
          width="100%"
          viewBox="0 0 120 120"
          className="-rotate-90"
        >
          {/* Background Circle */}
          <circle
            stroke="#374151" // slate-700
            fill="transparent"
            strokeWidth={strokeWidth}
            r={radius}
            cx="60"
            cy="60"
          />
          {/* Progress Circle */}
          <circle
            stroke="#8B5CF6" // purple-500
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference + ' ' + circumference}
            style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.5s ease-out' }}
            r={radius}
            cx="60"
            cy="60"
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold text-white">{totalScore}</span>
          <span className="text-lg text-gray-400">Total Score</span>
        </div>
      </div>
      <div className="mt-4 text-center">
        <span className="text-2xl font-bold text-purple-400">Grade: {grade}</span>
      </div>
    </div>
  );
};

export default CircularProgress; 