"use client";

import React, { useState, useEffect } from 'react';
import { mdiStar, mdiStarOutline } from '@mdi/js';
import Icon from '../../../_components/Icon';

// Firebase
import { db } from '../../../../firebase-config';
import { 
  collection, 
  onSnapshot,
  query,
  getAggregateFromServer,
  sum
} from 'firebase/firestore';

interface StudentStarCountProps {
  studentId: string;
  showIcon?: boolean;
  className?: string;
}

export const StudentStarCount: React.FC<StudentStarCountProps> = ({
  studentId,
  showIcon = true,
  className = ""
}) => {
  const [totalStars, setTotalStars] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId) {
      setLoading(false);
      return;
    }

    // Set up real-time listener for claimed stars
    const claimedStarsQuery = query(
      collection(db, 'students', studentId, 'claimedStars')
    );

    const unsubscribe = onSnapshot(claimedStarsQuery, async (snapshot) => {
      try {
        // Calculate total stars by summing the amount field
        let total = 0;
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.amount && typeof data.amount === 'number') {
            total += data.amount;
          }
        });
        
        setTotalStars(total);
        setLoading(false);
      } catch (error) {
        console.error('Error calculating star total:', error);
        setTotalStars(0);
        setLoading(false);
      }
    }, (error) => {
      console.error('Error listening to star changes:', error);
      setTotalStars(0);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [studentId]);

  if (loading) {
    return (
      <div className={`flex items-center space-x-1 ${className}`}>
        {showIcon && (
          <div className="w-4 h-4 animate-pulse bg-gray-300 rounded-full"></div>
        )}
        <div className="w-6 h-3 animate-pulse bg-gray-300 rounded"></div>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      {showIcon && (
        <Icon 
          path={totalStars > 0 ? mdiStar : mdiStarOutline} 
          size={16} 
          className={totalStars > 0 ? "text-yellow-500" : "text-gray-400"} 
        />
      )}
      <span className={`text-sm font-medium ${
        totalStars > 0 
          ? "text-yellow-600 dark:text-yellow-400" 
          : "text-gray-500 dark:text-gray-400"
      }`}>
        {totalStars}
      </span>
    </div>
  );
};

export default StudentStarCount;
