'use client'

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import QRCode from 'qrcode';
import { db } from '@/firebase-config';
import { doc, onSnapshot } from 'firebase/firestore';

interface QRAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentUid: string;
  studentName: string;
  onSuccess?: () => void;
}

const QRAttendanceModal: React.FC<QRAttendanceModalProps> = ({
  isOpen,
  onClose,
  studentUid,
  studentName,
  onSuccess
}) => {
  const t = useTranslations('student.attendance.qrModal');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [token, setToken] = useState<string>('');
  const [timeRemaining, setTimeRemaining] = useState<number>(15); // 15 seconds
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [errorType, setErrorType] = useState<string>('');
  const [isScanned, setIsScanned] = useState<boolean>(false);
  const [scanSuccess, setScanSuccess] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [autoRetrying, setAutoRetrying] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(true);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // If we were offline and now back online, and there's an error, suggest retry
      if (error && errorType === 'NETWORK_ERROR') {
        console.log('✅ Network connection restored');
      }
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      console.log('⚠️ Network connection lost');
    };

    setIsOnline(navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [error, errorType]);

  // Generate QR code when modal opens
  useEffect(() => {
    if (isOpen) {
      generateQRCode();
    } else {
      // Reset state when modal closes
      setQrCodeDataUrl('');
      setToken('');
      setTimeRemaining(15);
      setIsExpired(false);
      setError('');
      setErrorType('');
      setIsScanned(false);
      setScanSuccess(false);
      setRetryCount(0);
      setAutoRetrying(false);
    }
  }, [isOpen]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen || isExpired || timeRemaining <= 0 || isScanned) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setIsExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, isExpired, timeRemaining, isScanned]);

  // Real-time listener for token status (when scanned)
  useEffect(() => {
    if (!isOpen || !token) return;

    // Listen to the token document for changes
    const tokenDocRef = doc(db, 'tempAttendanceTokens', token);
    const unsubscribe = onSnapshot(tokenDocRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        
        // Check if token has been used (scanned)
        if (data.used === true) {
          setIsScanned(true);
          setScanSuccess(true);
          
          // Auto-close modal after 2 seconds on success
          setTimeout(() => {
            if (onSuccess) {
              onSuccess();
            }
            onClose();
          }, 2000);
        }
      }
    }, (error) => {
      console.error('Error listening to token status:', error);
    });

    return () => unsubscribe();
  }, [isOpen, token, onSuccess, onClose]);

  const generateQRCode = async (isRetry: boolean = false) => {
    // Check if offline before attempting
    if (!navigator.onLine) {
      setError('No internet connection. Please check your network and try again.');
      setErrorType('NETWORK_ERROR');
      setIsGenerating(false);
      return;
    }

    setIsGenerating(true);
    setError('');
    setErrorType('');
    setIsExpired(false);
    setTimeRemaining(15);

    if (!isRetry) {
      setRetryCount(0);
    }

    try {
      console.log('🎯 Generating QR code for student:', { studentUid, studentName });

      // Call Cloud Function to generate temporary attendance token
      const response = await fetch('/api/generate-attendance-qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentUid,
          studentName
        }),
      });

      console.log('📡 API response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ API error:', errorData);
        
        // Store error details for better messaging
        setErrorType(errorData.errorType || 'UNKNOWN_ERROR');
        
        // Determine if we should auto-retry
        const isNetworkError = errorData.errorType === 'NETWORK_ERROR' || 
                               errorData.errorType === 'CONNECTION_ERROR';
        
        if (isNetworkError && retryCount < 2) {
          // Auto-retry for network errors (up to 2 retries)
          setAutoRetrying(true);
          const retryDelay = 2000 * (retryCount + 1); // 2s, 4s
          console.log(`⏳ Auto-retrying in ${retryDelay}ms...`);
          
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
            setAutoRetrying(false);
            generateQRCode(true);
          }, retryDelay);
          
          return;
        }
        
        throw new Error(errorData.error || 'Failed to generate QR code');
      }

      const data = await response.json();
      console.log('✅ Token generated:', data.token);
      
      const generatedToken = data.token;
      setToken(generatedToken);

      // Generate QR code with the token
      // Format: ATTENDANCE:{token}:{studentUid}
      const qrData = `ATTENDANCE:${generatedToken}:${studentUid}`;
      const qrDataUrl = await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      setQrCodeDataUrl(qrDataUrl);
      setRetryCount(0); // Reset retry count on success
      console.log('✅ QR code image generated');
    } catch (err: any) {
      console.error('❌ Error generating QR code:', err);
      
      // Provide user-friendly error messages
      let userMessage = 'Failed to generate QR code. Please try again.';
      
      if (errorType === 'NETWORK_ERROR') {
        userMessage = 'Network connection failed. Please check your internet connection and try again.';
      } else if (errorType === 'CONNECTION_ERROR') {
        userMessage = 'Unable to connect to the server. Please check your internet connection.';
      } else if (errorType === 'AUTH_ERROR') {
        userMessage = 'Authentication failed. Please try logging out and back in.';
      } else if (err.message?.includes('fetch')) {
        userMessage = 'Network request failed. Please check your connection and try again.';
        setErrorType('NETWORK_ERROR');
      }
      
      setError(userMessage);
    } finally {
      setIsGenerating(false);
      setAutoRetrying(false);
    }
  };

  const handleRegenerate = () => {
    generateQRCode();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 p-2 rounded-full">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3,11H5V13H3V11M11,5H13V9H11V5M9,11H13V15H11V13H9V11M15,11H17V13H19V11H21V13H19V15H21V19H19V21H17V19H13V21H11V17H15V15H17V13H15V11M19,19V15H17V19H19M15,3H21V9H15V3M17,5V7H19V5H17M3,3H9V9H3V3M5,5V7H7V5H5M3,15H9V21H3V15M5,17V19H7V17H5Z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{t('title')}</h2>
                <p className="text-white/80 text-sm">{t('subtitle')}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors p-2"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
              </svg>
            </button>
          </div>

          {/* Offline Warning Banner */}
          {!isOnline && (
            <div className="bg-orange-500 text-white px-4 py-3 flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z" />
              </svg>
              <div className="flex-1">
                <p className="font-semibold text-sm">No Internet Connection</p>
                <p className="text-xs text-white/90">QR code generation requires an active internet connection</p>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="p-6">
            {isScanned && scanSuccess ? (
              <div className="text-center py-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', duration: 0.5 }}
                  className="bg-green-100 dark:bg-green-900/20 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4"
                >
                  <svg className="w-12 h-12 text-green-600 dark:text-green-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M11,16.5L6.5,12L7.91,10.59L11,13.67L16.59,8.09L18,9.5L11,16.5Z" />
                  </svg>
                </motion.div>
                <h3 className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">
                  {t('success')}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {t('successMessage')}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  {t('closingMessage')}
                </p>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <div className="bg-red-100 dark:bg-red-900/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-600 dark:text-red-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-2">
                  {errorType === 'NETWORK_ERROR' || errorType === 'CONNECTION_ERROR' ? 'Connection Error' : 'Generation Failed'}
                </h3>
                <p className="text-gray-700 dark:text-gray-300 mb-2 px-4">{error}</p>
                {retryCount > 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Attempted {retryCount} {retryCount === 1 ? 'retry' : 'retries'}
                  </p>
                )}
                <div className="flex gap-3 justify-center mt-4 px-4">
                  <button
                    onClick={handleRegenerate}
                    className="px-6 py-2.5 bg-purple-500 text-white rounded-full hover:bg-purple-600 transition-colors font-semibold flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z" />
                    </svg>
                    {t('tryAgain')}
                  </button>
                  <button
                    onClick={onClose}
                    className="px-6 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-semibold"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : isGenerating ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-500 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400 font-medium">
                  {autoRetrying ? `Retrying... (Attempt ${retryCount + 1})` : t('generating')}
                </p>
                {autoRetrying && (
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                    Please wait, connection issue detected
                  </p>
                )}
              </div>
            ) : (
              <>
                {/* QR Code Display */}
                <div className={`relative bg-white rounded-2xl p-6 mb-6 ${isExpired ? 'opacity-50' : ''} ${isScanned ? 'opacity-30' : ''}`}>
                  {qrCodeDataUrl && (
                    <img
                      src={qrCodeDataUrl}
                      alt="Attendance QR Code"
                      className="w-full h-auto"
                    />
                  )}
                  
                  {/* Scanned Overlay */}
                  {isScanned && (
                    <div className="absolute inset-0 flex items-center justify-center bg-green-500/20 rounded-2xl backdrop-blur-sm">
                      <div className="text-center">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        >
                          <svg className="w-12 h-12 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M11,16.5L6.5,12L7.91,10.59L11,13.67L16.59,8.09L18,9.5L11,16.5Z" />
                          </svg>
                        </motion.div>
                        <p className="text-green-700 font-bold text-lg mt-2">{t('verifying')}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Expired Overlay */}
                  {isExpired && !isScanned && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-2xl">
                      <div className="text-center">
                        <svg className="w-12 h-12 text-red-400 mx-auto mb-2" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
                        </svg>
                        <p className="text-white font-bold text-lg">{t('expired')}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Timer Display - Progress Bar Only */}
                <div className="mb-6">
                  {!isScanned && (
                    <>
                      <div className="flex items-center justify-center space-x-2 mb-2">
                        <div className={`text-3xl font-bold ${
                          timeRemaining <= 5 
                            ? 'text-red-600 dark:text-red-400 animate-pulse' 
                            : 'text-purple-600 dark:text-purple-400'
                        }`}>
                          {timeRemaining}s
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                        <motion.div
                          className={`h-full ${
                            timeRemaining <= 5 ? 'bg-red-500' : 'bg-purple-500'
                          }`}
                          initial={{ width: '100%' }}
                          animate={{ width: `${(timeRemaining / 15) * 100}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                      <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-2">
                        {t('timeRemaining')}
                      </p>
                    </>
                  )}
                  {isScanned && (
                    <div className="text-center">
                      <div className="text-green-600 dark:text-green-400 font-semibold text-lg mb-1">
                        ✓ {t('codeScanned')}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t('verifying')}
                      </p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                {!isScanned && (
                  <div className="flex gap-3 mt-6">
                    {isExpired ? (
                      <button
                        onClick={handleRegenerate}
                        className="flex-1 px-6 py-3 bg-purple-500 text-white rounded-full hover:bg-purple-600 transition-colors font-semibold"
                      >
                        {t('generateNew')}
                      </button>
                    ) : (
                      <button
                        onClick={onClose}
                        className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-semibold"
                      >
                        {t('close')}
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default QRAttendanceModal;
