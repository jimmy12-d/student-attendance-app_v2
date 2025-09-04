"use client";

import React from 'react';
import { mdiCameraOff, mdiLoading } from '@mdi/js';
import Icon from '../../../_components/Icon';

interface ShutdownTransitionProps {
  isVisible: boolean;
  stage: 'countdown' | 'shutting-down' | 'shutdown-complete';
  countdown?: number | null;
}

const ShutdownTransition: React.FC<ShutdownTransitionProps> = ({
  isVisible,
  stage,
  countdown
}) => {
  if (!isVisible) return null;

  const renderCountdownStage = () => (
    <div className="absolute inset-0 flex items-center justify-center">
      {/* Large countdown number overlay */}
      <div className="relative">
        {/* Animated rings around the number */}
        <div className="absolute inset-0 w-48 h-48 border-4 border-red-500/20 rounded-full animate-ping"></div>
        <div className="absolute inset-4 w-40 h-40 border-2 border-red-400/30 rounded-full animate-pulse"></div>
        
        {/* Main countdown number */}
        <div className="relative w-48 h-48 flex items-center justify-center">
          <div className="text-[120px] font-bold text-red-300 drop-shadow-2xl animate-pulse">
            {countdown}
          </div>
        </div>
        
        {/* Small warning text below */}
        <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 text-center">
          <p className="text-sm text-red-300/80 font-medium">
            Show your face to continue
          </p>
        </div>
      </div>
    </div>
  );

  const renderShuttingDownStage = () => (
    <div className="absolute inset-0 flex items-center justify-center">
      {/* Camera closing overlay */}
      <div className="relative">
        {/* Animated rings - blue instead of red */}
        <div className="absolute inset-0 w-48 h-48 border-4 border-blue-500/20 rounded-full animate-ping"></div>
        <div className="absolute inset-4 w-40 h-40 border-2 border-blue-400/30 rounded-full animate-pulse"></div>
        
        {/* Spinning camera icon in center */}
        <div className="relative w-48 h-48 flex items-center justify-center">
          <div className="p-6 bg-gradient-to-br from-blue-500/20 to-indigo-600/20 rounded-full">
            <Icon path={mdiLoading} className="w-24 h-24 text-blue-300 animate-spin" />
          </div>
        </div>
        
        {/* Small status text below */}
        <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 text-center">
          <p className="text-sm text-blue-300/80 font-medium">
            Closing camera...
          </p>
        </div>
      </div>
    </div>
  );

  const renderShutdownCompleteStage = () => (
    <div className="absolute inset-0 flex items-center justify-center">
      {/* Camera stopped overlay */}
      <div className="relative">
        {/* Static ring */}
        <div className="absolute inset-4 w-40 h-40 border-2 border-gray-500/30 rounded-full"></div>
        
        {/* Camera off icon in center */}
        <div className="relative w-48 h-48 flex items-center justify-center">
          <div className="p-6 bg-gradient-to-br from-gray-700/30 to-gray-800/30 rounded-full">
            <Icon path={mdiCameraOff} size={64} className="w-16 h-16 text-gray-400" />
          </div>
        </div>
        
        {/* Status text below */}
        <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 text-center">
          <p className="text-sm text-gray-400/80 font-medium">
            Camera stopped
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="absolute inset-0 z-[10002] bg-black/60 backdrop-blur-sm flex items-center justify-center transition-all duration-500">
      <div className="relative w-full h-full">
        {stage === 'countdown' && renderCountdownStage()}
        {stage === 'shutting-down' && renderShuttingDownStage()}
        {stage === 'shutdown-complete' && renderShutdownCompleteStage()}
      </div>
    </div>
  );
};

export default ShutdownTransition;
