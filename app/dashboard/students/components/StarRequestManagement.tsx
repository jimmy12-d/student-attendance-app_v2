import React, { useState, useEffect } from 'react';
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
  Timestamp,
  orderBy 
} from 'firebase/firestore';
import { StarRequest } from '../../../_interfaces';
import Icon from '../../../_components/Icon';
import { mdiStar, mdiCheck, mdiClose, mdiClockOutline } from '@mdi/js';
import { toast } from 'sonner';

interface StarRequestManagementProps {
  studentId: string;
}

export const StarRequestManagement: React.FC<StarRequestManagementProps> = ({ studentId }) => {
  const [starRequests, setStarRequests] = useState<StarRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    const fetchStarRequests = async () => {
      if (!studentId) return;

      try {
        const requestsQuery = query(
          collection(db, 'starRequests'),
          where('studentId', '==', studentId),
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
  }, [studentId]);

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
          claimedAt: serverTimestamp(),
          claimedBy: 'admin',
          reason: `Approved request: ${request.reason}`
        }
      );

      toast.success('Star request approved!');
      
      // Update local state
      setStarRequests(prev => prev.map(r => 
        r.id === request.id 
          ? { ...r, status: 'approved', processedAt: Timestamp.now(), processedBy: 'admin' }
          : r
      ));
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
      
      // Update local state
      setStarRequests(prev => prev.map(r => 
        r.id === request.id 
          ? { ...r, status: 'rejected', processedAt: Timestamp.now(), processedBy: 'admin', rejectionReason: reason }
          : r
      ));
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
            <Icon path={mdiClockOutline} size={14} />
            Pending
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
            <Icon path={mdiCheck} size={14} />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
            <Icon path={mdiClose} size={14} />
            Rejected
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="text-sm text-gray-600 dark:text-gray-400">Loading star requests...</div>
      </div>
    );
  }

  if (starRequests.length === 0) {
    return (
      <div className="text-center py-6">
        <Icon path={mdiStar} size={48} className="text-gray-400 mx-auto mb-2" />
        <p className="text-gray-600 dark:text-gray-400">No star requests yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
        <Icon path={mdiStar} size={20} className="text-yellow-500" />
        Star Requests ({starRequests.filter(r => r.status === 'pending').length} pending)
      </h4>
      
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {starRequests.map((request) => {
          const colorClasses = getColorClasses(request.starRewardColor);
          
          return (
            <div 
              key={request.id}
              className={`p-4 rounded-lg border-2 ${colorClasses.border} ${colorClasses.bg} transition-all`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon path={mdiStar} className={`w-5 h-5 ${colorClasses.text}`} />
                  <span className={`font-semibold ${colorClasses.text}`}>
                    {request.starRewardName}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${colorClasses.text}`}>
                    +{request.starRewardAmount} ⭐
                  </span>
                </div>
                {getStatusBadge(request.status)}
              </div>

              <div className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                <p className="line-clamp-2">{request.reason}</p>
              </div>

              <div className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                Requested: {request.requestedAt && (request.requestedAt as Timestamp).toDate().toLocaleDateString()}
              </div>

              {request.status === 'pending' && (
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
              )}

              {request.status === 'rejected' && request.rejectionReason && (
                <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded text-xs text-red-800 dark:text-red-300">
                  <strong>Rejection reason:</strong> {request.rejectionReason}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StarRequestManagement;
