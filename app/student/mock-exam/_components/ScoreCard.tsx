"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type Props = {
  subject: string;
  score: number | 'absent';
  maxScore: number;
  grade: string;
};

const ScoreCard = ({ subject, score, maxScore, grade }: Props) => {
  const [ripples, setRipples] = useState<any[]>([]);

  // Grade styles function
  const getGradeStyles = (grade: string): string => {
    switch (grade) {
      case 'A':
        return 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-sm border border-emerald-400/50';
      case 'B':
        return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-sm border border-blue-400/50';
      case 'C':
        return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-sm border border-purple-400/50';
      case 'D':
        return 'bg-gradient-to-r from-yellow-500 to-amber-500 text-white shadow-sm border border-yellow-400/50';
      case 'E':
        return 'bg-gradient-to-r from-orange-500 to-red-400 text-white shadow-sm border border-orange-400/50';
      case 'F':
        return 'bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-sm border border-red-400/50';
      default:
        return 'bg-gradient-to-r from-slate-500 to-gray-500 text-white shadow-sm border border-slate-400/50';
    }
  };

  const createRipple = (event: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = event.currentTarget.getBoundingClientRect();
    const size = Math.max(width, height);
    const x = event.clientX - left - size / 2;
    const y = event.clientY - top - size / 2;
    
    // Get ripple color based on grade
    const rippleColor = grade === 'A' ? 'rgba(74, 222, 128, 0.4)' :
                      grade === 'B' ? 'rgba(52, 211, 153, 0.4)' :
                      grade === 'C' ? 'rgba(56, 189, 248, 0.4)' :
                      grade === 'D' ? 'rgba(250, 204, 21, 0.4)' :
                      grade === 'E' ? 'rgba(251, 146, 60, 0.4)' :
                      'rgba(239, 68, 68, 0.4)';

    const newRipple = { x, y, size, id: Date.now(), rippleColor };

    setRipples(prev => [...prev, newRipple]);

    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== newRipple.id));
    }, 700);
  };

  const capitalize = (s: string) => {
    if (typeof s !== 'string' || s.length === 0) return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
  };
  
  const gradeStyles = getGradeStyles(grade);

  return (
    <motion.div
      className={`
        relative overflow-hidden 
        rounded-2xl 
        bg-gradient-to-br from-white via-gray-50 to-gray-100
        dark:from-slate-800 dark:via-slate-900 dark:to-slate-950
        p-4 md:p-5 
        shadow-[inset_0_1px_0_rgba(0,0,0,0.05),0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)]
        dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_4px_6px_-1px_rgba(0,0,0,0.3),0_2px_4px_-1px_rgba(0,0,0,0.2)]
        transition-all duration-300 hover:scale-105 hover:shadow-2xl
        cursor-pointer
        border border-gray-200
        dark:border-slate-600/60
        before:absolute before:inset-0 before:rounded-2xl before:p-[2px] before:bg-gradient-to-br before:from-gray-200/50 before:via-gray-100/30 before:to-gray-300/50 before:-z-10
        dark:before:from-slate-500/30 dark:before:via-slate-400/20 dark:before:to-slate-600/30
        after:absolute after:inset-0 after:rounded-2xl after:bg-gradient-to-br after:from-white/90 after:via-gray-50/70 after:to-gray-100/90 after:-z-20 after:blur-sm
        dark:after:from-slate-900/90 dark:after:via-slate-800/70 dark:after:to-slate-900/90
        ring-1 ring-gray-300/20
        dark:ring-slate-700/20
      `}
      onClick={createRipple}
      whileTap={{ scale: 0.95 }}
    >
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-br opacity-10 dark:opacity-20 rounded-2xl"
           style={{ background: `linear-gradient(135deg, ${grade === 'A' ? 'rgba(74, 222, 128, 0.1)' : 
                                                   grade === 'B' ? 'rgba(52, 211, 153, 0.1)' :
                                                   grade === 'C' ? 'rgba(56, 189, 248, 0.1)' :
                                                   grade === 'D' ? 'rgba(250, 204, 21, 0.1)' :
                                                   grade === 'E' ? 'rgba(251, 146, 60, 0.1)' :
                                                   'rgba(239, 68, 68, 0.1)'}, transparent)` }}></div>
      
      {/* Inner highlight */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-transparent via-black/[0.01] to-black/[0.02] dark:via-white/[0.02] dark:to-white/[0.05] pointer-events-none"></div>
      
      <div className="relative z-10 flex flex-col justify-center pointer-events-none">
        <p className="text-lg md:text-xl font-bold text-gray-900 dark:text-white leading-tight mb-2">
          {capitalize(subject)}
        </p>
        <div className="flex items-baseline gap-x-2 mt-1">
          <span className={`text-2xl md:text-3xl font-extrabold ${score === 'absent' ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
            {score === 'absent' ? 'Absent' : score}
          </span>
          {score !== 'absent' && (
            <span className="text-sm md:text-base text-gray-600 dark:text-gray-400">/ {maxScore}</span>
          )}
        </div>
        {score !== 'absent' && (
          <div className="mt-3">
            <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
              <motion.div
                className={`h-2 rounded-full ${
                  grade === 'A' ? 'bg-green-400' :
                  grade === 'B' ? 'bg-emerald-400' :
                  grade === 'C' ? 'bg-sky-400' :
                  grade === 'D' ? 'bg-yellow-400' :
                  grade === 'E' ? 'bg-orange-400' :
                  'bg-red-500'
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((score / maxScore) * 100, 100)}%` }}
                transition={{ duration: 1, delay: 0.2 }}
              ></motion.div>
            </div>
          </div>
        )}
      </div>

      {/* Grade badge */}
      <div className={`absolute top-3 right-3 flex items-center justify-center px-4 py-2 rounded-lg font-bold text-lg ${gradeStyles} pointer-events-none shadow-xl border-2 border-white/50 dark:border-white/30 backdrop-blur-sm`}>
        <span>{grade}</span>
      </div>

      <AnimatePresence>
        {ripples.map(ripple => (
          <motion.span
            key={ripple.id}
            initial={{ scale: 0, opacity: 0.3 }}
            animate={{ scale: 4, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.4 }}
            className="absolute rounded-full z-20 pointer-events-none"
            style={{
              left: ripple.x,
              top: ripple.y,
              width: ripple.size,
              height: ripple.size,
              backgroundColor: ripple.rippleColor,
            }}
          />
        ))}
      </AnimatePresence>
    </motion.div>
  );
};

export default ScoreCard; 