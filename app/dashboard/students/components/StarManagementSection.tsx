"use client";

import React, { useState, useEffect } from 'react';
import { 
  mdiStar, 
  mdiPlus, 
  mdiStarOutline,
  mdiClose
} from '@mdi/js';
import Icon from '../../../_components/Icon';
import Button from '../../../_components/Button';
import CustomDropdown from './CustomDropdown';
import ClaimedStarsHistory from './ClaimedStarsHistory';
import { toast } from 'sonner';

// Firebase
import { db } from '../../../../firebase-config';
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  query, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  where
} from 'firebase/firestore';

// Interfaces
import { StarReward, ClaimedStar, Student } from '../../../_interfaces';

interface StarManagementSectionProps {
  student: Student;
  onStarUpdate?: () => void; // Callback when stars are updated
}

export const StarManagementSection: React.FC<StarManagementSectionProps> = ({
  student,
  onStarUpdate
}) => {
  const [starRewards, setStarRewards] = useState<StarReward[]>([]);
  const [claimedStars, setClaimedStars] = useState<ClaimedStar[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [selectedRewards, setSelectedRewards] = useState<string[]>([]); // Changed to array for multiple selections

  // Calculate total stars
  const totalStars = claimedStars.reduce((sum, claimed) => sum + claimed.amount, 0);

  // Fetch star rewards and claimed stars
  useEffect(() => {
    if (!student?.id) return;

    const starRewardsQuery = query(
      collection(db, 'starRewards'),
      where('isActive', '==', true)
    );

    const claimedStarsQuery = query(
      collection(db, 'students', student.id, 'claimedStars')
    );

    // Set up real-time listeners
    const unsubscribeRewards = onSnapshot(starRewardsQuery, (snapshot) => {
      const rewards = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as StarReward));
      
      // Sort in memory to avoid orderBy issues
      rewards.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || new Date(0);
        const bTime = b.createdAt?.toDate?.() || new Date(0);
        return bTime.getTime() - aTime.getTime();
      });
      
      setStarRewards(rewards);
    }, (error) => {
      console.error('Error fetching star rewards:', error);
      setStarRewards([]);
    });

    const unsubscribeClaimed = onSnapshot(claimedStarsQuery, (snapshot) => {
      const claimed = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ClaimedStar));
      
      // Sort in memory to avoid orderBy issues
      claimed.sort((a, b) => {
        const aTime = a.claimedAt?.toDate?.() || new Date(0);
        const bTime = b.claimedAt?.toDate?.() || new Date(0);
        return bTime.getTime() - aTime.getTime();
      });
      
      setClaimedStars(claimed);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching claimed stars:', error);
      setClaimedStars([]);
      setLoading(false);
    });

    return () => {
      unsubscribeRewards();
      unsubscribeClaimed();
    };
  }, [student?.id]);

  // Get claim count for a specific reward
  const getClaimCount = (rewardId: string) => {
    return claimedStars.filter(claim => claim.starRewardId === rewardId).length;
  };

  // Check if reward can be claimed
  const canClaimReward = (reward: StarReward) => {
    const claimCount = getClaimCount(reward.id);
    // If setLimit is -1, it means no limit, so always return true
    if (reward.setLimit === -1) {
      return true;
    }
    return claimCount < reward.setLimit;
  };

  // Handle claiming multiple stars
  const handleClaimStars = async () => {
    if (selectedRewards.length === 0 || !student?.id) {
      toast.error('Please select at least one reward');
      return;
    }

    setClaiming('claiming');

    try {
      // Process each selected reward
      for (const rewardId of selectedRewards) {
        const reward = starRewards.find(r => r.id === rewardId);
        if (!reward) {
          console.warn(`Reward with id ${rewardId} not found`);
          continue;
        }

        if (!canClaimReward(reward)) {
          toast.error(`${reward.name} has reached its claim limit`);
          continue;
        }

        // Add to claimedStars sub-collection
        await addDoc(collection(db, 'students', student.id, 'claimedStars'), {
          starRewardId: reward.id,
          starRewardName: reward.name,
          starRewardColor: reward.color,
          amount: reward.amount,
          claimedAt: serverTimestamp(),
          claimedBy: 'admin' // You can replace this with actual admin info
        });
      }

      const totalStarsAwarded = selectedRewards.reduce((sum, rewardId) => {
        const reward = starRewards.find(r => r.id === rewardId);
        return sum + (reward?.amount || 0);
      }, 0);

      toast.success(`${totalStarsAwarded} stars awarded to ${student.fullName}!`);
      setSelectedRewards([]);
      
      // Call update callback
      if (onStarUpdate) {
        onStarUpdate();
      }
    } catch (error) {
      console.error('Error claiming stars:', error);
      toast.error('Failed to award stars');
    } finally {
      setClaiming(null);
    }
  };

  // Handle checkbox change
  const handleRewardToggle = (rewardId: string) => {
    setSelectedRewards(prev => 
      prev.includes(rewardId) 
        ? prev.filter(id => id !== rewardId)
        : [...prev, rewardId]
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center">
          <Icon path={mdiStar} size={16} className="mr-2 text-yellow-500" />
          Star Management
        </h4>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-500"></div>
          <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with total stars */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center">
          <Icon path={mdiStar} size={16} className="mr-2 text-yellow-500" />
          Star Management
        </h4>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
            <Icon path={mdiStar} size={14} className="text-yellow-600 dark:text-yellow-400" />
            <span className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
              {totalStars}
            </span>
          </div>
        </div>
      </div>

      {/* Flex layout: History first, then Award section */}
      <div className="flex flex-col">


        {/* Award New Star Section - Second */}
        <div className="flex-1 bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 space-y-3">
          <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
            Select Active Rewards
          </h5>
          
          {starRewards.length > 0 ? (
            <div className="space-y-3">
              {/* Reward Checkboxes */}
              <div className="space-y-2">
                {starRewards.map((reward) => {
                  const claimCount = getClaimCount(reward.id);
                  const canClaim = canClaimReward(reward);
                  const isSelected = selectedRewards.includes(reward.id);
                  
                  return (
                    <label
                      key={reward.id}
                      className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : canClaim
                          ? 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                          : 'border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => canClaim && handleRewardToggle(reward.id)}
                        disabled={!canClaim}
                        className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className={`font-medium ${
                            canClaim 
                              ? 'text-gray-900 dark:text-gray-100' 
                              : 'text-gray-500 dark:text-gray-400'
                          }`}>
                            {reward.name}
                          </span>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">
                              {reward.amount} ⭐
                            </span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {claimCount}/{reward.setLimit === -1 ? '∞' : reward.setLimit} used
                          {!canClaim && ' - Max claimed'}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>

              {/* Award Button */}
              <Button
                onClick={handleClaimStars}
                disabled={selectedRewards.length === 0 || claiming !== null}
                color="success"
                icon={mdiPlus}
                label={
                  claiming 
                    ? 'Awarding...' 
                    : selectedRewards.length === 0 
                    ? 'Select Rewards' 
                    : `Award ${selectedRewards.length} Reward${selectedRewards.length > 1 ? 's' : ''}`
                }
                small
              />
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No active star rewards available. Create some in Star Management.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default StarManagementSection;
