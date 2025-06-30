"use client";

import React, { useState } from 'react';
import Icon from '../../_components/Icon';
import { motion, AnimatePresence } from 'framer-motion';

interface AttendanceSummaryCardProps {
  title: string;
  count: number;
  total: number;
  icon: string;
  barColorClass: string;
  bgColorClass: string;
  rippleColor: string;
  onClick: () => void;
}

const AttendanceSummaryCard: React.FC<AttendanceSummaryCardProps> = ({
  title,
  count,
  total,
  icon,
  barColorClass,
  bgColorClass,
  rippleColor,
  onClick,
}) => {
  const [ripples, setRipples] = useState<any[]>([]);

  const createRipple = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    const { left, top, width, height } = event.currentTarget.getBoundingClientRect();
    const size = Math.max(width, height);
    const x = event.clientX - left - size / 2;
    const y = event.clientY - top - size / 2;

    const newRipple = { x, y, size, id: Date.now() };

    setRipples([...ripples, newRipple]);

    setTimeout(() => {
      setRipples((currentRipples) => currentRipples.filter((r) => r.id !== newRipple.id));
    }, 700);
  };

  const barHeightPercentage = count > 0 ? Math.max(30, (count / total) * 100) : 0;
  const textColor = count > 0 ? 'text-white' : 'text-slate-800';

  return (
    <motion.button
      onClick={(e) => {
        createRipple(e);
        onClick();
      }}
      whileTap={{ scale: 0.98 }}
      className={`relative rounded-2xl h-32 text-left w-full overflow-hidden ${bgColorClass}`}
    >
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <p className="text-4xl font-bold text-slate-800">{count.toString().padStart(2, '0')}</p>
      </div>
      <div
        className={`absolute bottom-0 left-0 w-full rounded-t-xl ${barColorClass} pointer-events-none`}
        style={{
          height: `${barHeightPercentage}%`,
          maxHeight: '90%'
        }}
      ></div>
      <div className={`absolute bottom-4 left-4 z-10 flex items-center ${textColor} pointer-events-none`}>
        <Icon path={icon} size={24} className="mr-2" />
        <span className="font-semibold">{title}</span>
      </div>
      <AnimatePresence>
        {ripples.map((ripple) => (
          <motion.span
            key={ripple.id}
            initial={{ scale: 0, opacity: 0.3 }}
            animate={{ scale: 4, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.4 }}
            className="absolute rounded-full z-20"
            style={{
              left: ripple.x,
              top: ripple.y,
              width: ripple.size,
              height: ripple.size,
              backgroundColor: rippleColor,
            }}
          />
        ))}
      </AnimatePresence>
    </motion.button>
  );
};

export default AttendanceSummaryCard; 