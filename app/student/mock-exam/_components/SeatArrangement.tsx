"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { db } from '../../../../firebase-config';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { useTranslations } from 'next-intl';

interface SeatArrangementProps {
  studentDocId: string;
  selectedTab: string;
  progressStatus: string;
}

interface SeatData {
  fullName: string;
  phonePocket: number;
  room: string;
  seat: string;
  studentId: string;
  uploadedAt: any;
}

export default function SeatArrangement({ studentDocId, selectedTab, progressStatus }: SeatArrangementProps) {
  const t = useTranslations('student.mockExam.seatArrangement');
  const [seatData, setSeatData] = useState<SeatData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  // Determine what to show based on progressStatus
  // Registered: Show only phone pocket
  // Borrow or Paid Star: Show room, seat, and phone pocket
  // No Registered: Show all fields with question marks
  const shouldShowRoom = progressStatus === 'Borrow' || progressStatus === 'Paid Star';
  const shouldShowSeat = progressStatus === 'Borrow' || progressStatus === 'Paid Star';
  const shouldShowPhonePocket = progressStatus === 'Registered' || progressStatus === 'Borrow' || progressStatus === 'Paid Star';
  const isNotRegistered = progressStatus === 'No Registered';

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 max-w-2xl mx-auto my-6 shadow-xl animate-pulse">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-slate-700 rounded-lg"></div>
          <div className="h-6 w-40 bg-slate-700 rounded"></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="h-32 bg-slate-700 rounded-xl"></div>
          <div className="h-32 bg-slate-700 rounded-xl"></div>
          <div className="h-32 bg-slate-700 rounded-xl"></div>
        </div>
      </div>
    );
  }

  // If not registered, show UI with question marks for all fields
  // If registered but no seat data yet, also show question marks
  // Otherwise, show the actual data based on payment status

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 max-w-2xl mx-auto my-6 shadow-xl"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/30 to-purple-500/30 rounded-lg blur-md"></div>
          <div className="relative bg-gradient-to-r from-indigo-500/20 to-purple-500/20 p-2 rounded-lg">
            <svg className="w-6 h-6 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h3>
      </div>

      {/* Info Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Room Card */}
        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          transition={{ type: "spring", stiffness: 300 }}
          className="relative overflow-hidden bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-sm border border-blue-300/30 rounded-xl p-5 shadow-lg"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-400/10 rounded-full blur-2xl"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-blue-300" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
              <span className="text-sm font-semibold text-blue-700 dark:text-blue-200 uppercase tracking-wide">{t('room')}</span>
            </div>
            {seatData && shouldShowRoom ? (
              <>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{seatData.room}</p>
                <div className="h-1 w-12 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full"></div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-sm text-blue-600/70 dark:text-blue-200/70 italic">
                  {isNotRegistered ? t('registerFirst') : !seatData ? t('notAssignedYet') : t('completePaymentToView')}
                </p>
                <div className="relative">
                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 bg-blue-100 dark:from-blue-600/30 dark:to-cyan-600/30 dark:bg-blue-800 rounded-full flex items-center justify-center"
                  >
                    <svg className="w-12 h-12 text-blue-600 dark:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01" />
                    </svg>
                  </motion.div>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Seat Card */}
        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          transition={{ type: "spring", stiffness: 300 }}
          className="relative overflow-hidden bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm border border-purple-300/30 rounded-xl p-5 shadow-lg"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-400/10 rounded-full blur-2xl"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-purple-300" fill="currentColor" viewBox="0 0 25 25">
                <path d="M20.5 13H19V9h.5a.5.5 0 0 0 .5-.5v-7a.5.5 0 0 0-.5-.5h-14a.5.5 0 0 0-.5.5v7a.5.5 0 0 0 .5.5H6v4H4.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5H5v6.5a.5.5 0 0 0 .5.5h2a.5.5 0 0 0 .5-.5V22h9v1.5a.5.5 0 0 0 .5.5h2a.5.5 0 0 0 .5-.5V17h.5a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5zM18 13h-1V9h1zm-9 0V9h7v4zM6 2h13v6H6zm1 7h1v4H7zm0 14H6v-6h1v6zm10-6v2H8v-2zm-9 4v-1h9v1zm11 2h-1v-6h1zm1-7H5v-2h15z"/>
                <path d="M7.52 4a.5.5 0 0 0 0-1 .49.49 0 0 0-.52.5.5.5 0 0 0 .52.5zM7.52 7a.5.5 0 0 0 0-1 .49.49 0 0 0-.52.5.5.5 0 0 0 .52.5zM17.52 4a.5.5 0 0 0 0-1 .49.49 0 0 0-.49.5.5.5 0 0 0 .49.5zM17.52 7a.5.5 0 0 0 0-1 .49.49 0 0 0-.49.5.5.5 0 0 0 .49.5z"/>
              </svg>
              <span className="text-sm font-semibold text-purple-700 dark:text-purple-200 uppercase tracking-wide">{t('seat')}</span>
            </div>
            {seatData && shouldShowSeat ? (
              <>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{seatData.seat}</p>
                <div className="h-1 w-12 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full"></div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-sm text-purple-600/70 dark:text-purple-200/70 italic">
                  {isNotRegistered ? t('registerFirst') : !seatData ? t('notAssignedYet') : t('completePaymentToView')}
                </p>
                <div className="relative">
                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-pink-500/20 bg-purple-100 dark:from-purple-600/30 dark:to-pink-600/30 dark:bg-purple-800 rounded-full flex items-center justify-center"
                  >
                    <svg className="w-12 h-12 text-purple-600 dark:text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01" />
                    </svg>
                  </motion.div>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Phone Pocket Card */}
        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          transition={{ type: "spring", stiffness: 300 }}
          className="relative overflow-hidden bg-gradient-to-br from-emerald-500/20 to-teal-500/20 backdrop-blur-sm border border-emerald-300/30 rounded-xl p-5 shadow-lg"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-400/10 rounded-full blur-2xl"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-emerald-300" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
              </svg>
              <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-200 uppercase tracking-wide">{t('phonePocket')}</span>
            </div>
            {seatData && shouldShowPhonePocket ? (
              <>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">#{seatData.phonePocket}</p>
                <div className="h-1 w-12 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full"></div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-sm text-emerald-600/70 dark:text-emerald-200/70 italic">
                  {isNotRegistered ? t('registerFirst') : !seatData ? t('notAssignedYet') : 'N/A'}
                </p>
                <div className="relative">
                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                    className="w-12 h-12 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 bg-emerald-100 dark:from-emerald-600/30 dark:to-teal-600/30 dark:bg-emerald-800 rounded-full flex items-center justify-center"
                  >
                    <svg className="w-12 h-12 text-emerald-600 dark:text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01" />
                    </svg>
                  </motion.div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Status Message */}
      {isNotRegistered && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 p-4 bg-gradient-to-r from-red-500/10 to-pink-500/10 border border-red-300/30 rounded-lg"
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
          className="mt-6 p-4 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-300/30 rounded-lg"
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
          className="mt-6 p-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-300/30 rounded-lg"
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
