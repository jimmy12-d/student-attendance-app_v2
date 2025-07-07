import React from 'react';
import LoadingSpinner from '../_components/LoadingSpinner';

export default function Loading() {
  // You can add any UI inside Loading, including a Skeleton.
  return (
    <div className="flex justify-center items-center h-full py-20">
        <LoadingSpinner size="md" />
    </div>
  )
}
