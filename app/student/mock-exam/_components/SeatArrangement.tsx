"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../../../firebase-config';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { useTranslations } from 'next-intl';

interface SeatArrangementProps {
  studentDocId: string;
  selectedTab: string;
  progressStatus: string;
}

interface ShiftData {
  phone: number;
  room: string;
  seat: string;
}

interface DayData {
  Afternoon?: ShiftData;
  Evening?: ShiftData;
  [key: string]: ShiftData | undefined;
}

interface SeatData {
  fullName: string;
  studentId: string;
  uploadedAt: any;
  day1?: DayData;
  day2?: DayData;
  day3?: DayData;
}

export default function SeatArrangement({ studentDocId, selectedTab, progressStatus }: SeatArrangementProps) {
  const t = useTranslations('student.mockExam.seatArrangement');
  const tCommon = useTranslations('common');
  const [seatData, setSeatData] = useState<SeatData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [examDate, setExamDate] = useState<string | null>(null);
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set());
  const [showAllDaysWhenCompleted, setShowAllDaysWhenCompleted] = useState(false);

  useEffect(() => {
    if (!studentDocId || !selectedTab) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    let unsubscribeSeatListener: (() => void) | null = null;

    const setupRealtimeListener = async () => {
      try {
        // Fetch dataCollectionName from examControls (same pattern as ProgressBar)
        const controlDocRef = doc(db, 'examControls', selectedTab);
        const controlDocSnap = await getDoc(controlDocRef);

        if (!controlDocSnap.exists() || !controlDocSnap.data().dataCollectionName) {
          setSeatData(null);
          setIsLoading(false);
          return;
        }

        const dataCollectionName = controlDocSnap.data().dataCollectionName;

        // Set up real-time listener for seat data
        const seatQuery = query(
          collection(db, dataCollectionName),
          where('studentId', '==', studentDocId)
        );

        unsubscribeSeatListener = onSnapshot(
          seatQuery,
          (snapshot) => {
            if (snapshot.empty) {
              setSeatData(null);
              setIsLoading(false);
              return;
            }

            const data = snapshot.docs[0].data() as SeatData;
            setSeatData(data);
            setIsLoading(false);
          },
          (error) => {
            console.error('Error listening to seat arrangement:', error);
            setSeatData(null);
            setIsLoading(false);
          }
        );
      } catch (error) {
        console.error('Error setting up seat arrangement listener:', error);
        setSeatData(null);
        setIsLoading(false);
      }
    };

    setupRealtimeListener();

    return () => {
      if (unsubscribeSeatListener) {
        unsubscribeSeatListener();
      }
    };
  }, [studentDocId, selectedTab]);

  // Fetch exam date when selectedTab changes
  useEffect(() => {
    const fetchExamDate = async () => {
      if (!selectedTab) {
        setExamDate(null);
        return;
      }

      try {
        const controlDocRef = doc(db, 'examControls', selectedTab);
        const controlDocSnap = await getDoc(controlDocRef);

        if (controlDocSnap.exists()) {
          const controlData = controlDocSnap.data();
          const date = controlData.date; // DD-MM-YYYY format
          setExamDate(date || null);
        } else {
          setExamDate(null);
        }
      } catch (error) {
        console.warn(`Failed to fetch date for ${selectedTab}:`, error);
        setExamDate(null);
      }
    };

    fetchExamDate();
  }, [selectedTab]);

  // Set default expanded state - expand "today" by default, but after 6pm expand next day
  // When all exam days are past, collapse all by default unless user chooses to show them
  useEffect(() => {
    if (examDate) {
      const allDaysPast = areAllExamDaysPast();
      if (allDaysPast) {
        // When exam is completed, only expand if user has chosen to show all days
        if (showAllDaysWhenCompleted) {
          setExpandedDays(new Set()); // Keep individual days collapsed when showing completed section
        } else {
          setExpandedDays(new Set()); // Collapse all
        }
        return;
      }

      const newExpandedDays = new Set<number>();
      const now = new Date();
      const isAfter6PM = now.getHours() >= 18;

      for (let dayNumber = 1; dayNumber <= 3; dayNumber++) {
        const status = getDayStatus(dayNumber);
        if (status === 'today') {
          if (isAfter6PM) {
            // After 6pm, expand the next day instead
            const nextDayNumber = dayNumber + 1;
            if (nextDayNumber <= 3) {
              newExpandedDays.add(nextDayNumber);
            } else {
              // If no next day, keep current day expanded
              newExpandedDays.add(dayNumber);
            }
          } else {
            // Before 6pm, expand today
            newExpandedDays.add(dayNumber);
          }
        }
      }
      setExpandedDays(newExpandedDays);
    }
  }, [examDate, showAllDaysWhenCompleted]);

  // Function to toggle expanded state of a day
  const toggleDayExpansion = (dayNumber: number) => {
    setExpandedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dayNumber)) {
        newSet.delete(dayNumber);
      } else {
        newSet.add(dayNumber);
      }
      return newSet;
    });
  };

  // Determine what to show based on progressStatus
  // Show room and seat when payment is complete (either borrowed or paid)
  const shouldShowRoom = progressStatus === 'Borrow' || progressStatus === 'Paid Star' || progressStatus.includes('Paid');
  const shouldShowSeat = progressStatus === 'Borrow' || progressStatus === 'Paid Star' || progressStatus.includes('Paid');
  const shouldShowPhonePocket = progressStatus === 'Registered' || progressStatus === 'Borrow' || progressStatus === 'Paid Star' || progressStatus.includes('Paid');
  const isNotRegistered = progressStatus === 'No Registered';

  // Translate shift names
  const getShiftTranslation = (shiftName: string) => {
    switch (shiftName) {
      case 'Morning':
        return tCommon('morningShift');
      case 'Afternoon':
        return tCommon('afternoonShift');
      case 'Evening':
        return tCommon('eveningShift');
      default:
        return shiftName;
    }
  };

  // Function to calculate date for a specific day number
  const getDayDate = (dayNumber: number) => {
    if (!examDate) return null;

    try {
      // Assuming format is DD-MM-YYYY
      const parts = examDate.split('-');
      if (parts.length >= 3) {
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1; // JS months are 0-indexed
        const year = parseInt(parts[2]);

        const examDateObj = new Date(year, month, day);
        // Add days: day1 = exam date, day2 = exam date + 1, day3 = exam date + 2
        examDateObj.setDate(examDateObj.getDate() + (dayNumber - 1));

        return examDateObj;
      }
    } catch (error) {
      console.warn('Error calculating day date:', error);
    }
    return null;
  };

  // Function to get day status
  const getDayStatus = (dayNumber: number) => {
    const dayDate = getDayDate(dayNumber);
    if (!dayDate) return 'unknown';

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dayDate.setHours(0, 0, 0, 0);

    const diffTime = dayDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'past';
    if (diffDays === 0) return 'today';
    return 'future';
  };

  // Function to get day status display info
  const getDayStatusInfo = (dayNumber: number) => {
    const status = getDayStatus(dayNumber);
    const dayDate = getDayDate(dayNumber);

    switch (status) {
      case 'past':
        return {
          label: 'Past',
          color: 'text-gray-500',
          bgColor: 'bg-gray-100 dark:bg-gray-700',
          borderColor: 'border-gray-300 dark:border-gray-600'
        };
      case 'today':
        return {
          label: 'Today',
          color: 'text-green-600 dark:text-green-400',
          bgColor: 'bg-green-100 dark:bg-green-900/30',
          borderColor: 'border-green-300 dark:border-green-600'
        };
      case 'future':
        return {
          label: 'Upcoming',
          color: 'text-blue-600 dark:text-blue-400',
          bgColor: 'bg-blue-100 dark:bg-blue-900/30',
          borderColor: 'border-blue-300 dark:border-blue-600'
        };
      default:
        return {
          label: '',
          color: 'text-gray-500',
          bgColor: 'bg-gray-100 dark:bg-gray-700',
          borderColor: 'border-gray-300 dark:border-gray-600'
        };
    }
  };

  // Function to check if all exam days are past
  const areAllExamDaysPast = () => {
    for (let dayNumber = 1; dayNumber <= 3; dayNumber++) {
      if (getDayStatus(dayNumber) !== 'past') {
        return false;
      }
    }
    return true;
  };

  // Render a shift card
  const renderShiftCard = (shiftName: string, shiftData: ShiftData | undefined, colorScheme: { from: string; to: string; border: string; text: string; icon: string }) => {
    const getShiftIcon = (name: string) => {
      switch (name) {
        case 'Morning':
          return (
            <svg className={`w-4 h-4 ${colorScheme.text}`} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 00.707-.707zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
            </svg>
          );
        case 'Afternoon':
          return (
            <svg className={`w-4 h-4 ${colorScheme.text}`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18.4807 12.25C18.7607 12.25 19.0007 12.01 18.9807 11.73C18.7107 8.1 15.6907 5.25 12.0007 5.25C8.3107 5.25 5.2907 8.1 5.0207 11.73C5.0007 12.01 5.2407 12.25 5.5207 12.25H18.4807Z" fill="currentColor"/>
              <path d="M22 13H21.92C21.37 13 20.92 12.55 20.92 12C20.92 11.45 21.37 11 21.92 11C22.47 11 22.96 11.45 22.96 12C22.96 12.55 22.55 13 22 13ZM2.08 13H2C1.45 13 1 12.55 1 12C1 11.45 1.45 11 2 11C2.55 11 3.04 11.45 3.04 12C3.04 12.55 2.63 13 2.08 13ZM19.01 5.99C18.75 5.99 18.5 5.89 18.3 5.7C17.91 5.31 17.91 4.68 18.3 4.29L18.43 4.16C18.82 3.77 19.45 3.77 19.84 4.16C20.23 4.55 20.23 5.18 19.84 5.57L19.71 5.7C19.52 5.89 19.27 5.99 19.01 5.99ZM4.99 5.99C4.73 5.99 4.48 5.89 4.28 5.7L4.15 5.56C3.76 5.17 3.76 4.54 4.15 4.15C4.54 3.76 5.17 3.76 5.56 4.15L5.69 4.28C6.08 4.67 6.08 5.3 5.69 5.69C5.5 5.89 5.24 5.99 4.99 5.99ZM12 3.04C11.45 3.04 11 2.63 11 2.08V2C11 1.45 11.45 1 12 1C12.55 1 13 1.45 13 2C13 2.55 12.55 3.04 12 3.04Z" fill="currentColor"/>
              <path d="M20 15.75H4C3.59 15.75 3.25 15.41 3.25 15C3.25 14.59 3.59 14.25 4 14.25H20C20.41 14.25 20.75 14.59 20.75 15C20.75 15.41 20.41 15.75 20 15.75Z" fill="currentColor"/>
              <path d="M18 18.75H6C5.59 18.75 5.25 18.41 5.25 18C5.25 17.59 5.59 17.25 6 17.25H18C18.41 17.25 18.75 17.59 18.41 18.75 18 18.41 18.41 18.75 18 18.75Z" fill="currentColor"/>
              <path d="M15 21.75H9C8.59 21.75 8.25 21.41 8.25 21C8.25 20.59 8.59 20.25 9 20.25H15C15.41 20.25 15.75 20.59 15.75 21C15.75 21.41 15.41 21.75 15 21.75Z" fill="currentColor"/>
            </svg>
          );
        case 'Evening':
          return (
            <svg className={`w-4 h-4 ${colorScheme.text}`} fill="currentColor" viewBox="0 0 20 20">
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
            </svg>
          );
        default:
          return (
            <svg className={`w-4 h-4 ${colorScheme.text}`} fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L11 4.323V3a1 1 0 011-1zm-5 8.274l-.818 2.552c-.25.78-.243 1.619.02 2.394l.004.008a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L5 5.323V3a1 1 0 011-1h.01a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0110 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L5 4.323V3a1 1 0 011-1z" />
            </svg>
          );
      }
    };

    return (
      <motion.div
        whileHover={{ scale: 1.02, y: -2 }}
        transition={{ type: "spring", stiffness: 300 }}
        className={`relative overflow-hidden bg-gradient-to-br ${colorScheme.from} ${colorScheme.to} backdrop-blur-sm border ${colorScheme.border} rounded-xl p-4 shadow-lg`}
      >
        <div className={`absolute top-0 right-0 w-24 h-24 ${colorScheme.icon} rounded-full blur-2xl`}></div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            {getShiftIcon(shiftName)}
            <span className={`text-sm font-bold ${colorScheme.text} uppercase tracking-wide`}>{getShiftTranslation(shiftName)}</span>
          </div>
          
          {shiftData ? (
            <div className="space-y-3">
              {shouldShowRoom && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 dark:bg-black/10 rounded-lg backdrop-blur-sm">
                    <svg className="w-5 h-5 text-current" fill="currentColor" viewBox="0 0 297 297">
                      <path d="M148.5,0C87.43,0,37.747,49.703,37.747,110.797c0,91.026,99.729,179.905,103.976,183.645c1.936,1.705,4.356,2.559,6.777,2.559c2.421,0,4.841-0.853,6.778-2.559c4.245-3.739,103.975-92.618,103.975-183.645C259.253,49.703,209.57,0,148.5,0z M148.5,79.693c16.964,0,30.765,13.953,30.765,31.104c0,17.151-13.801,31.104-30.765,31.104c-16.964,0-30.765-13.953-30.765-31.104C117.735,93.646,131.536,79.693,148.5,79.693z"/>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide">{t('room')}</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{shiftData.room.replace('Room ', '')}</p>
                  </div>
                </div>
              )}
              {shouldShowSeat && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 dark:bg-black/10 rounded-lg backdrop-blur-sm">
                    <svg className="w-5 h-5 text-current" fill="currentColor" viewBox="0 0 512 512">
                      <g>
                        <rect x="146.966" fill="currentColor" width="218.067" height="189.867"/>
                        <polygon fill="currentColor" points="365.033,209.049 146.966,209.049 98.998,280.883 413.002,280.883"/>
                        <polygon fill="currentColor" points="98.998,340.692 98.998,512 145.995,512 145.995,340.692 366.005,340.692 366.005,512 413.002,512 413.002,340.692 413.002,299.67 98.998,299.67"/>
                      </g>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide">{t('seat')}</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{shiftData.seat}</p>
                  </div>
                </div>
              )}
              {shouldShowPhonePocket && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 dark:bg-black/10 rounded-lg backdrop-blur-sm">
                    <svg className="w-5 h-5 text-current" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M1 5V1H7V5L4.5 7.5L8.5 11.5L11 9H15V15H11C5.47715 15 1 10.5228 1 5Z"/>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide">{t('phonePocket')}</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">#{shiftData.phone}</p>
                  </div>
                </div>
              )}
              {!shouldShowRoom && !shouldShowSeat && (
                <p className="text-xs text-gray-600/70 dark:text-gray-400/70 italic">
                  {t('completePaymentToView')}
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p className="text-xs text-gray-600/70 dark:text-gray-400/70 italic">
                {t('noShift')}
              </p>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  // Render a day section
  const renderDaySection = (dayNumber: number, dayData: DayData | undefined) => {
    const hasMorning = dayData?.Morning;
    const hasAfternoon = dayData?.Afternoon;
    const hasEvening = dayData?.Evening;
    const hasAnyShift = hasMorning || hasAfternoon || hasEvening;
    
    // Check if seat data exists at all (determines if assignments have been made)
    const hasSeatData = seatData !== null;
    // If no seat data at all, show "not assigned yet"
    // If seat data exists but this specific day is empty, show "no shift scheduled"
    const showMessage = !hasAnyShift;
    const messageText = isNotRegistered 
      ? t('registerFirst') 
      : !hasSeatData 
        ? t('notAssignedYet')
        : t('noShift');

    const statusInfo = getDayStatusInfo(dayNumber);
    const isExpanded = expandedDays.has(dayNumber);

    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-200/50 to-purple-200/50 dark:from-indigo-500/30 dark:to-purple-500/30 rounded-lg blur-md"></div>
              <div className="relative bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-500/20 dark:to-purple-500/20 p-2 rounded-lg">
                <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <h4 className="text-xl font-bold text-gray-900 dark:text-white">{t(`day${dayNumber}`)}</h4>
              {statusInfo.label && (
                <div className={`px-2 py-1 rounded-full text-xs font-semibold border ${statusInfo.bgColor} ${statusInfo.color} ${statusInfo.borderColor}`}>
                  {statusInfo.label}
                </div>
              )}
            </div>
          </div>
          
          {/* Toggle Button */}
          <motion.button
            onClick={() => toggleDayExpansion(dayNumber)}
            className="p-1.5 rounded-lg bg-white/10 dark:bg-black/10 backdrop-blur-sm border border-white/20 dark:border-white/10 hover:bg-white/20 dark:hover:bg-black/20 transition-colors duration-200"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <motion.svg
              className="w-5 h-5 text-gray-600 dark:text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </motion.svg>
          </motion.button>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ 
                duration: 0.4,
                ease: [0.4, 0.0, 0.2, 1],
                opacity: { duration: 0.2 }
              }}
            >
              {showMessage ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="p-4 bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-500/10 dark:to-slate-500/10 border border-gray-200 dark:border-gray-300/30 rounded-lg"
                >
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center italic">
                    {messageText}
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="grid grid-cols-1 gap-4"
                >
                  {hasMorning && renderShiftCard(
                    'Morning',
                    dayData.Morning,
                    {
                      from: 'from-yellow-100 dark:from-yellow-500/20',
                      to: 'to-yellow-200 dark:to-amber-500/20',
                      border: 'border-yellow-300 dark:border-yellow-300/30',
                      text: 'text-yellow-800 dark:text-yellow-200',
                      icon: 'bg-yellow-200 dark:bg-yellow-400/10'
                    }
                  )}
                  {hasAfternoon && renderShiftCard(
                    'Afternoon',
                    dayData.Afternoon,
                    {
                      from: 'from-emerald-100 dark:from-emerald-400/20',
                      to: 'to-emerald-200 dark:to-teal-400/20',
                      border: 'border-emerald-300 dark:border-emerald-300/40',
                      text: 'text-emerald-800 dark:text-emerald-200',
                      icon: 'bg-emerald-200 dark:bg-emerald-400/20'
                    }
                  )}
                  {hasEvening && renderShiftCard(
                    'Evening',
                    dayData.Evening,
                    {
                      from: 'from-indigo-100 dark:from-indigo-500/20',
                      to: 'to-indigo-200 dark:to-blue-500/20',
                      border: 'border-indigo-300 dark:border-indigo-300/30',
                      text: 'text-indigo-800 dark:text-indigo-200',
                      icon: 'bg-indigo-200 dark:bg-indigo-400/10'
                    }
                  )}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-500/10 dark:via-purple-500/10 dark:to-pink-500/10 backdrop-blur-md border border-gray-200 dark:border-white/20 rounded-2xl p-6 max-w-4xl mx-auto my-6 shadow-xl animate-pulse">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-slate-700 rounded-lg"></div>
          <div className="h-6 w-40 bg-slate-700 rounded"></div>
        </div>
        <div className="space-y-4">
          <div className="h-32 bg-slate-700 rounded-xl"></div>
          <div className="h-32 bg-slate-700 rounded-xl"></div>
          <div className="h-32 bg-slate-700 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-500/10 dark:via-purple-500/10 dark:to-pink-500/10 backdrop-blur-md border border-gray-200 dark:border-white/20 rounded-2xl p-6 max-w-4xl mx-auto my-6 shadow-xl"
    >

      {/* Day Sections */}
      {areAllExamDaysPast() && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-200/50 to-purple-200/50 dark:from-indigo-500/30 dark:to-purple-500/30 rounded-lg blur-md"></div>
                <div className="relative bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-500/20 dark:to-purple-500/20 p-2 rounded-lg">
                  <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h3>
            </div>

            {/* Toggle Button to show/hide all days */}
            <motion.button
              onClick={() => setShowAllDaysWhenCompleted(!showAllDaysWhenCompleted)}
              className="p-1.5 rounded-lg bg-white/10 dark:bg-black/10 backdrop-blur-sm border border-white/20 dark:border-white/10 hover:bg-white/20 dark:hover:bg-black/20 transition-colors duration-200"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.svg
                className="w-5 h-5 text-gray-600 dark:text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                animate={{ rotate: showAllDaysWhenCompleted ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </motion.svg>
            </motion.button>
          </div>

          <AnimatePresence>
            {showAllDaysWhenCompleted && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{
                  duration: 0.4,
                  ease: [0.4, 0.0, 0.2, 1],
                  opacity: { duration: 0.2 }
                }}
              >
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="space-y-6"
                >
                  {renderDaySection(1, seatData?.day1)}
                  {renderDaySection(2, seatData?.day2)}
                  {renderDaySection(3, seatData?.day3)}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Show day sections normally when exam is not completed */}
      {!areAllExamDaysPast() && (
        <>
          {renderDaySection(1, seatData?.day1)}
          {renderDaySection(2, seatData?.day2)}
          {renderDaySection(3, seatData?.day3)}
        </>
      )}

      {/* Status Messages */}
      {isNotRegistered && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 p-4 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-500/10 dark:to-pink-500/10 border border-red-200 dark:border-red-300/30 rounded-lg"
        >
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-300 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm text-red-700 dark:text-red-200 font-semibold mb-1">{t('registrationRequired')}</p>
              <p className="text-xs text-red-600/70 dark:text-red-200/70">{t('registrationRequiredMessage')}</p>
            </div>
          </div>
        </motion.div>
      )}
      {!seatData && !isNotRegistered && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-500/10 dark:to-cyan-500/10 border border-blue-200 dark:border-blue-300/30 rounded-lg"
        >
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-300 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm text-blue-700 dark:text-blue-200 font-semibold mb-1">{t('seatAssignmentPending')}</p>
              <p className="text-xs text-blue-600/70 dark:text-blue-200/70">{t('seatAssignmentPendingMessage')}</p>
            </div>
          </div>
        </motion.div>
      )}
      {seatData && shouldShowPhonePocket && !shouldShowSeat && !isNotRegistered && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border border-amber-200 dark:border-amber-300/30 rounded-lg"
        >
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-300 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm text-amber-700 dark:text-amber-200 font-semibold mb-1">{t('paymentRequired')}</p>
              <p className="text-xs text-amber-600/70 dark:text-amber-200/70">{t('paymentRequiredMessage')}</p>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
