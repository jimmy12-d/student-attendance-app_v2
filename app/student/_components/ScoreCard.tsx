"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type Props = {
  subject: string;
  score: number;
  maxScore: number;
  grade: string;
};

const ScoreCard = ({ subject, score, maxScore, grade }: Props) => {
  const [ripples, setRipples] = useState<any[]>([]);

  const getGradeStyles = (grade: string) => {
    switch (grade) {
      case 'A': return { textColor: 'text-green-400', borderColor: 'border-green-400', rippleColor: 'rgba(74, 222, 128, 0.4)' };
      case 'B': return { textColor: 'text-emerald-400', borderColor: 'border-emerald-400', rippleColor: 'rgba(52, 211, 153, 0.4)' };
      case 'C': return { textColor: 'text-sky-400', borderColor: 'border-sky-400', rippleColor: 'rgba(56, 189, 248, 0.4)' };
      case 'D': return { textColor: 'text-yellow-400', borderColor: 'border-yellow-400', rippleColor: 'rgba(250, 204, 21, 0.4)' };
      case 'E': return { textColor: 'text-orange-400', borderColor: 'border-orange-400', rippleColor: 'rgba(251, 146, 60, 0.4)' };
      default: return { textColor: 'text-red-500', borderColor: 'border-red-500', rippleColor: 'rgba(239, 68, 68, 0.4)' };
    }
  };

  const createRipple = (event: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = event.currentTarget.getBoundingClientRect();
    const size = Math.max(width, height);
    const x = event.clientX - left - size / 2;
    const y = event.clientY - top - size / 2;
    const { rippleColor } = getGradeStyles(grade);

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
  
  const { textColor, borderColor } = getGradeStyles(grade);

  return (
    <motion.div
      className={`relative overflow-hidden bg-slate-900 px-3 py-2 md:px-4 md:py-3 rounded-lg flex items-center justify-between border-l-4 ${borderColor} cursor-pointer`}
      onClick={createRipple}
      whileTap={{ scale: 0.95 }}
    >
      <div className="flex flex-col justify-center pointer-events-none">
        <p className="text-base md:text-lg font-bold text-white leading-tight">
          {capitalize(subject)}
        </p>
        <div className="flex items-baseline gap-x-1.5 mt-1">
          <span className="text-lg md:text-xl font-bold text-white">{score}</span>
          <span className="text-xs md:text-sm text-gray-500">/ {maxScore}</span>
        </div>
      </div>

      <div className={`flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-full bg-slate-800 border-2 ${borderColor} pointer-events-none`}>
        <span className={`text-3xl md:text-4xl font-bold ${textColor}`}>
          {grade}
        </span>
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