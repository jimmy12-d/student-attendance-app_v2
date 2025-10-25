"use client";

import React, { useState, useEffect } from 'react';
import { db } from '../../../firebase-config';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  addDoc, 
  serverTimestamp,
  Timestamp,
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import { StarRequest, Student } from '../../_interfaces';
import Icon from '../../_components/Icon';
import { mdiStar, mdiCheck, mdiClose, mdiClockOutline, mdiChevronDown, mdiChevronUp } from '@mdi/js';
import { toast } from 'sonner';
import Button from '../../_components/Button';
import CardBox from '../../_components/CardBox';

export const PendingStarRequests: React.FC = () => {
  const [starRequests, setStarRequests] = useState<StarRequest[]>([]);
  const [students, setStudents] = useState<Map<string, Student>>(new Map());
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [showPending, setShowPending] = useState(true);

  // Fetch students for display
  useEffect(() => {
    const studentsQuery = collection(db, 'students');
    
    const unsubscribe = onSnapshot(studentsQuery, (snapshot) => {
      const studentsMap = new Map<string, Student>();
      snapshot.docs.forEach(doc => {
        studentsMap.set(doc.id, { id: doc.id, ...doc.data() } as Student);
      });
      setStudents(studentsMap);
    });

    return () => unsubscribe();
  }, []);

  // Fetch pending star requests
  useEffect(() => {
    const requestsQuery = query(
      collection(db, 'starRequests'),
      where('status', '==', 'pending'),
      orderBy('requestedAt', 'desc')
    );

    const unsubscribe = onSnapshot(requestsQuery, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as StarRequest));
      setStarRequests(requests);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching star requests:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleApprove = async (request: StarRequest) => {
    setProcessing(request.id);
    try {
      // Update the star request status
      const requestRef = doc(db, 'starRequests', request.id);
      await updateDoc(requestRef, {
        status: 'approved',
        processedAt: serverTimestamp(),
        processedBy: 'admin'
      });

      // Add the claimed star to the student's sub-collection
      await addDoc(
        collection(db, 'students', request.studentId, 'claimedStars'),
        {
          starRewardId: request.starRewardId,
          starRewardName: request.starRewardName,
          starRewardColor: request.starRewardColor,
          amount: request.starRewardAmount,
          authUid: request.authUid,
          claimedAt: serverTimestamp(),
          claimedBy: 'admin',
          reason: `Approved request`
        }
      );

      toast.success('Star request approved!');
    } catch (error) {
      console.error('Error approving star request:', error);
      toast.error('Failed to approve star request');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (request: StarRequest) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;

    setProcessing(request.id);
    try {
      const requestRef = doc(db, 'starRequests', request.id);
      await updateDoc(requestRef, {
        status: 'rejected',
        processedAt: serverTimestamp(),
        processedBy: 'admin',
        rejectionReason: reason
      });

      toast.success('Star request rejected');
    } catch (error) {
      console.error('Error rejecting star request:', error);
      toast.error('Failed to reject star request');
    } finally {
      setProcessing(null);
    }
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

  if (loading) {
    return (
      <CardBox className="mb-6">
        <div className="text-center py-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">Loading star requests...</div>
        </div>
      </CardBox>
    );
  }

  return (
    <CardBox className="mb-6">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded-lg">
            <Icon path={mdiStar} size={24} className="text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Pending Star Requests
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {starRequests.length} {starRequests.length === 1 ? 'request' : 'requests'} waiting for review
            </p>
          </div>
        </div>
        <Button
          icon={showPending ? mdiChevronUp : mdiChevronDown}
          label={showPending ? 'Hide' : 'Show'}
          color="warning"
          small
          outline
          onClick={() => setShowPending(!showPending)}
        />
      </div>

      {showPending && (
        <div className="p-4">
          {starRequests.length === 0 ? (
            <div className="text-center py-8">
              <Icon path={mdiStar} size={48} className="text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600 dark:text-gray-400">No pending star requests</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {starRequests.map((request) => {
                const colorClasses = getColorClasses(request.starRewardColor);
                const student = students.get(request.studentId);
                
                return (
                  <div 
                    key={request.id}
                    className={`p-4 rounded-xl border-2 ${colorClasses.border} ${colorClasses.bg} transition-all`}
                  >
                    {/* Student Info */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                          {request.studentName}
                        </h4>
                        {student?.nameKhmer && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {student.nameKhmer}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">
                            {request.studentClass}
                          </span>
                          {request.studentShift && (
                            <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">
                              {request.studentShift}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                        <Icon path={mdiClockOutline} size={14} />
                        Pending
                      </span>
                    </div>

                    {/* Reward Info */}
                    <div className="flex items-center gap-2 mb-3 p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                      <Icon path={mdiStar} className={`w-5 h-5 ${colorClasses.text}`} />
                      <span className={`font-semibold ${colorClasses.text}`}>
                        {request.starRewardName}
                      </span>
                      <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-bold ${colorClasses.text}`}>
                        +{request.starRewardAmount} ⭐
                      </span>
                    </div>

                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                      Requested: {request.requestedAt && (request.requestedAt as Timestamp).toDate().toLocaleString()}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(request)}
                        disabled={processing === request.id}
                        className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Icon path={mdiCheck} size={16} />
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(request)}
                        disabled={processing === request.id}
                        className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Icon path={mdiClose} size={16} />
                        Reject
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </CardBox>
  );
};

export default PendingStarRequests;
