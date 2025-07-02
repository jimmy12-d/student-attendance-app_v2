import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from 'framer-motion';

const statusConfig = {
  "No Registered": {
    percent: 0,
    message: "Not registered yet!",
    color: "text-red-500",
    bar: "bg-red-500",
    rippleColor: 'rgba(239, 68, 68, 0.4)'
  },
  "Registered": {
    percent: 33,
    message: "Registered for Mock Exam",
    color: "text-orange-400",
    bar: "bg-orange-400",
    rippleColor: 'rgba(251, 146, 60, 0.4)'
  },
  "Borrow": {
    percent: 66,
    message: "You owe Star payment. You need to finish your payment to view your Mock 3 results.",
    color: "text-yellow-400",
    bar: "bg-yellow-500",
    rippleColor: 'rgba(250, 204, 21, 0.4)'
  },
  "Paid Star" :
   {
    percent: 100,
    message: "Star has been Paid! You can view your results now.",
    color: "text-green-500",
    bar: "bg-green-500",
    rippleColor: 'rgba(74, 222, 128, 0.4)'
  },
};

export default function ProgressBar({ status, loading }: { status: string, loading: boolean }) {
  const [visualPercent, setVisualPercent] = useState(0);
  const [ripples, setRipples] = useState<any[]>([]);
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

  const createRipple = (event: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = event.currentTarget.getBoundingClientRect();
    const size = Math.max(width, height);
    const x = event.clientX - left - size / 2;
    const y = event.clientY - top - size / 2;
    
    const newRipple = { x, y, size, id: Date.now(), rippleColor: cfg.rippleColor };

    setRipples(prev => [...prev, newRipple]);

    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== newRipple.id));
    }, 700);
  };

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
    <motion.div 
      className="relative overflow-hidden bg-slate-900 rounded-2xl px-6 pt-4 pb-6 max-w-2xl mx-auto cursor-pointer"
      onClick={createRipple}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex justify-between items-center mb-4 pointer-events-none">
        <h2 className="text-xl font-bold text-white">Mock Exam 3</h2>
        <span className="text-sm text-gray-400 font-semibold">Your progress</span>
      </div>

      <div className="mb-4 pointer-events-none">
        <span className={`text-2xl font-bold ${cfg.color}`}>{cfg.message}</span>
      </div>

      <div className="relative h-2 bg-slate-700 rounded-full pointer-events-none">
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
} 