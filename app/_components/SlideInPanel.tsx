"use client";

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from './Icon';
import { mdiClose } from '@mdi/js';
import { useAppDispatch } from '../_stores/hooks';
import { setBottomNavVisible } from '../_stores/mainSlice';

interface SlideInPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const SlideInPanel: React.FC<SlideInPanelProps> = ({ isOpen, onClose, title, children }) => {
  const dispatch = useAppDispatch();
  const panelVariants = {
    hidden: { y: '100%' },
    visible: { y: '0%' },
  };

  useEffect(() => {
    if (isOpen) {
      dispatch(setBottomNavVisible(false));
    } else {
      // Add a small delay to allow the panel to animate out before the nav appears
      const timer = setTimeout(() => {
        dispatch(setBottomNavVisible(true));
      }, 300); // This duration should ideally match your exit animation
      return () => clearTimeout(timer);
    }
  }, [isOpen, dispatch]);


  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}
            className="fixed inset-0 bg-opacity-50 z-40"
            onClick={onClose}
          />
          <motion.div
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={panelVariants}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 rounded-t-2xl shadow-xl border border-gray-100 dark:border-slate-700 z-50"
            style={{ maxHeight: '90vh' }}
          >
            <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
              <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-white transition-colors">
                <Icon path={mdiClose} size={24} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto bg-gray-50 dark:bg-slate-900/50" style={{ maxHeight: 'calc(90vh - 80px)' }}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SlideInPanel; 