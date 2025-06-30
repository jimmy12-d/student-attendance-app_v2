"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from './Icon';
import { mdiClose } from '@mdi/js';

interface SlideInPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const SlideInPanel: React.FC<SlideInPanelProps> = ({ isOpen, onClose, title, children }) => {
  const panelVariants = {
    hidden: { y: '100%' },
    visible: { y: '0%' },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
            className="fixed inset-0 bg-opacity-50 z-40"
            onClick={onClose}
          />
          <motion.div
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={panelVariants}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 bg-slate-800 rounded-t-2xl shadow-lg z-50"
            style={{ maxHeight: '90vh' }}
          >
            <div className="p-4 border-b border-slate-700 flex justify-between items-center">
              <h2 className="text-xl font-bold">{title}</h2>
              <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-700">
                <Icon path={mdiClose} size={24} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SlideInPanel; 