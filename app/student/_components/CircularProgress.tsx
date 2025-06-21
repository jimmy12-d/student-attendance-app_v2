"use client";

import React from 'react';

type Props = {
  percentage: number;
};

const CircularProgress = ({ percentage }: Props) => {
  const radius = 50;
  const strokeWidth = 10;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  // Clamp percentage between 0 and 100 to prevent visual bugs
  const clampedPercentage = Math.max(0, Math.min(100, percentage));
  const strokeDashoffset = circumference - (clampedPercentage / 100) * circumference;

  return (
    <div className="relative w-40 h-40 sm:w-44 sm:h-44">
      <svg
        height="100%"
        width="100%"
        viewBox="0 0 120 120"
        className="-rotate-90"
      >
        {/* Background Circle */}
        <circle
          stroke="#334155" // slate-700
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
    </div>
  );
};

export default CircularProgress; 