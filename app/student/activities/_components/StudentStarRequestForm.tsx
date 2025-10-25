"use client";

import React, { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useAppSelector } from '../../../_stores/hooks';
import { db } from '../../../../firebase-config';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { toast } from 'sonner';
import { mdiStar, mdiClose, mdiCheckCircle } from '@mdi/js';
import Icon from '@/app/_components/Icon';
import { StarReward, StarRequest } from '../../../_interfaces';

type Props = {
  availableRewards: StarReward[];
  studentClass?: string;
  studentShift?: string;
  onSuccess?: () => void;
};

export const StudentStarRequestForm = ({ availableRewards, studentClass, studentShift, onSuccess }: Props) => {
  const t = useTranslations('student.activities.starRewards.requestForm');
  const tValidation = useTranslations('student.activities.starRewards.validation');
  const tMessages = useTranslations('student.activities.starRewards.messages');
  const locale = useLocale();
  
  const studentDocId = useAppSelector((state) => state.main.studentDocId);
  const studentAuthUid = useAppSelector((state) => state.main.userUid);
  const userName = useAppSelector((state) => state.main.userName);

  const [claimCounts, setClaimCounts] = useState<Record<string, number>>({});
  const [requestStatuses, setRequestStatuses] = useState<Record<string, StarRequest>>({});
  const [selectedReward, setSelectedReward] = useState<StarReward | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch claim counts and request statuses for each reward
  useEffect(() => {
    const fetchClaimCountsAndRequests = async () => {
      if (!studentDocId || !studentAuthUid) return;

      const counts: Record<string, number> = {};
      const requests: Record<string, StarRequest> = {};
      
      for (const reward of availableRewards) {
        try {
          // Check claimed stars
          const claimedStarsQuery = query(
            collection(db, 'students', studentDocId, 'claimedStars'),
            where('starRewardId', '==', reward.id),
            where('authUid', '==', studentAuthUid)
          );
          const claimedSnapshot = await getDocs(claimedStarsQuery);
          counts[reward.id] = claimedSnapshot.size;

          // Check pending requests
          const requestsQuery = query(
            collection(db, 'starRequests'),
            where('studentId', '==', studentDocId),
            where('authUid', '==', studentAuthUid),
            where('starRewardId', '==', reward.id)
          );
          const requestsSnapshot = await getDocs(requestsQuery);
          
          // Get the most recent request
          if (!requestsSnapshot.empty) {
            const latestRequest = requestsSnapshot.docs[0];
            requests[reward.id] = {
              id: latestRequest.id,
              ...latestRequest.data()
            } as StarRequest;
          }
        } catch (error) {
          counts[reward.id] = 0;
        }
      }
      
      setClaimCounts(counts);
      setRequestStatuses(requests);
    };

    fetchClaimCountsAndRequests();
  }, [studentDocId, studentAuthUid, availableRewards]);

  const handleRewardClick = (reward: StarReward) => {
    const claimCount = claimCounts[reward.id] || 0;
    const requestStatus = requestStatuses[reward.id];
    
    // Check if already claimed
    if (claimCount >= 1) {
      toast.error(tMessages('rewardLimitReached'));
      return;
    }
    
    // Check if there's a pending request
    if (requestStatus && requestStatus.status === 'pending') {
      toast.info(locale === 'kh' ? 'សំណើររបស់អ្នកកំពុងរង់ចាំការពិនិត្យ' : 'Your request is pending review');
      return;
    }
    
    setSelectedReward(reward);
  };

  const handleConfirmRequest = async () => {
    if (!selectedReward || !studentDocId || !studentAuthUid) {
      toast.error(tMessages('notAuthenticated'));
      return;
    }

    setIsSubmitting(true);

    // Check if student has already claimed (limit once per student)
    const currentClaimCount = claimCounts[selectedReward.id] || 0;
    if (currentClaimCount >= 1) {
      toast.error(tMessages('rewardLimitReached'));
      setIsSubmitting(false);
      setSelectedReward(null);
      return;
    }

    const newStarRequest = {
      studentId: studentDocId,
      authUid: studentAuthUid,
      studentName: userName,
      studentClass: studentClass || '',
      studentShift: studentShift || '',
      starRewardId: selectedReward.id,
      starRewardName: selectedReward.name,
      starRewardColor: selectedReward.color,
      starRewardAmount: selectedReward.amount,
      reason: '', // No reason needed
      status: 'pending',
      requestedAt: serverTimestamp(),
    };

    const submissionPromise = addDoc(collection(db, 'starRequests'), newStarRequest);

    toast.promise(submissionPromise, {
      loading: t('submitting'),
      success: () => {
        setIsSubmitting(false);
        setSelectedReward(null);
        
        // Refresh the request statuses to show the new pending request
        const fetchRequests = async () => {
          const requestsQuery = query(
            collection(db, 'starRequests'),
            where('studentId', '==', studentDocId),
            where('authUid', '==', studentAuthUid),
            where('starRewardId', '==', selectedReward.id)
          );
          const requestsSnapshot = await getDocs(requestsQuery);
          if (!requestsSnapshot.empty) {
            const latestRequest = requestsSnapshot.docs[0];
            setRequestStatuses(prev => ({
              ...prev,
              [selectedReward.id]: {
                id: latestRequest.id,
                ...latestRequest.data()
              } as StarRequest
            }));
          }
        };
        fetchRequests();
        
        if (onSuccess) {
          onSuccess();
        }
        return tMessages('requestSuccess');
      },
      error: (err) => {
        setIsSubmitting(false);
        setSelectedReward(null);
        return tMessages('requestError');
      },
    });
  };

  const handleCancelRequest = () => {
    setSelectedReward(null);
  };

  const getColorClasses = (color: string) => {
    const colorMap: Record<string, { bg: string, text: string, border: string }> = {
      white: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-800 dark:text-gray-200', border: 'border-gray-300 dark:border-gray-600' },
      pink: { bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-800 dark:text-pink-300', border: 'border-pink-300 dark:border-pink-500' },
      yellow: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-300', border: 'border-yellow-300 dark:border-yellow-500' },
      orange: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-800 dark:text-orange-300', border: 'border-orange-300 dark:border-orange-500' },
      blue: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-800 dark:text-blue-300', border: 'border-blue-300 dark:border-blue-500' },
    };
    return colorMap[color] || colorMap.white;
  };

  return (
    <>
      <div className="space-y-3">
        {availableRewards.map((reward) => {
              const claimCount = claimCounts[reward.id] || 0;
              const requestStatus = requestStatuses[reward.id];
              const isApproved = claimCount >= 1;
              const isPending = requestStatus && requestStatus.status === 'pending';
              const isRejected = requestStatus && requestStatus.status === 'rejected';
              const isDisabled = isApproved || isPending;
              const colorClasses = getColorClasses(reward.color);
              
              // Determine status text and color
              let statusText = locale === 'kh' ? 'មិនទាន់ទាមទារ' : 'Not claimed';
              let statusColor = 'bg-gray-500';
              
              if (isApproved) {
                statusText = locale === 'kh' ? 'បានទាមទារ' : 'Claimed';
                statusColor = 'bg-green-500';
              } else if (isPending) {
                statusText = locale === 'kh' ? 'កំពុងពិនិត្យ' : 'Pending';
                statusColor = 'bg-yellow-500';
              } else if (isRejected) {
                statusText = locale === 'kh' ? 'បានបដិសេធ' : 'Rejected';
                statusColor = 'bg-red-500';
              }
              
              return (
                <button
                  key={reward.id}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleRewardClick(reward)}
                  className={`relative w-full transition-all duration-200 ${
                    isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'
                  }`}
                >
                  <div className={`relative overflow-hidden ${
                    isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'
                  }`}>
                    {/* Background overlay for active state */}
                    <div className={`absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-150 ${
                      !isDisabled && 'group-active:opacity-100'
                    } ${colorClasses.bg}`}></div>
                    
                    {/* Main Card Content */}
                    <div className={`relative w-full bg-white dark:bg-slate-800 px-4 py-3 rounded-3xl shadow-xl border-2 min-h-[80px] flex items-center transition-all duration-200 ${
                      isDisabled
                        ? 'border-gray-300/80 dark:border-gray-600/80'
                        : 'border-gray-100/80 dark:border-slate-600/80 hover:border-gray-200 dark:hover:border-slate-500'
                    }`}>
                      
                      {/* Status Badge - Top Right */}
                      <div className="absolute top-3 right-3 z-10">
                        <div className={`flex items-center gap-1 px-2 py-1 ${statusColor} text-white text-xs font-medium rounded-full shadow-sm`}>
                          <span className={locale === 'kh' ? 'khmer-font' : ''}>{statusText}</span>
                        </div>
                      </div>

                      <div className="flex items-center w-full space-x-4">
                        {/* Icon Section */}
                        <div className="relative flex-shrink-0">
                          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${
                            isDisabled
                              ? 'bg-gradient-to-br from-gray-400 to-gray-500'
                              : `bg-gradient-to-br ${
                                  reward.color === 'pink' ? 'from-pink-500 to-pink-600' :
                                  reward.color === 'yellow' ? 'from-yellow-500 to-yellow-600' :
                                  reward.color === 'orange' ? 'from-orange-500 to-orange-600' :
                                  reward.color === 'blue' ? 'from-blue-500 to-blue-600' :
                                  'from-yellow-400 to-yellow-500'
                                }`
                          }`}>
                            <Icon path={mdiStar} className="text-white relative z-10 w-7 h-7" />
                          </div>
                        </div>

                        {/* Content Section */}
                        <div className="text-left flex-1 min-w-0">
                          <h3 className={`${locale === 'kh' ? 'khmer-font' : ''} text-base font-bold text-gray-900 dark:text-white mb-1`}>
                            {reward.name}
                          </h3>
                          
                          {/* Status and Meta Info */}
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-2">
                              <div className={`w-1.5 h-1.5 rounded-full ${
                                isDisabled ? 'bg-gray-500' : 'bg-yellow-500'
                              }`}></div>
                              <span className={`${locale === 'kh' ? 'khmer-font' : ''} text-xs font-medium ${
                                isDisabled ? 'text-gray-600 dark:text-gray-400' : 'text-yellow-600 dark:text-yellow-400'
                              }`}>
                                {reward.amount} ⭐
                              </span>
                            </div>
                            
                            <span className={`${locale === 'kh' ? 'khmer-font' : ''} text-xs text-gray-500 dark:text-gray-400`}>
                              • {statusText}
                            </span>
                          </div>
                        </div>

                        {/* Arrow */}
                        <div className={`flex-shrink-0 ${isDisabled ? 'text-gray-300 dark:text-gray-600' : 'text-gray-400 dark:text-gray-500'}`}>
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z"/>
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
            );
          })}
      </div>

      {/* Slide-in Confirmation Dialog */}
      {selectedReward && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-fadeIn"
            onClick={handleCancelRequest}
          ></div>
          
          {/* Slide-in Panel */}
          <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl z-50 animate-slideUp">
            <div className="p-6">
              {/* Handle Bar */}
              <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-6"></div>
              
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className={`${locale === 'kh' ? 'khmer-font' : ''} text-xl font-bold text-gray-900 dark:text-white`}>
                  {t('confirmRequest')}
                </h3>
                <button
                  onClick={handleCancelRequest}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                  <Icon path={mdiClose} className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              {/* Reward Info */}
              <div className={`p-4 rounded-2xl border-2 mb-6 ${getColorClasses(selectedReward.color).border} ${getColorClasses(selectedReward.color).bg}`}>
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg bg-gradient-to-br ${
                    selectedReward.color === 'pink' ? 'from-pink-500 to-pink-600' :
                    selectedReward.color === 'yellow' ? 'from-yellow-500 to-yellow-600' :
                    selectedReward.color === 'orange' ? 'from-orange-500 to-orange-600' :
                    selectedReward.color === 'blue' ? 'from-blue-500 to-blue-600' :
                    'from-yellow-400 to-yellow-500'
                  }`}>
                    <Icon path={mdiStar} className="text-white relative z-10 w-8 h-8" />
                  </div>
                  <div className="flex-1">
                    <h4 className={`${locale === 'kh' ? 'khmer-font' : ''} font-bold text-lg text-gray-900 dark:text-white mb-1`}>
                      {selectedReward.name}
                    </h4>
                    <p className={`${locale === 'kh' ? 'khmer-font' : ''} text-sm ${getColorClasses(selectedReward.color).text}`}>
                      {selectedReward.amount} ⭐ {t('starsToEarn')}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700 dark:text-gray-300">{t('claimLimit')}:</span>
                    <span className={`font-bold ${getColorClasses(selectedReward.color).text}`}>
                      {claimCounts[selectedReward.id] > 0 ? t('claimed') || 'Claimed' : t('notClaimed') || 'Once per student'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Confirmation Message */}
              <p className={`${locale === 'kh' ? 'khmer-font' : ''} text-center text-gray-600 dark:text-gray-400 mb-6`}>
                {t('confirmMessage')}
              </p>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleCancelRequest}
                  disabled={isSubmitting}
                  className={`${locale === 'kh' ? 'khmer-font' : ''} flex-1 py-3 px-4 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50`}
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={handleConfirmRequest}
                  disabled={isSubmitting}
                  className={`${locale === 'kh' ? 'khmer-font' : ''} flex-1 py-3 px-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl font-semibold hover:from-yellow-600 hover:to-orange-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2`}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>{t('submitting')}</span>
                    </>
                  ) : (
                    <>
                      <Icon path={mdiCheckCircle} className="w-5 h-5" />
                      <span>{t('submit')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }

        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </>
  );
};

export default StudentStarRequestForm;
