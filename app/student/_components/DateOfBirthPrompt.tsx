"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../../../firebase-config';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useAppSelector } from '../../_stores/hooks';
import { toast } from 'sonner';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { useTranslations } from 'next-intl';

interface DateOfBirthPromptProps {
  onComplete?: () => void;
}

export const DateOfBirthPrompt: React.FC<DateOfBirthPromptProps> = ({ onComplete }) => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [selectedDate, setSelectedDate] = useState({
    day: '',
    month: '',
    year: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState<'year' | 'month' | 'day'>('year');
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const { studentDocId } = useAppSelector((state) => ({
    studentDocId: state.main.studentDocId,
  }));

  const t = useTranslations('dateOfBirth');
  const tCommon = useTranslations('common');

  const containerRef = useRef<HTMLDivElement>(null);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Mouse position for dynamic background (desktop only)
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const backgroundX = useTransform(mouseX, [0, 1000], [-50, 50]);
  const backgroundY = useTransform(mouseY, [0, 1000], [-50, 50]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isMobile) {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    }
  }, [mouseX, mouseY, isMobile]);

  useEffect(() => {
    const checkDateOfBirth = async () => {
      if (!studentDocId) return;

      try {
        const studentRef = doc(db, 'students', studentDocId);
        const studentSnap = await getDoc(studentRef);

        if (studentSnap.exists()) {
          const studentData = studentSnap.data();
          // Show prompt if dateOfBirth is null or undefined
          if (!studentData.dateOfBirth) {
            // Add a small delay for better UX
            setTimeout(() => setShowPrompt(true), 1000);
          }
        }
      } catch (error) {
        console.error('Error checking date of birth:', error);
      }
    };

    checkDateOfBirth();
  }, [studentDocId]);

  const handleSubmit = async () => {
    // Validate all fields are filled
    if (!selectedDate.day || !selectedDate.month || !selectedDate.year) {
      toast.error(t('validation.incompleteFields'));
      return;
    }

    // Validate date is valid
    const day = parseInt(selectedDate.day);
    const month = parseInt(selectedDate.month);
    const year = parseInt(selectedDate.year);

    if (day < 1 || day > 31 || month < 1 || month > 12) {
      toast.error(t('validation.invalidDate'));
      return;
    }

    // Check if date is in the future
    const dateOfBirth = new Date(year, month - 1, day);
    const today = new Date();
    if (dateOfBirth > today) {
      toast.error(t('validation.futureDate'));
      return;
    }

    // Check if age is reasonable (between 3 and 100 years old)
    const age = today.getFullYear() - year;
    if (age < 3 || age > 100) {
      toast.error(t('validation.invalidAge'));
      return;
    }

    setIsSubmitting(true);

    try {
      if (!studentDocId) {
        throw new Error('Student document ID not found');
      }

      const studentRef = doc(db, 'students', studentDocId);
      const formattedDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

      await updateDoc(studentRef, {
        dateOfBirth: formattedDate
      });

      toast.success(t('success.saved'));
      setShowPrompt(false);

      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('Error updating date of birth:', error);
      toast.error(t('error.saveFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (currentStep === 'year' && selectedDate.year) {
      setCurrentStep('month');
    } else if (currentStep === 'month' && selectedDate.month) {
      setCurrentStep('day');
    }
  };

  const handleBack = () => {
    if (currentStep === 'day') {
      setCurrentStep('month');
    } else if (currentStep === 'month') {
      setCurrentStep('year');
    }
  };

  const years = Array.from({ length: 2015 - 2003 + 1 }, (_, i) => 2003 + i);
  const months = [
    { value: '1', label: t('months.january') },
    { value: '2', label: t('months.february') },
    { value: '3', label: t('months.march') },
    { value: '4', label: t('months.april') },
    { value: '5', label: t('months.may') },
    { value: '6', label: t('months.june') },
    { value: '7', label: t('months.july') },
    { value: '8', label: t('months.august') },
    { value: '9', label: t('months.september') },
    { value: '10', label: t('months.october') },
    { value: '11', label: t('months.november') },
    { value: '12', label: t('months.december') },
  ];
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  const getStepProgress = () => {
    if (currentStep === 'year') return 33;
    if (currentStep === 'month') return 66;
    return 100;
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'year': return isMobile ? t('title.yearMobile') : t('title.year');
      case 'month': return isMobile ? t('title.monthMobile') : t('title.month');
      case 'day': return isMobile ? t('title.dayMobile') : t('title.day');
      default: return '';
    }
  };

  const getStepIcon = () => {
    switch (currentStep) {
      case 'year': return '📅';
      case 'month': return '🗓️';
      case 'day': return '🎂';
      default: return '📅';
    }
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`fixed inset-0 z-[9999] flex ${isMobile ? 'items-end' : 'items-center justify-center'} p-4`}
          onMouseMove={!isMobile ? handleMouseMove : undefined}
        >
          {/* Dynamic Background - Reduced particles on mobile */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-purple-900/20 to-pink-900/20 backdrop-blur-xl"
            style={!isMobile ? {
              backgroundPosition: `${backgroundX}px ${backgroundY}px`,
            } : undefined}
          />

          {/* Floating Particles - Fewer on mobile */}
          {!isMobile && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 bg-white/20 rounded-full"
                  initial={{
                    x: Math.random() * window.innerWidth,
                    y: Math.random() * window.innerHeight,
                    scale: 0,
                  }}
                  animate={{
                    scale: [0, 1, 0],
                    opacity: [0, 0.5, 0],
                  }}
                  transition={{
                    duration: 3 + Math.random() * 2,
                    repeat: Infinity,
                    delay: Math.random() * 2,
                  }}
                />
              ))}
            </div>
          )}

          <motion.div
            ref={containerRef}
            initial={isMobile ? { y: "100%" } : { scale: 0.8, opacity: 0, rotateY: -15 }}
            animate={isMobile ? { y: 0 } : { scale: 1, opacity: 1, rotateY: 0 }}
            exit={isMobile ? { y: "100%" } : { scale: 0.8, opacity: 0, rotateY: 15 }}
            transition={{
              type: "spring",
              duration: isMobile ? 0.4 : 0.6,
              bounce: isMobile ? 0 : 0.3
            }}
            className={`relative w-full ${isMobile ? 'max-w-none mx-4 mb-4' : 'max-w-lg'}`}
          >
            {/* Glassmorphism Card - Mobile optimized */}
            <div className={`relative bg-white/10 dark:bg-slate-900/10 backdrop-blur-2xl ${isMobile ? 'rounded-t-3xl rounded-b-xl' : 'rounded-3xl'} shadow-2xl border border-white/20 dark:border-slate-700/20 overflow-hidden`}>
              {/* Animated Border */}
              <div className={`absolute inset-0 ${isMobile ? 'rounded-t-3xl rounded-b-xl' : 'rounded-3xl'} bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 p-[1px]`}>
                <div className={`w-full h-full bg-white/95 dark:bg-slate-900/95 ${isMobile ? 'rounded-t-3xl rounded-b-xl' : 'rounded-3xl'}`} />
              </div>

              {/* Progress Bar */}
              <div className="relative z-10 h-2 bg-gray-100/50 dark:bg-slate-800/50">
                <motion.div
                  initial={{ width: '33%' }}
                  animate={{ width: `${getStepProgress()}%` }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                  className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 rounded-full shadow-lg"
                />
              </div>

              <div className={`relative z-10 ${isMobile ? 'p-6' : 'p-8'}`}>
                {/* Header - Mobile optimized */}
                <div className={`text-center ${isMobile ? 'mb-6' : 'mb-8'}`}>
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{
                      delay: 0.2,
                      type: "spring",
                      stiffness: 200,
                      damping: 15
                    }}
                    className={`${isMobile ? 'w-20 h-20' : 'w-24 h-24'} mx-auto ${isMobile ? 'mb-4' : 'mb-6'} bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl relative`}
                  >
                    {/* Glow Effect */}
                    <div className={`absolute inset-0 bg-gradient-to-br from-cyan-400 to-purple-600 ${isMobile ? 'rounded-2xl' : 'rounded-2xl'} blur-lg opacity-50`} />
                    <span className={`${isMobile ? 'text-2xl' : 'text-3xl'} relative z-10`}>{getStepIcon()}</span>
                  </motion.div>

                  <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold bg-gradient-to-r from-gray-900 via-purple-900 to-gray-900 dark:from-white dark:via-purple-200 dark:to-white bg-clip-text text-transparent ${isMobile ? 'mb-2' : 'mb-3'}`}
                  >
                    {getStepTitle()}
                  </motion.h2>

                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className={`text-gray-600 dark:text-gray-300 ${isMobile ? 'text-base' : 'text-lg'}`}
                  >
                    {t('ui.stepOf', { current: currentStep === 'year' ? '1' : currentStep === 'month' ? '2' : '3', total: '3' })}
                  </motion.p>
                </div>

                {/* Date Selection - Mobile optimized grids */}
                <AnimatePresence mode="wait">
                  {currentStep === 'year' && (
                    <motion.div
                      key="year"
                      initial={{ opacity: 0, x: 50, scale: 0.9 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -50, scale: 0.9 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                      className="space-y-6"
                    >
                      <div className={`grid ${isMobile ? 'grid-cols-3' : 'grid-cols-4'} gap-3 max-h-80 overflow-y-auto p-4 bg-white/5 dark:bg-slate-800/5 rounded-2xl backdrop-blur-sm border border-white/10`}>
                        {years.map((year, index) => (
                          <motion.button
                            key={year}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * (isMobile ? 0.01 : 0.02) }}
                            whileHover={!isMobile ? {
                              scale: 1.05,
                              boxShadow: "0 10px 25px rgba(59, 130, 246, 0.3)"
                            } : undefined}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setSelectedDate({ ...selectedDate, year: year.toString() })}
                            onHoverStart={() => !isMobile && setHoveredItem(`year-${year}`)}
                            onHoverEnd={() => !isMobile && setHoveredItem(null)}
                            className={`relative ${isMobile ? 'py-5 px-4' : 'py-4 px-3'} rounded-xl font-semibold ${isMobile ? 'text-base' : 'text-sm'} transition-all duration-300 min-h-[44px] ${
                              selectedDate.year === year.toString()
                                ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-xl shadow-cyan-500/30'
                                : 'bg-white/80 dark:bg-slate-700/80 text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-slate-600 border border-white/20 dark:border-slate-600/20'
                            }`}
                          >
                            {year}
                            {hoveredItem === `year-${year}` && !isMobile && (
                              <motion.div
                                className="absolute inset-0 bg-gradient-to-br from-cyan-400/20 to-blue-500/20 rounded-xl"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                              />
                            )}
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {currentStep === 'month' && (
                    <motion.div
                      key="month"
                      initial={{ opacity: 0, x: 50, scale: 0.9 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -50, scale: 0.9 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                      className="space-y-6"
                    >
                      <div className={`grid ${isMobile ? 'grid-cols-2' : 'grid-cols-2'} gap-3 max-h-80 overflow-y-auto p-4 bg-white/5 dark:bg-slate-800/5 rounded-2xl backdrop-blur-sm border border-white/10`}>
                        {months.map((month, index) => (
                          <motion.button
                            key={month.value}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * (isMobile ? 0.03 : 0.05) }}
                            whileHover={!isMobile ? {
                              scale: 1.02,
                              boxShadow: "0 8px 20px rgba(147, 51, 234, 0.3)"
                            } : undefined}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setSelectedDate({ ...selectedDate, month: month.value })}
                            onHoverStart={() => !isMobile && setHoveredItem(`month-${month.value}`)}
                            onHoverEnd={() => !isMobile && setHoveredItem(null)}
                            className={`relative ${isMobile ? 'py-5 px-4' : 'py-4 px-4'} rounded-xl font-medium ${isMobile ? 'text-base' : 'text-sm'} transition-all duration-300 min-h-[44px] ${
                              selectedDate.month === month.value
                                ? 'bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-xl shadow-purple-500/30'
                                : 'bg-white/80 dark:bg-slate-700/80 text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-slate-600 border border-white/20 dark:border-slate-600/20'
                            }`}
                          >
                            {isMobile ? month.label.slice(0, 3) : month.label}
                            {hoveredItem === `month-${month.value}` && !isMobile && (
                              <motion.div
                                className="absolute inset-0 bg-gradient-to-br from-purple-400/20 to-pink-500/20 rounded-xl"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                              />
                            )}
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {currentStep === 'day' && (
                    <motion.div
                      key="day"
                      initial={{ opacity: 0, x: 50, scale: 0.9 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -50, scale: 0.9 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                      className="space-y-6"
                    >
                      <div className={`grid ${isMobile ? 'grid-cols-6' : 'grid-cols-7'} gap-2 max-h-80 overflow-y-auto p-4 bg-white/5 dark:bg-slate-800/5 rounded-2xl backdrop-blur-sm border border-white/10`}>
                        {days.map((day, index) => (
                          <motion.button
                            key={day}
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{
                              delay: index * (isMobile ? 0.01 : 0.02),
                              type: "spring",
                              stiffness: 300,
                              damping: 20
                            }}
                            whileHover={!isMobile ? {
                              scale: 1.1,
                              boxShadow: "0 6px 15px rgba(236, 72, 153, 0.3)"
                            } : undefined}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setSelectedDate({ ...selectedDate, day: day.toString() })}
                            onHoverStart={() => !isMobile && setHoveredItem(`day-${day}`)}
                            onHoverEnd={() => !isMobile && setHoveredItem(null)}
                            className={`relative ${isMobile ? 'w-12 h-12' : 'w-10 h-10'} rounded-lg font-medium ${isMobile ? 'text-base' : 'text-sm'} transition-all duration-300 flex items-center justify-center ${
                              selectedDate.day === day.toString()
                                ? 'bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-xl shadow-pink-500/30'
                                : 'bg-white/80 dark:bg-slate-700/80 text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-slate-600 border border-white/20 dark:border-slate-600/20'
                            }`}
                          >
                            {day}
                            {hoveredItem === `day-${day}` && !isMobile && (
                              <motion.div
                                className="absolute inset-0 bg-gradient-to-br from-pink-400/20 to-rose-500/20 rounded-lg"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                              />
                            )}
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Selected Date Display - Mobile optimized */}
                {(selectedDate.year || selectedDate.month || selectedDate.day) && (
                  <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className={`mt-8 p-6 bg-gradient-to-r from-white/10 to-white/5 dark:from-slate-800/10 dark:to-slate-900/5 rounded-2xl border border-white/20 dark:border-slate-700/20 backdrop-blur-sm`}
                  >
                    <div className={`flex items-center justify-center space-x-2 ${isMobile ? 'mb-3' : 'mb-2'}`}>
                      <span className={`${isMobile ? 'text-xl' : 'text-2xl'}`}>🎯</span>
                      <p className={`font-medium text-gray-600 dark:text-gray-300 ${isMobile ? 'text-sm' : 'text-sm'}`}>{t('ui.yourSelection')}</p>
                    </div>
                    <p className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-center bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent`}>
                      {selectedDate.year && <span>{selectedDate.year}</span>}
                      {selectedDate.month && <span className="mx-2">•</span>}
                      {selectedDate.month && <span>{isMobile ? months.find(m => m.value === selectedDate.month)?.label.slice(0, 3) : months.find(m => m.value === selectedDate.month)?.label}</span>}
                      {selectedDate.day && <span className="mx-2">•</span>}
                      {selectedDate.day && <span>{selectedDate.day}</span>}
                    </p>
                  </motion.div>
                )}

                {/* Action Buttons - Mobile optimized */}
                <div className={`flex gap-4 ${isMobile ? 'mt-6' : 'mt-8'}`}>
                  {currentStep !== 'year' && (
                    <motion.button
                      whileHover={!isMobile ? { scale: 1.02 } : undefined}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleBack}
                      disabled={isSubmitting}
                      className={`flex-1 ${isMobile ? 'py-5 px-6' : 'py-4 px-6'} bg-white/80 dark:bg-slate-700/80 text-gray-700 dark:text-gray-200 rounded-2xl font-semibold hover:bg-white dark:hover:bg-slate-600 transition-all duration-300 disabled:opacity-50 border border-white/20 dark:border-slate-600/20 backdrop-blur-sm shadow-lg min-h-[48px] ${isMobile ? 'text-base' : ''}`}
                    >
                      ← {isMobile ? t('ui.back') : t('ui.back')}
                    </motion.button>
                  )}
                  {currentStep !== 'day' ? (
                    <motion.button
                      whileHover={!isMobile ? { scale: 1.02 } : undefined}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleNext}
                      disabled={!selectedDate[currentStep]}
                      className={`flex-1 ${isMobile ? 'py-5 px-6' : 'py-4 px-6'} bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-2xl font-semibold hover:from-cyan-600 hover:to-blue-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-cyan-500/30 backdrop-blur-sm min-h-[48px] ${isMobile ? 'text-base' : ''}`}
                    >
                      {isMobile ? t('ui.next') : t('ui.nextArrow')}
                    </motion.button>
                  ) : (
                    <motion.button
                      whileHover={!isMobile ? { scale: 1.02 } : undefined}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleSubmit}
                      disabled={isSubmitting || !selectedDate.day}
                      className={`flex-1 ${isMobile ? 'py-5 px-6' : 'py-4 px-6'} bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-2xl font-semibold hover:from-purple-600 hover:to-pink-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-purple-500/30 backdrop-blur-sm flex items-center justify-center min-h-[48px] ${isMobile ? 'text-base' : ''}`}
                    >
                      {isSubmitting ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full mr-2"
                          />
                          {t('ui.saving')}
                        </>
                      ) : (
                        <>
                          <span className="mr-2">✨</span>
                          {isMobile ? t('ui.done') : t('ui.complete')}
                        </>
                      )}
                    </motion.button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DateOfBirthPrompt;