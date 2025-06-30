"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import StudentQRCode from './StudentQRCode';
import Icon from '../../_components/Icon';
import { mdiClose } from '@mdi/js';

interface QRCodeDisplayProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  studentUid: string;
}

const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ isOpen, onClose, studentName, studentUid }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
          className="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="relative bg-slate-800 px-6 pt-4 pb-6 rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-full hover:bg-slate-700">
              <Icon path={mdiClose} size={24} />
            </button>
            <div className="flex flex-col items-center pt-2">
              <h2 className="text-xl font-bold mb-2">Scan for Attendance</h2>
              <p className="text-gray-400 mb-4">Present this QR code to the administrator.</p>
              <StudentQRCode studentName={studentName} studentUid={studentUid} qrSize={256} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default QRCodeDisplay; 