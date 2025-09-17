"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '../../_stores/hooks';
import { db } from '../../../firebase-config';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { useTranslations, useLocale } from 'next-intl';
import Icon from '../../_components/Icon';
import { 
  mdiArrowLeft, 
  mdiDownload, 
  mdiReceipt,
  mdiReceiptTextCheck,
  mdiCash,
  mdiQrcode,
  mdiLoading
} from '@mdi/js';
import { Transaction } from '../../dashboard/pos-student/types';
import html2canvas from 'html2canvas-pro';
import { toast } from 'sonner';
import { Transition } from '@headlessui/react';

const PaymentHistoryPage = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showShareButton, setShowShareButton] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [studentDetails, setStudentDetails] = useState<{[key: string]: {nameKhmer?: string, fullName?: string, studentName: string}}>({});
  
  const router = useRouter();
  const studentDocId = useAppSelector((state) => state.main.studentDocId);
  const t = useTranslations('payment');
  const tPayments = useTranslations('payments');
  const tReceipt = useTranslations('receipt');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const receiptRef = useRef<HTMLDivElement>(null);

  // Centralized khmer font utility
  const khmerFont = (additionalClasses: string = '') => {
    const baseClasses = locale === 'kh' ? 'khmer-font' : '';
    return additionalClasses ? `${baseClasses} ${additionalClasses}`.trim() : baseClasses;
  };

  // Function to fetch student details for a transaction
  const fetchStudentDetails = async (studentId: string) => {
    if (studentDetails[studentId]) return; // Already fetched
    
    try {
      const studentRef = doc(db, 'students', studentId);
      const studentSnap = await getDoc(studentRef);
      
      if (studentSnap.exists()) {
        const studentData = studentSnap.data();
        setStudentDetails(prev => ({
          ...prev,
          [studentId]: {
            nameKhmer: studentData.nameKhmer,
            fullName: studentData.fullName,
            studentName: studentData.fullName || studentData.nameKhmer || 'Unknown Student'
          }
        }));
      }
    } catch (error) {
      console.error('Error fetching student details:', error);
    }
  };

  // Function to translate subject names
  const translateSubject = (subject: string) => {
    const subjectKey = subject.toLowerCase();
    try {
      return tReceipt(`subjects.${subjectKey}`);
    } catch {
      return subject; // Fallback to original subject name if translation not found
    }
  };

  // Function to translate month names
  const translateMonth = (month: string) => {
    // Extract month name and year from strings like "September 2025"
    const parts = month.split(' ');
    const monthName = parts[0].toLowerCase();
    const year = parts[1] || '';
    
    try {
      const translatedMonth = t(`months.${monthName}`);
      return year ? `${translatedMonth} ${year}` : translatedMonth;
    } catch {
      return month; // Fallback to original month name if translation not found
    }
  };

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!studentDocId) {
        setError('Student not found');
        setLoading(false);
        return;
      }

      try {
        const transactionsRef = collection(db, 'transactions');
        const q = query(
          transactionsRef,
          where('studentId', '==', studentDocId),
          orderBy('date', 'desc')
        );

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
          const transactionData: Transaction[] = [];
          querySnapshot.forEach((doc) => {
            transactionData.push({ id: doc.id, ...doc.data() } as unknown as Transaction);
          });
          
          // Fetch student details for each unique student
          const uniqueStudentIds = [...new Set(transactionData.map(t => t.studentId))];
          uniqueStudentIds.forEach(studentId => {
            if (studentId) fetchStudentDetails(studentId);
          });
          
          setTransactions(transactionData);
          setLoading(false);
        }, (error) => {
          console.error('Error fetching transactions:', error);
          setError('Failed to load payment history');
          setLoading(false);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('Error setting up transaction listener:', error);
        setError('Failed to connect to payment service');
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [studentDocId]);

  useEffect(() => {
    // Check if the user is on an iOS device
    const iosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iosDevice);
    
    // We don't need a separate share button state anymore since we'll handle it in the download button
    setShowShareButton(false);
  }, []);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString(locale === 'kh' ? 'km-KH' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString(locale === 'kh' ? 'km-KH' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const handleTransactionClick = async (receiptNumber: string) => {
    try {
      // Find the transaction by receipt number from the already loaded transactions
      const transaction = transactions.find(t => t.receiptNumber === receiptNumber);
      if (transaction) {
        setSelectedTransaction(transaction);
        setShowReceiptModal(true);
      }
    } catch (error) {
      console.error('Error loading transaction:', error);
      toast.error('Failed to load receipt details');
    }
  };

  const handleSaveReceipt = async () => {
    if (!receiptRef.current || !selectedTransaction) return;

    setIsSaving(true);
    try {
      // A small delay can help ensure the UI is updated before the heavy canvas operation
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        ignoreElements: (element) => {
          // This class is on the container for the action buttons
          return element.classList.contains('receipt-actions');
        }
      });

      // Use the download link method for all devices, as it provides a better
      // user experience on modern iOS than opening a new tab.
      const link = document.createElement('a');
      link.download = `receipt-${selectedTransaction.receiptNumber}.png`;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(tReceipt('downloadSuccess'));

    } catch (error) {
      console.error('Error saving receipt:', error);
      toast.error(tReceipt('downloadError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleShareReceipt = async () => {
    if (!receiptRef.current || !selectedTransaction) return;

    setIsSaving(true);
    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        ignoreElements: (element) => element.classList.contains('receipt-actions'),
      });

      const dataUrl = canvas.toDataURL('image/png');
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `receipt-${selectedTransaction.receiptNumber}.png`, {
        type: 'image/png',
      });

      const shareData: ShareData = {
        title: tReceipt('receiptTitle', { receiptNumber: selectedTransaction.receiptNumber }),
        text: tReceipt('receiptText'),
      };

      // Check if files can be shared
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        shareData.files = [file];
      }

      if (navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        toast.success(tReceipt('shareSuccess'));
      } else {
        toast.error(tReceipt('shareNotSupported'));
      }
    } catch (error) {
      if ((error as DOMException).name !== 'AbortError') {
        console.error('Error sharing receipt:', error);
        toast.error(tReceipt('shareError'));
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadOrShare = async () => {
    if (isIOS && navigator.share) {
      // On iOS, use the share API
      await handleShareReceipt();
    } else {
      // On other devices, use direct download
      await handleSaveReceipt();
    }
  };

  const closeModal = () => {
    setShowReceiptModal(false);
    // Add a slight delay to allow the slide-down animation to complete before clearing the selected transaction
    setTimeout(() => {
      setSelectedTransaction(null);
    }, 300);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <Icon path={mdiLoading} size="24" className="text-blue-500 animate-spin" />
          <p className={`text-gray-500 dark:text-gray-400 ${khmerFont()}`}>{t('loadingPayments')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="mb-4">
            <Icon path={mdiReceipt} size="48" className="mx-auto text-gray-300 dark:text-gray-600" />
          </div>
          <h2 className={`text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2 ${khmerFont()}`}>
            {tCommon('error')}
          </h2>
          <p className={`text-gray-500 dark:text-gray-400 mb-4 ${khmerFont()}`}>{error}</p>
          <button
            onClick={() => router.back()}
            className={`bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors ${khmerFont()}`}
          >
            {tCommon('back')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen">
        {/* Custom Animated Header */}
        <div className="relative">
          {/* Background with gradient and animation */}
          <div className="bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 relative overflow-hidden">
            {/* Animated background pattern */}
            <div className="absolute inset-0">
              <div className="absolute top-0 left-0 w-40 h-40 bg-white/10 rounded-full -translate-x-20 -translate-y-20 animate-pulse"></div>
              <div className="absolute top-20 right-10 w-32 h-32 bg-white/5 rounded-full animate-bounce"></div>
              <div className="absolute bottom-10 left-20 w-24 h-24 bg-white/10 rounded-full animate-pulse"></div>
            </div>
            
            {/* Header content */}
            <div className="relative px-4 py-6">
              <div className="flex items-center space-x-4 mb-4">
                <button
                  onClick={() => router.back()}
                  className="p-3 bg-white/20 backdrop-blur-sm hover:bg-white/30 rounded-full transition-all duration-300 transform hover:scale-105"
                >
                  <Icon path={mdiArrowLeft} size="24" className="text-white" />
                </button>
                <div className="flex-1">
                  <h1 className={`text-2xl font-bold text-white mb-1 ${khmerFont()}`}>
                    {t('paymentHistoryTitle')}
                  </h1>
                </div>
              </div>
              
              {/* Stats card */}
              <div className="bg-white/15 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <Icon path={mdiReceiptTextCheck} size="24" className="text-white" />
                    </div>
                    <div>
                      <p className={`text-white/90 text-sm ${khmerFont()}`}>
                        {tPayments('totalReceipts')}
                      </p>
                      <p className={`text-2xl font-bold text-white ${khmerFont()}`}>
                        {transactions.length}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-white/90 text-sm ${khmerFont()}`}>
                      {transactions.length === 1 ? tPayments('receipt') : tPayments('receipts')} {tPayments('found')}
                    </p>
                    <div className="flex items-center space-x-1 mt-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className={`text-xs text-white/80 ${khmerFont()}`}>
                        {tPayments('upToDate')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Bottom wave decoration */}
            <div className="absolute bottom-0 left-0 right-0">
              <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-6 fill-gray-50 dark:fill-slate-900">
                <path d="M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86A600.21,600.21,0,0,1,0,27.35V120H1200V95.8C1132.19,118.92,1055.71,111.31,985.66,92.83Z"></path>
              </svg>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-6 pb-20 -mt-2">
          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <div className="mb-4">
                <Icon path={mdiReceipt} size="64" className="mx-auto text-gray-300 dark:text-gray-600" />
              </div>
              <h2 className={`text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2 ${khmerFont()}`}>
                {t('noPaymentsTitle')}
              </h2>
              <p className={`text-gray-500 dark:text-gray-400 px-4 ${khmerFont()}`}>
                {t('noPaymentsDescription')}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction, index) => (
                <div
                  key={`${transaction.receiptNumber}-${index}`}
                  onClick={() => handleTransactionClick(transaction.receiptNumber)}
                  className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-100 dark:border-slate-700 hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-700 transition-all cursor-pointer active:scale-[0.98] transform hover:scale-[1.02]"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md">
                        <Icon 
                          path={transaction.paymentMethod === 'Cash' ? mdiCash : mdiQrcode} 
                          size="24" 
                          className="text-white" 
                        />
                      </div>
                      <div>
                        <h3 className={`font-bold text-gray-900 dark:text-white text-lg ${khmerFont()}`}>
                          {translateMonth(transaction.paymentMonth)}
                        </h3>
                        <p className={`text-sm text-gray-500 dark:text-gray-400 ${khmerFont()}`}>
                          {formatDate(transaction.date)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xl font-bold text-green-600 dark:text-green-400 ${khmerFont()}`}>
                        ${transaction.amount.toFixed(2)}
                      </div>
                      <div className={`text-xs text-gray-500 dark:text-gray-400 ${khmerFont()}`}>
                        {transaction.paymentMethod === 'Cash' ? t('cashPayment') : t('qrPayment')}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-slate-700">
                    <div className="flex items-center space-x-2">
                      <Icon path={mdiReceipt} size="16" className="text-gray-400" />
                      <span className={`text-sm text-gray-500 dark:text-gray-400 ${khmerFont()}`}>
                        #{transaction.receiptNumber}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {transaction.subjects && transaction.subjects.slice(0, 2).map((subject, index) => (
                        <span 
                          key={index}
                          className={`inline-block bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 text-xs px-2 py-1 rounded-full ${khmerFont()}`}
                        >
                          {translateSubject(subject)}
                        </span>
                      ))}
                      {transaction.subjects && transaction.subjects.length >= 3 && (
                        <>
                          {/* 3rd subject - hidden on mobile, visible on sm and up */}
                          <span 
                            className={`hidden sm:inline-block bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 text-xs px-2 py-1 rounded-full ${khmerFont()}`}
                          >
                            {translateSubject(transaction.subjects[2])}
                          </span>
                          {/* +X more - show on mobile when > 2, show on sm+ when > 3 */}
                          {transaction.subjects.length > 3 && (
                            <span className={`inline-block sm:hidden text-gray-500 dark:text-gray-400 text-xs px-1 ${khmerFont()}`}>
                              +{transaction.subjects.length - 2}
                            </span>
                          )}
                          {transaction.subjects.length > 3 && (
                            <span className={`hidden sm:inline-block text-gray-500 dark:text-gray-400 text-xs px-1 ${khmerFont()}`}>
                              +{transaction.subjects.length - 3}
                            </span>
                          )}
                        </>
                      )}
                      {/* Show +X more on mobile when exactly 3 subjects */}
                      {transaction.subjects && transaction.subjects.length === 3 && (
                        <span className={`inline-block sm:hidden text-gray-500 dark:text-gray-400 text-xs px-1 ${khmerFont()}`}>
                          +1
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Receipt Modal with Blurred Background */}
      <div 
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ease-out ${showReceiptModal ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
      >
        <Transition
          show={showReceiptModal}
          as={React.Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              <Transition.Child
                as={React.Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                  <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={closeModal}></div>
                </div>
              </Transition.Child>

              {/* This element is to trick the browser into centering the modal contents. */}
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

              <Transition.Child
                as={React.Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              >
                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-sm sm:w-full">
                  {selectedTransaction && (
                    <div ref={receiptRef}>
                      {/* School Logo and Header */}
                      <div className="relative px-4 py-2 bg-white border-b-2 border-dashed border-gray-300">
                        <div className="relative text-center">
                          <div className="mb-2 flex justify-center">
                            <div className="w-24 h-24 rounded-full p-1">
                              <img 
                                src="/rodwell_logo.png" 
                                alt="Rodwell Learning Center" 
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const fallback = target.nextElementSibling as HTMLElement;
                                  if (fallback) {
                                    fallback.style.display = 'flex';
                                  }
                                }}
                              />
                              <div className="w-full h-full items-center justify-center bg-gray-100 rounded-full" style={{ display: 'none' }}>
                                <Icon path={mdiReceipt} size="32" className="text-gray-600" />
                              </div>
                            </div>
                          </div>
                          <h2 className={`text-lg font-bold mb-1 tracking-wide text-gray-800 ${khmerFont()}`}>
                            {tReceipt('schoolName')}
                          </h2>
                          <p className={`text-gray-600 text-sm font-medium ${khmerFont()}`}>
                            {tReceipt('receiptTitle')}
                          </p>
                        </div>
                      </div>

                      {/* Receipt Body */}
                      <div className="p-6 space-y-4">
                        {/* Receipt Details - Minimal Style */}
                          <div className="flex flex-col space-y-3">
                            <div className="flex items-center justify-between">
                              <span className={`text-sm font-semibold text-gray-600 ${khmerFont()}`}>
                                {tReceipt('receiptNumber')}:
                              </span>
                              <span className={`text-sm font-bold text-gray-900 ${khmerFont()}`}>
                                {selectedTransaction.receiptNumber}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className={`text-sm font-semibold text-gray-600 ${khmerFont()}`}>
                                {tReceipt('student')}:
                              </span>
                              <span className={`text-sm font-bold text-gray-900 ${khmerFont()}`}>
                                {(() => {
                                  const studentDetail = studentDetails[selectedTransaction.studentId];
                                  const nameKhmer = studentDetail?.nameKhmer;
                                  const fullName = studentDetail?.fullName;
                                  const studentName = selectedTransaction.studentName;

                                  return locale === 'kh' 
                                    ? (nameKhmer || fullName || studentName)
                                    : (fullName || studentName);
                                })()}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className={`text-sm font-semibold text-gray-600 ${khmerFont()}`}>
                                {tReceipt('class')}:
                              </span>
                              <span className={`text-sm font-bold text-gray-900 ${khmerFont()}`}>
                                {selectedTransaction.className.replace('Class', tReceipt('class'))}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className={`text-sm font-semibold text-gray-600 ${khmerFont()}`}>
                                {tReceipt('paymentFor')}:
                              </span>
                              <span className={`text-sm font-bold text-gray-900 ${khmerFont()}`}>
                                {translateMonth(selectedTransaction.paymentMonth)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className={`text-sm font-semibold text-gray-600 ${khmerFont()}`}>
                                {tReceipt('date')}:
                              </span>
                              <span className={`text-sm font-bold text-gray-900 ${khmerFont()}`}>
                                {formatDate(selectedTransaction.date)} {formatTime(selectedTransaction.date)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className={`text-sm font-semibold text-gray-600 ${khmerFont()}`}>
                                {tReceipt('paymentMethod')}:
                              </span>
                              <span className={`text-sm font-bold text-gray-900 ${khmerFont()}`}>
                                {selectedTransaction.paymentMethod === 'Cash' ? t('cashPayment') : t('qrPayment')}
                              </span>
                            </div>
                          </div>

                        {/* Subjects */}
                        {selectedTransaction.subjects && selectedTransaction.subjects.length > 0 && (
                          <div className="border-t border-dashed border-gray-300 pt-2">
                            <p className={`text-xs text-gray-600 uppercase tracking-wide font-semibold mb-2 ${khmerFont()}`}>
                              {tReceipt('subjectsIncluded')}
                            </p>
                            <div className="text-sm text-gray-700 font-medium">
                              {selectedTransaction.subjects.map(subject => translateSubject(subject)).join(', ')}
                            </div>
                          </div>
                        )}

                        {/* Thank You Message */}
                        <div className="text-center">
                          <p className={`text-lg font-semibold text-gray-800 ${khmerFont()}`}>
                            {tReceipt('thankYou')}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Action Buttons */}
                  <div className="receipt-actions bg-gray-50 px-6 py-5 border-t border-gray-200">
                    <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                      <button
                        onClick={handleDownloadOrShare}
                        disabled={isSaving}
                        className="flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
                      >
                        <Icon path={isSaving ? mdiLoading : mdiDownload} size="18" className={`mr-2 ${isSaving ? 'animate-spin' : ''}`} />
                        {isSaving ? tReceipt('saving') : tReceipt('download')}
                      </button>
                      <button
                        type="button"
                        onClick={closeModal}
                        className="flex items-center justify-center px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200"
                      >
                        {tCommon('close')}
                      </button>
                    </div>
                  </div>
                </div>
              </Transition.Child>
            </div>
          </div>
        </Transition>
      </div>
    </>
  );
};

export default PaymentHistoryPage;
