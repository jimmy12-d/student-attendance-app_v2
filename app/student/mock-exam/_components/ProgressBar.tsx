import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../../../firebase-config';
import { doc, getDoc } from 'firebase/firestore';

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

export default function ProgressBar({ status, loading, availableTabs, currentMockId }: { status: string, loading: boolean, availableTabs: string[], currentMockId?: string }) {
  const [visualPercent, setVisualPercent] = useState(0);
  const [ripples, setRipples] = useState<any[]>([]);
  const [examDate, setExamDate] = useState<string | null>(null);
  const cfg = statusConfig[status] || statusConfig["No Registered"];

  // Fetch exam date when currentMockId changes
  useEffect(() => {
    const fetchExamDate = async () => {
      if (!currentMockId) {
        setExamDate(null);
        return;
      }

      try {
        const controlDocRef = doc(db, 'examControls', currentMockId);
        const controlDocSnap = await getDoc(controlDocRef);

        if (controlDocSnap.exists()) {
          const controlData = controlDocSnap.data();
          const date = controlData.date; // DD-MM-YYYY format
          setExamDate(date || null);
        } else {
          setExamDate(null);
        }
      } catch (error) {
        console.warn(`Failed to fetch date for ${currentMockId}:`, error);
        setExamDate(null);
      }
    };

    fetchExamDate();
  }, [currentMockId]);

  // Function to get the latest mock exam title based on availableTabs
  const getMockExamTitle = () => {
    if (availableTabs.length === 0) return "Mock Exam";
    
    // Find the highest numbered mock that is available
    const mockNumbers = availableTabs
      .map(tab => {
        const match = tab.match(/mock(\d+)/i);
        return match ? parseInt(match[1]) : 0;
      })
      .filter(num => num > 0)
      .sort((a, b) => b - a); // Sort descending
    
    if (mockNumbers.length === 0) return "Mock Exam";
    
    const latestMockNumber = mockNumbers[0];
    return latestMockNumber === 3 ? "Mock 3" : `Mock Exam ${latestMockNumber}`;
  };

  // Function to format date without year
  const formatDateWithoutYear = (dateString: string) => {
    if (!dateString) return '';
    // Assuming format is DD-MM-YYYY, extract DD-MM
    const parts = dateString.split('-');
    if (parts.length >= 2) {
      return `${parts[0]}-${parts[1]}`;
    }
    return dateString;
  };

  // Function to format date with month name
  const formatDateWithMonth = (dateString: string) => {
    if (!dateString) return '';
    // Assuming format is DD-MM-YYYY
    const parts = dateString.split('-');
    if (parts.length >= 3) {
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1; // JS months are 0-indexed
      const year = parseInt(parts[2]);

      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];

      return `${day} ${monthNames[month]}`;
    }
    return dateString;
  };

  // Function to calculate days until exam
  const getDaysUntilExam = (dateString: string) => {
    if (!dateString) return null;

    try {
      // Assuming format is DD-MM-YYYY
      const parts = dateString.split('-');
      if (parts.length >= 3) {
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1; // JS months are 0-indexed
        const year = parseInt(parts[2]);

        const examDate = new Date(year, month, day);
        const today = new Date();

        // Reset time to start of day for accurate calculation
        examDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);

        const diffTime = examDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays;
      }
    } catch (error) {
      console.warn('Error calculating days until exam:', error);
    }
    return null;
  };

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
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-6 pt-4 pb-6 max-w-2xl mx-auto my-6 animate-pulse shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-bold text-white">{getMockExamTitle()}</h2>
            {examDate && (
              <div className="flex items-center gap-3">
                {/* Date Badge */}
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-sm"></div>
                  <div className="relative bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-sm border border-white/10 rounded-full px-3 py-1">
                    <span className="text-xs font-semibold text-blue-300 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                      </svg>
                      {formatDateWithMonth(examDate)}
                    </span>
                  </div>
                </div>

                {/* Countdown Badge */}
                {(() => {
                  const daysUntil = getDaysUntilExam(examDate);
                  if (daysUntil === null) return null;

                  let countdownColor = 'text-green-300';
                  let bgGradient = 'from-green-500/10 to-emerald-500/10';
                  let glowColor = 'from-green-500/20 to-emerald-500/20';

                  if (daysUntil < 0) {
                    countdownColor = 'text-red-300';
                    bgGradient = 'from-red-500/10 to-pink-500/10';
                    glowColor = 'from-red-500/20 to-pink-500/20';
                  } else if (daysUntil <= 7) {
                    countdownColor = 'text-orange-300';
                    bgGradient = 'from-orange-500/10 to-yellow-500/10';
                    glowColor = 'from-orange-500/20 to-yellow-500/20';
                  }

                  return (
                    <div className="relative">
                      <div className={`absolute inset-0 bg-gradient-to-r ${glowColor} rounded-full blur-sm`}></div>
                      <div className={`relative bg-gradient-to-r ${bgGradient} backdrop-blur-sm border border-white/10 rounded-full px-3 py-1`}>
                        <span className={`text-xs font-semibold ${countdownColor} flex items-center gap-1`}>
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                          </svg>
                          {daysUntil < 0
                            ? `${Math.abs(daysUntil)} days ago`
                            : daysUntil === 0
                            ? 'Today!'
                            : `${daysUntil} days left`
                          }
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
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
      className="relative overflow-hidden bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-6 pt-4 pb-6 max-w-2xl mx-auto cursor-pointer shadow-xl"
      onClick={createRipple}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex justify-between items-center mb-4 pointer-events-none">
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-bold text-white">{getMockExamTitle()}</h2>
          {examDate && (
            <div className="flex items-center gap-3">
              {/* Date Badge */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-sm"></div>
                <div className="relative bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-sm border border-white/10 rounded-full px-3 py-1">
                  <span className="text-xs font-semibold text-blue-300 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                    {formatDateWithMonth(examDate)}
                  </span>
                </div>
              </div>

              {/* Countdown Badge */}
              {(() => {
                const daysUntil = getDaysUntilExam(examDate);
                if (daysUntil === null) return null;

                let countdownColor = 'text-green-300';
                let bgGradient = 'from-green-500/10 to-emerald-500/10';
                let glowColor = 'from-green-500/20 to-emerald-500/20';

                if (daysUntil < 0) {
                  countdownColor = 'text-red-300';
                  bgGradient = 'from-red-500/10 to-pink-500/10';
                  glowColor = 'from-red-500/20 to-pink-500/20';
                } else if (daysUntil <= 7) {
                  countdownColor = 'text-orange-300';
                  bgGradient = 'from-orange-500/10 to-yellow-500/10';
                  glowColor = 'from-orange-500/20 to-yellow-500/20';
                }

                return (
                  <div className="relative">
                    <div className={`absolute inset-0 bg-gradient-to-r ${glowColor} rounded-full blur-sm`}></div>
                    <div className={`relative bg-gradient-to-r ${bgGradient} backdrop-blur-sm border border-white/10 rounded-full px-3 py-1`}>
                      <span className={`text-xs font-semibold ${countdownColor} flex items-center gap-1`}>
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                        {daysUntil < 0
                          ? `${Math.abs(daysUntil)} days ago`
                          : daysUntil === 0
                          ? 'Today!'
                          : `${daysUntil} days left`
                        }
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
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