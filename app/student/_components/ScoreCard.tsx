"use client";

import React from 'react';

type Props = {
  subject: string;
  score: number;
  maxScore: number;
  grade: string;
};

const ScoreCard = ({ subject, score, maxScore, grade }: Props) => {
  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'text-green-400';
      case 'B': return 'text-emerald-400';
      case 'C': return 'text-sky-400';
      case 'D': return 'text-yellow-400';
      case 'E': return 'text-orange-400';
      default: return 'text-red-500';
    }
  };

  const capitalize = (s: string) => {
    if (typeof s !== 'string' || s.length === 0) return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  return (
    <div className="bg-slate-900 p-4 rounded-lg flex items-center justify-between">
      <div>
        <p className="text-lg font-bold text-white">{capitalize(subject)}</p>
        <p className="text-sm text-gray-400">Score: {score} / {maxScore}</p>
      </div>
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-slate-800 border-2 border-slate-700">
        <span className={`text-3xl font-bold ${getGradeColor(grade)}`}>
          {grade}
        </span>
      </div>
    </div>
  );
};

export default ScoreCard; 