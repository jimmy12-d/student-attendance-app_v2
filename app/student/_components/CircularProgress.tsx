"use client";

import React, { useState, useEffect } from 'react';

type Props = {
  percentage: number;
};

const CircularProgress = ({ percentage }: Props) => {
  const [animatedPercentage, setAnimatedPercentage] = useState(0);

  useEffect(() => {
    // Reset animation immediately if percentage changes, to prepare for new animation
    setAnimatedPercentage(0);

    const timeoutId = setTimeout(() => {
      setAnimatedPercentage(percentage);
    }, 150); // A slightly longer delay to ensure a clean reset

    // Cleanup function to cancel the timeout if the component re-renders
    // or the 'percentage' dependency changes before the timeout completes.
    return () => clearTimeout(timeoutId);
  }, [percentage]);

  const radius = 50;
  const strokeWidth = 10;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  // Use the animated percentage for calculation
  const clampedPercentage = Math.max(0, Math.min(100, animatedPercentage));
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
          style={{ strokeDashoffset }}
          className="transition-[stroke-dashoffset] duration-1000 ease-out"
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