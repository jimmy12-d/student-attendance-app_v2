"use client";

import React, { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { db } from '../../../../firebase-config';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { StarRequest } from '../../../_interfaces';
import Icon from '../../../_components/Icon';
import { mdiStar, mdiCheck, mdiClose, mdiClockOutline } from '@mdi/js';

interface StudentStarRequestStatusProps {
  studentId: string;
  authUid: string;
  onClose: () => void;
}

export const StudentStarRequestStatus: React.FC<StudentStarRequestStatusProps> = ({ 
  studentId, 
  authUid, 
  onClose 
}) => {
  const t = useTranslations('student.activities.starRewards');
  const locale = useLocale();
  const [starRequests, setStarRequests] = useState<StarRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStarRequests = async () => {
      if (!studentId || !authUid) return;

      try {
        const requestsQuery = query(
          collection(db, 'starRequests'),
          where('studentId', '==', studentId),
          where('authUid', '==', authUid),
          orderBy('requestedAt', 'desc')
        );
        const requestsSnap = await getDocs(requestsQuery);
        const requests = requestsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as StarRequest));
        setStarRequests(requests);
      } catch (error) {
        console.error('Error fetching star requests:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStarRequests();
  }, [studentId, authUid]);

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
            <Icon path={mdiClockOutline} size={14} />
            {locale === 'kh' ? 'កំពុងពិនិត្យ' : 'Pending'}
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
            <Icon path={mdiCheck} size={14} />
            {locale === 'kh' ? 'បានអនុម័ត' : 'Approved'}
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
            <Icon path={mdiClose} size={14} />
            {locale === 'kh' ? 'បានបដិសេធ' : 'Rejected'}
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-fadeIn"
        onClick={onClose}
      ></div>
      
      {/* Slide-in Panel */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl z-50 animate-slideUp max-h-[80vh] flex flex-col">
        <div className="p-6 flex-shrink-0">
          {/* Handle Bar */}
          <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-6"></div>
          
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className={`${locale === 'kh' ? 'khmer-font' : ''} text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2`}>
              <Icon path={mdiStar} className="w-6 h-6 text-yellow-500" />
              {locale === 'kh' ? 'សំណើរតារារបស់ខ្ញុំ' : 'My Star Requests'}
            </h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            >
              <Icon path={mdiClose} className="w-6 h-6 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
              <div className={`${locale === 'kh' ? 'khmer-font' : ''} text-sm text-gray-600 dark:text-gray-400`}>
                {locale === 'kh' ? 'កំពុងផ្ទុក...' : 'Loading...'}
              </div>
            </div>
          ) : starRequests.length === 0 ? (
            <div className="text-center py-8">
              <Icon path={mdiStar} size={48} className="text-gray-400 mx-auto mb-4" />
              <p className={`${locale === 'kh' ? 'khmer-font' : ''} text-gray-600 dark:text-gray-400`}>
                {locale === 'kh' ? 'មិនមានសំណើរតារា' : 'No star requests yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {starRequests.map((request) => {
                const colorClasses = getColorClasses(request.starRewardColor);
                
                return (
                  <div 
                    key={request.id}
                    className={`p-4 rounded-2xl border-2 ${colorClasses.border} ${colorClasses.bg} transition-all`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Icon path={mdiStar} className={`w-5 h-5 ${colorClasses.text}`} />
                        <span className={`${locale === 'kh' ? 'khmer-font' : ''} font-semibold ${colorClasses.text}`}>
                          {request.starRewardName}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${colorClasses.text}`}>
                          +{request.starRewardAmount} ⭐
                        </span>
                      </div>
                      {getStatusBadge(request.status)}
                    </div>

                    <div className={`${locale === 'kh' ? 'khmer-font' : ''} text-xs text-gray-600 dark:text-gray-400 mb-2`}>
                      {locale === 'kh' ? 'ស្នើរនៅ' : 'Requested'}: {request.requestedAt && (request.requestedAt as Timestamp).toDate().toLocaleDateString()}
                    </div>

                    {request.status === 'rejected' && request.rejectionReason && (
                      <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded text-xs text-red-800 dark:text-red-300">
                        <strong className={locale === 'kh' ? 'khmer-font' : ''}>
                          {locale === 'kh' ? 'មូលហេតុបដិសេធ' : 'Rejection reason'}:
                        </strong> {request.rejectionReason}
                      </div>
                    )}

                    {request.status === 'approved' && request.processedAt && (
                      <div className="mt-2 p-2 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded text-xs text-green-800 dark:text-green-300">
                        <strong className={locale === 'kh' ? 'khmer-font' : ''}>
                          {locale === 'kh' ? 'បានអនុម័តនៅ' : 'Approved on'}:
                        </strong> {(request.processedAt as Timestamp).toDate().toLocaleDateString()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </>
  );
};

export default StudentStarRequestStatus;
