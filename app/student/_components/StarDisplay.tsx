"use client";

import React, { useState, useEffect } from 'react';
import { mdiStar, mdiStarOutline, mdiChevronRight } from '@mdi/js';
import Icon from '../../_components/Icon';

// Firebase
import { db } from '../../../firebase-config';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot,
  limit,
  QueryConstraint
} from 'firebase/firestore';

// Interfaces
import { ClaimedStar } from '../../_interfaces';

interface StarDisplayProps {
  studentId: string;
  showHistory?: boolean; // Whether to show the history list
  limit?: number; // Limit number of stars to show
}

const STAR_COLORS = {
  white: { bgClass: 'bg-gray-100', textClass: 'text-gray-800' },
  pink: { bgClass: 'bg-pink-100', textClass: 'text-pink-800' },
  orange: { bgClass: 'bg-orange-100', textClass: 'text-orange-800' },
  blue: { bgClass: 'bg-blue-100', textClass: 'text-blue-800' }
};

export const StarDisplay: React.FC<StarDisplayProps> = ({
  studentId,
  showHistory = true,
  limit: starLimit = 10
}) => {
  const [claimedStars, setClaimedStars] = useState<ClaimedStar[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  // Calculate total stars
  const totalStars = claimedStars.reduce((sum, claimed) => sum + claimed.amount, 0);

  // Fetch claimed stars
  useEffect(() => {
    if (!studentId) return;

    const queryConstraints: QueryConstraint[] = [orderBy('claimedAt', 'desc')];
    if (!showAll && starLimit) {
      queryConstraints.push(limit(starLimit));
    }

    const claimedStarsQuery = query(
      collection(db, 'students', studentId, 'claimedStars'),
      ...queryConstraints
    );

    const unsubscribe = onSnapshot(claimedStarsQuery, (snapshot) => {
      const claimed = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ClaimedStar));
      setClaimedStars(claimed);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching claimed stars:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [studentId, showAll, starLimit]);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
            <Icon path={mdiStar} size={24} className="mr-2 text-yellow-500" />
            My Stars
          </h2>
          <div className="animate-pulse">
            <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  const displayedStars = showAll ? claimedStars : claimedStars.slice(0, starLimit);
  const hasMoreStars = claimedStars.length > starLimit;

  return (
    <div className="space-y-4">
      {/* Header with total stars */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
          <Icon path={mdiStar} size={24} className="mr-2 text-yellow-500" />
          My Stars
        </h2>
        <div className="flex items-center space-x-2 px-4 py-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
          <Icon path={mdiStar} size={20} className="text-yellow-600 dark:text-yellow-400" />
          <span className="text-lg font-bold text-yellow-800 dark:text-yellow-200">
            {totalStars}
          </span>
        </div>
      </div>

      {/* Stars History */}
      {showHistory && (
        <div className="space-y-3">
          {displayedStars.length > 0 ? (
            <>
              <div className="space-y-3">
                {displayedStars.map((claimed) => {
                  const colorConfig = STAR_COLORS[claimed.starRewardColor] || STAR_COLORS.white;
                  
                  return (
                    <div
                      key={claimed.id}
                      className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-gray-100/80 dark:border-slate-600/80 hover:shadow-xl transition-all duration-200"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`flex items-center justify-center w-10 h-10 rounded-full ${colorConfig.bgClass}`}>
                            <Icon path={mdiStar} size={20} className={colorConfig.textClass} />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-gray-100">
                              {claimed.starRewardName}
                            </p>
                            {claimed.reason && (
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {claimed.reason}
                              </p>
                            )}
                            <p className="text-xs text-gray-500 dark:text-gray-500">
                              {formatDate(claimed.claimedAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1 px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
                          <Icon path={mdiStar} size={16} className="text-yellow-600 dark:text-yellow-400" />
                          <span className="text-sm font-bold text-yellow-800 dark:text-yellow-200">
                            +{claimed.amount}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Show More/Less button */}
              {hasMoreStars && (
                <button
                  onClick={() => setShowAll(!showAll)}
                  className="w-full flex items-center justify-center py-3 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                >
                  {showAll ? 'Show Less' : `Show All (${claimedStars.length})`}
                  <Icon 
                    path={mdiChevronRight} 
                    size={16} 
                    className={`ml-1 transition-transform ${showAll ? 'rotate-90' : ''}`} 
                  />
                </button>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <Icon path={mdiStarOutline} size={48} className="text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                No Stars Yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Keep up the great work to earn your first stars!
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StarDisplay;
