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
  mdiShare, 
  mdiReceipt,
  mdiCalendar,
  mdiCurrencyUsd,
  mdiAccount,
  mdiSchool,
  mdiCash,
  mdiQrcode,
  mdiClose,
  mdiLoading
} from '@mdi/js';
import { Transaction } from '../../dashboard/pos-student/types';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';

const PaymentHistoryPage = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  
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

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString(locale === 'kh' ? 'km-KH' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatFullDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString(locale === 'kh' ? 'km-KH' : 'en-US', {
      year: 'numeric',
      month: 'long',
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

  const handleDownloadReceipt = async () => {
    if (!receiptRef.current || !selectedTransaction) return;

    setIsDownloading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          const allElements = clonedDoc.querySelectorAll('*');
          allElements.forEach((el) => {
            const element = el as HTMLElement;
            const style = window.getComputedStyle(element);

            const colorProps = ['color', 'backgroundColor', 'borderColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor'];
            colorProps.forEach(prop => {
              const value = style.getPropertyValue(prop);
              if (value.includes('oklch')) {
                // Force a safe, non-oklch color
                if (prop.includes('Color')) {
                  element.style.setProperty(prop, 'black', 'important');
                } else if (prop.includes('background')) {
                  element.style.setProperty(prop, 'white', 'important');
                }
              }
            });

            // Also check inline style attribute
            if (element.getAttribute('style')?.includes('oklch')) {
              element.setAttribute('style', element.getAttribute('style')!.replace(/oklch\([^)]+\)/g, 'black'));
            }
          });
        }
      });

      const link = document.createElement('a');
      link.download = `receipt-${selectedTransaction.receiptNumber}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();

      toast.success(tReceipt('downloadSuccess'));
    } catch (error) {
      console.error('Error downloading receipt:', error);
      toast.error(tReceipt('downloadError'));
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShareReceipt = async () => {
    if (!receiptRef.current || !selectedTransaction) return;

    setIsSharing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          const allElements = clonedDoc.querySelectorAll('*');
          allElements.forEach((el) => {
            const element = el as HTMLElement;
            const style = window.getComputedStyle(element);

            const colorProps = ['color', 'backgroundColor', 'borderColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor'];
            colorProps.forEach(prop => {
              const value = style.getPropertyValue(prop);
              if (value.includes('oklch')) {
                // Force a safe, non-oklch color
                if (prop.includes('Color')) {
                  element.style.setProperty(prop, 'black', 'important');
                } else if (prop.includes('background')) {
                  element.style.setProperty(prop, 'white', 'important');
                }
              }
            });

            // Also check inline style attribute
            if (element.getAttribute('style')?.includes('oklch')) {
              element.setAttribute('style', element.getAttribute('style')!.replace(/oklch\([^)]+\)/g, 'black'));
            }
          });
        }
      });

      canvas.toBlob(async (blob) => {
        if (!blob) {
          toast.error(tReceipt('shareError'));
          setIsSharing(false);
          return;
        }

        if (navigator.share && navigator.canShare) {
          const file = new File([blob], `receipt-${selectedTransaction.receiptNumber}.png`, {
            type: 'image/png',
          });

          if (navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({
                title: `Payment Receipt - ${selectedTransaction.receiptNumber}`,
                text: `Payment receipt for ${selectedTransaction.paymentMonth}`,
                files: [file],
              });
              toast.success(tReceipt('shareSuccess'));
            } catch (error: any) {
              if (error.name !== 'AbortError') {
                throw error;
              }
            }
          } else {
            // Fallback for browsers that support Web Share API but not file sharing
            if (navigator.clipboard) {
              await navigator.clipboard.write([
                new ClipboardItem({
                  'image/png': blob
                })
              ]);
              toast.success(tReceipt('clipboardSuccess'));
            } else {
              toast.error(tReceipt('shareNotSupported'));
            }
          }
        } else {
          // Fallback for browsers without Web Share API
          if (navigator.clipboard) {
            await navigator.clipboard.write([
              new ClipboardItem({
                'image/png': blob
              })
            ]);
            toast.success(tReceipt('clipboardSuccess'));
          } else {
            toast.error(tReceipt('shareNotSupported'));
          }
        }
      }, 'image/png');
    } catch (error) {
      console.error('Error sharing receipt:', error);
      toast.error(tReceipt('shareError'));
    } finally {
      setIsSharing(false);
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
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
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
                      <Icon path={mdiReceipt} size="24" className="text-white" />
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
                          {transaction.paymentMonth}
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
                      {transaction.subjects && transaction.subjects.slice(0, 3).map((subject, index) => (
                        <span 
                          key={index}
                          className={`inline-block bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 text-xs px-2 py-1 rounded-full ${khmerFont()}`}
                        >
                          {subject}
                        </span>
                      ))}
                      {transaction.subjects && transaction.subjects.length > 3 && (
                        <span className={`inline-block text-gray-500 dark:text-gray-400 text-xs px-1 ${khmerFont()}`}>
                          +{transaction.subjects.length - 3}
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
        {/* Blurred Backdrop */}
        <div
          className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-all duration-300 ease-out ${showReceiptModal ? 'opacity-100' : 'opacity-0'}`}
          onClick={closeModal}
        />
        
        {/* Receipt Content */}
        <div 
          className={`relative w-full max-w-sm transition-all duration-500 ease-out transform ${showReceiptModal ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-8 scale-95 opacity-0'}`}
        >
          {selectedTransaction && (
            <div className="relative">
              {/* Close Button - Floating */}
              <div className="absolute -top-3 -right-3 z-10">
                <button
                  onClick={closeModal}
                  className="p-2 bg-gray-800 hover:bg-gray-700 text-white rounded-full transition-colors shadow-lg border-2 border-white"
                >
                  <Icon path={mdiClose} size="18" className="text-white" />
                </button>
              </div>

              {/* Paper-style Receipt Container */}
              <div 
                ref={receiptRef} 
                className="bg-white shadow-2xl rounded-t-lg overflow-hidden border-t border-x border-gray-200"
                style={{
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                  boxShadow: '0 -25px 50px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05)',
                  maxHeight: '90vh'
                }}
              >
                {/* School Logo and Header */}
                <div className="relative px-4 py-2 bg-white border-b-2 border-dashed border-gray-300">
                  {/* Paper texture overlay */}
                  <div 
                    className="absolute inset-0 opacity-5"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='0.03'%3E%3Cpath d='m0 40l40-40h-40v40zm40 0v-40h-40l40 40z'/%3E%3C/g%3E%3C/svg%3E")`
                    }}
                  />
                  <div className="relative text-center">
                    {/* School Logo */}
                    <div className="mb-2 flex justify-center">
                      <div className="w-24 h-24 rounded-full p-1">
                        <img 
                          src="/rodwell_logo.png" 
                          alt="Rodwell Learning Center" 
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            // Fallback to receipt icon if logo fails to load
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
                    <h2 className="text-lg font-bold mb-1 tracking-wide text-gray-800">RODWELL LEARNING CENTER</h2>
                    <p className="text-gray-600 text-sm font-medium">RECEIPT OF PAYMENT</p>

                  </div>
                </div>

                {/* Receipt Body - Scrollable */}
                <div className="overflow-y-auto max-h-[60vh] pb-4 p-6 space-y-4">
                  {/* Receipt Details - Minimal Style */}
                  <div className="bg-gray-50 rounded-xl">
                    <p className={`text-xs text-gray-600 uppercase tracking-wide font-semibold mb-3 ${khmerFont()}`}>
                      {tReceipt('receiptContent')}:
                    </p>
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
                          Student:
                        </span>
                        <span className={`text-sm font-bold text-gray-900 ${khmerFont()}`}>
                          {selectedTransaction.studentName}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-semibold text-gray-600 ${khmerFont()}`}>
                          Class:
                        </span>
                        <span className={`text-sm font-bold text-gray-900 ${khmerFont()}`}>
                          {selectedTransaction.className}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-semibold text-gray-600 ${khmerFont()}`}>
                          Payment For:
                        </span>
                        <span className={`text-sm font-bold text-gray-900 ${khmerFont()}`}>
                          {selectedTransaction.paymentMonth}
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
                          Payment Method:
                        </span>
                        <span className={`text-sm font-bold text-gray-900 ${khmerFont()}`}>
                          {selectedTransaction.paymentMethod === 'Cash' ? t('cashPayment') : t('qrPayment')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Subjects */}
                  {selectedTransaction.subjects && selectedTransaction.subjects.length > 0 && (
                    <div className="border-t border-dashed border-gray-300 pt-2">
                      <p className={`text-xs text-gray-600 uppercase tracking-wide font-semibold mb-2 ${khmerFont()}`}>
                        {tReceipt('subjectsIncluded')}
                      </p>
                      <div className="text-sm text-gray-700 font-medium">
                        {selectedTransaction.subjects.join(', ')}
                      </div>
                    </div>
                  )}

                  {/* Thank You Message */}
                  <div className="text-center">
                    <p className={`text-lg font-semibold text-gray-800 ${khmerFont()}`}>
                      {tReceipt('thankYou')}
                    </p>
                  </div>

                  {/* Action Buttons Section */}
                  <div className="border-t-2 border-dashed border-gray-300">
                    <div className="flex justify-around items-center text-center pt-2">
                      {/* Share Button */}
                      <button
                        onClick={handleShareReceipt}
                        disabled={isSharing}
                        className="flex flex-col items-center text-gray-600 hover:text-green-600 disabled:text-gray-400 transition-colors group"
                      >
                        <div className="w-10 h-10 bg-gray-100 group-hover:bg-green-100 rounded-full flex items-center justify-center transition-colors border-2 border-gray-200 group-hover:border-green-300">
                          <Icon path={mdiShare} size="20" className="text-gray-500 group-hover:text-green-600 transition-colors" />
                        </div>
                        <span className={`text-sm font-medium ${khmerFont()}`}>
                          {isSharing ? 'Sharing...' : 'Share'}
                        </span>
                      </button>

                      {/* Download Button */}
                      <button
                        onClick={handleDownloadReceipt}
                        disabled={isDownloading}
                        className="flex flex-col items-center text-gray-600 hover:text-blue-600 disabled:text-gray-400 transition-colors group"
                      >
                        <div className="w-10 h-10 bg-gray-100 group-hover:bg-blue-100 rounded-full flex items-center justify-center transition-colors border-2 border-gray-200 group-hover:border-blue-300">
                          <Icon path={mdiDownload} size="20" className="text-gray-500 group-hover:text-blue-600 transition-colors" />
                        </div>
                        <span className={`text-sm font-medium ${khmerFont()}`}>
                          {isDownloading ? 'Downloading...' : 'Download'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default PaymentHistoryPage;
