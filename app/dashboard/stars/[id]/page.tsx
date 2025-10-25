"use client";

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { db } from '../../../../firebase-config';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  addDoc, 
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { StarRequest } from '../../../_interfaces';
import SectionMain from '../../../_components/Section/Main';
import SectionTitleLineWithButton from '../../../_components/Section/TitleLineWithButton';
import CardBox from '../../../_components/CardBox';
import Button from '../../../_components/Button';
import Icon from '../../../_components/Icon';
import { mdiStar, mdiCheck, mdiClose, mdiClockOutline, mdiAccount } from '@mdi/js';
import { toast } from 'sonner';
import FormField from '@/app/_components/FormField';

const StarRequestDetailPage = () => {
  const params = useParams();
  const requestId = params.id as string;
  
  const [starRequest, setStarRequest] = useState<StarRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionModal, setShowRejectionModal] = useState(false);

  useEffect(() => {
    const fetchStarRequest = async () => {
      if (!requestId) return;

      try {
        const requestQuery = query(
          collection(db, 'starRequests'),
          where('__name__', '==', requestId)
        );
        const requestSnap = await getDocs(requestQuery);
        
        if (!requestSnap.empty) {
          const requestData = {
            id: requestSnap.docs[0].id,
            ...requestSnap.docs[0].data()
          } as StarRequest;
          setStarRequest(requestData);
        } else {
          toast.error('Star request not found');
        }
      } catch (error) {
        console.error('Error fetching star request:', error);
        toast.error('Failed to load star request');
      } finally {
        setLoading(false);
      }
    };

    fetchStarRequest();
  }, [requestId]);

  const handleApprove = async () => {
    if (!starRequest) return;
    
    setProcessing(true);
    try {
      // Update the star request status
      const requestRef = doc(db, 'starRequests', starRequest.id);
      await updateDoc(requestRef, {
        status: 'approved',
        processedAt: serverTimestamp(),
        processedBy: 'admin' // Replace with actual admin info
      });

      // Add the claimed star to the student's sub-collection
      await addDoc(
        collection(db, 'students', starRequest.studentId, 'claimedStars'),
        {
          starRewardId: starRequest.starRewardId,
          starRewardName: starRequest.starRewardName,
          starRewardColor: starRequest.starRewardColor,
          amount: starRequest.starRewardAmount,
          claimedAt: serverTimestamp(),
          claimedBy: 'admin', // Replace with actual admin info
          reason: `Approved request: ${starRequest.reason}`
        }
      );

      toast.success('Star request approved successfully!');
      
      // Refresh the request data
      setStarRequest({
        ...starRequest,
        status: 'approved',
        processedAt: Timestamp.now(),
        processedBy: 'admin'
      });
    } catch (error) {
      console.error('Error approving star request:', error);
      toast.error('Failed to approve star request');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!starRequest || !rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    
    setProcessing(true);
    try {
      const requestRef = doc(db, 'starRequests', starRequest.id);
      await updateDoc(requestRef, {
        status: 'rejected',
        processedAt: serverTimestamp(),
        processedBy: 'admin', // Replace with actual admin info
        rejectionReason: rejectionReason
      });

      toast.success('Star request rejected');
      
      setStarRequest({
        ...starRequest,
        status: 'rejected',
        processedAt: Timestamp.now(),
        processedBy: 'admin',
        rejectionReason: rejectionReason
      });
      
      setShowRejectionModal(false);
      setRejectionReason('');
    } catch (error) {
      console.error('Error rejecting star request:', error);
      toast.error('Failed to reject star request');
    } finally {
      setProcessing(false);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
            <Icon path={mdiClockOutline} size={16} />
            Pending
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
            <Icon path={mdiCheck} size={16} />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
            <Icon path={mdiClose} size={16} />
            Rejected
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <SectionMain>
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading star request...</div>
        </div>
      </SectionMain>
    );
  }

  if (!starRequest) {
    return (
      <SectionMain>
        <CardBox>
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">Star request not found</p>
          </div>
        </CardBox>
      </SectionMain>
    );
  }

  const colorClasses = getColorClasses(starRequest.starRewardColor);

  return (
    <SectionMain>
      <SectionTitleLineWithButton 
        icon={mdiStar} 
        title="Star Request Details" 
        main
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Request Details */}
        <div className="lg:col-span-2">
          <CardBox>
            <div className="space-y-6">
              {/* Status and Reward Info */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Icon path={mdiStar} className={`w-8 h-8 ${colorClasses.text}`} />
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {starRequest.starRewardName}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(starRequest.status)}
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${colorClasses.bg} ${colorClasses.text}`}>
                      {starRequest.starRewardAmount} Stars
                    </span>
                  </div>
                </div>
              </div>

              {/* Student Information */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Icon path={mdiAccount} size={20} />
                  Student Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Name</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{starRequest.studentName}</p>
                  </div>
                  {starRequest.studentClass && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Class</p>
                      <p className="font-semibold text-gray-900 dark:text-white">{starRequest.studentClass}</p>
                    </div>
                  )}
                  {starRequest.studentShift && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Shift</p>
                      <p className="font-semibold text-gray-900 dark:text-white">{starRequest.studentShift}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Request Reason */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Reason for Request
                </h3>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {starRequest.reason || 'No reason provided'}
                  </p>
                </div>
              </div>

              {/* Rejection Reason (if applicable) */}
              {starRequest.status === 'rejected' && starRequest.rejectionReason && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-3">
                    Rejection Reason
                  </h3>
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
                    <p className="text-red-700 dark:text-red-300">
                      {starRequest.rejectionReason}
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {starRequest.status === 'pending' && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <div className="flex gap-3">
                    <Button
                      icon={mdiCheck}
                      label="Approve Request"
                      color="success"
                      onClick={handleApprove}
                      disabled={processing}
                      className="flex-1"
                    />
                    <Button
                      icon={mdiClose}
                      label="Reject Request"
                      color="danger"
                      onClick={() => setShowRejectionModal(true)}
                      disabled={processing}
                      className="flex-1"
                    />
                  </div>
                </div>
              )}
            </div>
          </CardBox>
        </div>

        {/* Timeline Sidebar */}
        <div className="lg:col-span-1">
          <CardBox>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Request Timeline
            </h3>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                    <Icon path={mdiClockOutline} className="w-4 h-4 text-white" />
                  </div>
                  {starRequest.processedAt && <div className="w-0.5 h-full bg-gray-300 dark:bg-gray-600 mt-2"></div>}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 dark:text-white">Requested</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {starRequest.requestedAt && (starRequest.requestedAt as Timestamp).toDate().toLocaleString()}
                  </p>
                </div>
              </div>

              {starRequest.processedAt && (
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      starRequest.status === 'approved' 
                        ? 'bg-green-500' 
                        : 'bg-red-500'
                    }`}>
                      <Icon 
                        path={starRequest.status === 'approved' ? mdiCheck : mdiClose} 
                        className="w-4 h-4 text-white" 
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {starRequest.status === 'approved' ? 'Approved' : 'Rejected'}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {(starRequest.processedAt as Timestamp).toDate().toLocaleString()}
                    </p>
                    {starRequest.processedBy && (
                      <p className="text-sm text-gray-500 dark:text-gray-500">
                        by {starRequest.processedBy}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardBox>
        </div>
      </div>

      {/* Rejection Modal */}
      {showRejectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Reject Star Request
            </h3>
            <FormField label="Reason for Rejection" labelFor="rejectionReason">
              {(fieldData) => (
                <textarea
                  id="rejectionReason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Please explain why this request is being rejected..."
                  className={`${fieldData.className} min-h-[120px]`}
                />
              )}
            </FormField>
            <div className="flex gap-3 mt-6">
              <Button
                label="Cancel"
                color="outline"
                onClick={() => {
                  setShowRejectionModal(false);
                  setRejectionReason('');
                }}
                className="flex-1"
              />
              <Button
                icon={mdiClose}
                label="Confirm Rejection"
                color="danger"
                onClick={handleReject}
                disabled={processing || !rejectionReason.trim()}
                className="flex-1"
              />
            </div>
          </div>
        </div>
      )}
    </SectionMain>
  );
};

export default StarRequestDetailPage;
