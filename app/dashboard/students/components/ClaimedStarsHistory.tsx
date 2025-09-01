"use client";

import React from 'react';
import { mdiStar, mdiStarOutline, mdiDelete } from '@mdi/js';
import Icon from '../../../_components/Icon';
import { ClaimedStar } from '../../../_interfaces';

interface ClaimedStarsHistoryProps {
  claimedStars: ClaimedStar[];
  totalStars: number;
  isCompact?: boolean; // For use below copy permission link
  onDelete?: (id: string) => void;
}

const STAR_COLORS = {
  white: { bgClass: 'bg-gray-100', textClass: 'text-gray-800', ringClass: 'ring-gray-300' },
  pink: { bgClass: 'bg-pink-100', textClass: 'text-pink-800', ringClass: 'ring-pink-300' },
  orange: { bgClass: 'bg-orange-100', textClass: 'text-orange-800', ringClass: 'ring-orange-300' },
  blue: { bgClass: 'bg-blue-100', textClass: 'text-blue-800', ringClass: 'ring-blue-300' }
};

const formatDate = (timestamp: any) => {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
};

export const ClaimedStarsHistory: React.FC<ClaimedStarsHistoryProps> = ({
  claimedStars,
  totalStars,
  isCompact = false,
  onDelete
}) => {
  const handleDelete = (id: string) => {
    const ok = window.confirm('Are you sure you want to delete this claimed star? This action cannot be undone.');
    if (!ok) return;
    if (onDelete) onDelete(id);
  };
  if (isCompact) {
    return (
      <div className="mt-4 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
        <div className="flex items-center justify-between mb-3 ml-2">
          <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center">
            Claimed Stars
          </h5>
          <div className="flex items-center space-x-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/40 rounded-full">
            <Icon path={mdiStar} size={12} className="text-yellow-600 dark:text-yellow-400" />
            <span className="text-xs font-semibold text-yellow-800 dark:text-yellow-200">
              {totalStars} total
            </span>
          </div>
        </div>
        
        {claimedStars.length > 0 ? (
          <div className="max-h-32 overflow-y-auto space-y-2">
            {claimedStars.slice(0, 3).map((claimed) => {
              const colorConfig = STAR_COLORS[claimed.starRewardColor] || STAR_COLORS.white;
              
              return (
                <div
                  key={claimed.id}
                  className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 rounded-md border border-gray-200 dark:border-slate-600"
                >
                  <div className="flex items-center space-x-2">
                    <div className={`flex items-center justify-center w-6 h-6 rounded-full ${colorConfig.bgClass} ring-1 ${colorConfig.ringClass}`}>
                      <Icon path={mdiStar} size={16} className={colorConfig.textClass} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-900 dark:text-gray-100">
                        {claimed.starRewardName}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {formatDate(claimed.claimedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center">
                      <Icon path={mdiStar} size={16} className="text-yellow-500" />
                      <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">+{claimed.amount}</span>
                    </div>
                    <button
                      onClick={() => handleDelete(claimed.id)}
                      title="Delete"
                      className="rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Icon path={mdiDelete} size={12} className="text-red-500" />
                    </button>
                  </div>
                </div>
              );
            })}
            {claimedStars.length > 3 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                ...and {claimedStars.length - 3} more
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-3">
            <Icon path={mdiStarOutline} size={20} className="text-gray-400 mx-auto mb-1" />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              No stars claimed yet
            </p>
          </div>
        )}
      </div>
    );
  }

  // Full version for star management section
  return (
    <div className="space-y-3">
      <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
        Claimed Stars ({claimedStars.length})
      </h5>
      
      {claimedStars.length > 0 ? (
        <div className="max-h-48 overflow-y-auto space-y-2">
          {claimedStars.map((claimed) => {
            const colorConfig = STAR_COLORS[claimed.starRewardColor] || STAR_COLORS.white;
            
            return (
              <div
                key={claimed.id}
                className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600"
              >
                <div className="flex items-center space-x-3">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${colorConfig.bgClass} ring-1 ${colorConfig.ringClass}`}>
                    <Icon path={mdiStar} size={16} className={colorConfig.textClass} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {claimed.starRewardName}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {formatDate(claimed.claimedAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <Icon path={mdiStar} size={14} className="text-yellow-500" />
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    +{claimed.amount}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-6">
          <Icon path={mdiStarOutline} size={32} className="text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No stars claimed yet
          </p>
        </div>
      )}
    </div>
  );
};

export default ClaimedStarsHistory;
