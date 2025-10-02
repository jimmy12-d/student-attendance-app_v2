"use client";

import React, { useState } from 'react';
import { useAppSelector } from '@/app/_stores/hooks';
import { useLocale } from 'next-intl';
import { db } from '@/firebase-config';
import { doc, getDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import CardBoxModal from '@/app/_components/CardBox/Modal';

interface BirthdayViewerProps {
  isActive: boolean;
  onClose: () => void;
}

const BirthdayViewer: React.FC<BirthdayViewerProps> = ({ isActive, onClose }) => {
  const [birthday, setBirthday] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const locale = useLocale();
  const studentDocId = useAppSelector((state) => state.main.studentDocId);

  // Utility function for Khmer font styling
  const khmerFont = (additionalClasses = '') => {
    const baseClasses = locale === 'kh' ? 'khmer-font' : '';
    return additionalClasses ? `${baseClasses} ${additionalClasses}`.trim() : baseClasses;
  };

  const fetchBirthday = async () => {
    if (!studentDocId || hasFetched) return;

    setLoading(true);
    try {
      const studentRef = doc(db, 'students', studentDocId);
      const studentSnap = await getDoc(studentRef);

      if (studentSnap.exists()) {
        const studentData = studentSnap.data();
        setBirthday(studentData.dateOfBirth || null);
      }
    } catch (error) {
      console.error('Error fetching birthday:', error);
    } finally {
      setLoading(false);
      setHasFetched(true);
    }
  };

  React.useEffect(() => {
    if (isActive && !hasFetched) {
      fetchBirthday();
    }
  }, [isActive, hasFetched]);

  const formatBirthday = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(locale === 'kh' ? 'en-US' : locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      });
    } catch {
      return dateString;
    }
  };

  const getAge = (dateString: string) => {
    try {
      const birthDate = new Date(dateString);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();

      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      return age;
    } catch {
      return null;
    }
  };

  return (
    <CardBoxModal
      title="🎂 Your Date of Birth"
      buttonColor="info"
      buttonLabel="Close"
      isActive={isActive}
      onConfirm={onClose}
      modalClassName="py-4"
    >
      <div className={khmerFont('text-center')}>
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex flex-col items-center justify-center py-12"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-12 h-12 border-4 border-pink-200 border-t-pink-500 rounded-full mb-4"
              />
              <p className="text-gray-600 dark:text-gray-300 font-medium">
                Fetching your birthday...
              </p>
            </motion.div>
          ) : birthday ? (
            <motion.div
              key="birthday"
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="pt-8"
            >
              {/* Birthday Cake Animation */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="text-6xl mb-6"
              >
                🎂
              </motion.div>

              {/* Birthday Date */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mb-4"
              >
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {formatBirthday(birthday)}
                </h3>
                {getAge(birthday) !== null && (
                  <p className="text-lg text-pink-600 dark:text-pink-400 font-medium">
                    You are {getAge(birthday)} years old! 🎉
                  </p>
                )}
              </motion.div>

              {/* Decorative Elements */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="flex justify-center space-x-2 mb-6"
              >
                {['🎈', '🎁', '⭐', '🎈'].map((emoji, index) => (
                  <motion.span
                    key={index}
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{
                      delay: 0.8 + index * 0.1,
                      type: "spring",
                      stiffness: 300
                    }}
                    className="text-2xl"
                  >
                    {emoji}
                  </motion.span>
                ))}
              </motion.div>

              {/* Info Text */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-800/50 rounded-lg px-4 py-3"
              >
                This is your registered date of birth in our system.
                <br />
                Happy Birthday when it comes around! 🎊
              </motion.p>
            </motion.div>
          ) : (
            <motion.div
              key="no-birthday"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="py-12"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="text-6xl mb-6"
              >
                ❓
              </motion.div>

              <motion.h3
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-xl font-semibold text-gray-900 dark:text-white mb-4"
              >
                No Birthday Found
              </motion.h3>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-gray-600 dark:text-gray-300 mb-6 max-w-sm mx-auto"
              >
                We couldn't find your date of birth in our records.
                Please contact your administrator or teacher to update this information.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="flex justify-center"
              >
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-full px-4 py-2">
                  <span className="text-blue-600 dark:text-blue-400 text-sm font-medium">
                    📞 Contact Support
                  </span>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </CardBoxModal>
  );
};

export default BirthdayViewer;