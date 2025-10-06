"use client";

import React, { useState, useEffect } from 'react';
import Webcam from 'react-webcam';
import { mdiCamera, mdiCameraOff, mdiClose, mdiEye, mdiFaceRecognition, mdiClock } from '@mdi/js';
import Icon from '../../../_components/Icon';
import { TrackedFace } from '../utils/faceDetection';

interface ZoomModeOverlayProps {
  isZoomMode: boolean;
  isCameraActive: boolean;
  isCameraLoading: boolean;
  isCameraShutdown?: boolean;
  cameraShutdownCountdown?: number | null;
  selectedCamera: string;
  webcamRef: React.RefObject<Webcam | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  trackedFaces: TrackedFace[];
  recognitionThreshold: number;
  onExitZoomMode: () => void;
  onRestartCamera?: () => void;
  onUserMedia: () => void;
  onUserMediaError: (error: any) => void;
}

const ZoomModeOverlay: React.FC<ZoomModeOverlayProps> = ({
  isZoomMode,
  isCameraActive,
  isCameraLoading,
  isCameraShutdown = false,
  cameraShutdownCountdown = null,
  selectedCamera,
  webcamRef,
  canvasRef,
  trackedFaces,
  recognitionThreshold,
  onExitZoomMode,
  onRestartCamera,
  onUserMedia,
  onUserMediaError
}) => {
  const [isOnline, setIsOnline] = useState(true);

  // Monitor network status
  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    // Set initial status
    updateOnlineStatus();

    // Add event listeners
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Check status every 3 seconds for more accurate detection
    const intervalId = setInterval(updateOnlineStatus, 3000);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      clearInterval(intervalId);
    };
  }, []);

  if (!isZoomMode) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-white/10 backdrop-blur-2xl">
      {/* Exit Button */}
      <button
        onClick={onExitZoomMode}
        className="absolute top-6 right-6 z-[10000] p-3 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg transition-all duration-200 transform hover:scale-105"
        title="Stop Scanning (ESC)"
      >
        <Icon path={mdiClose} className="w-6 h-6" />
      </button>

      {/* Dynamic Instructions */}
      <div className="absolute top-6 left-6 z-[10000] bg-black/70 backdrop-blur-sm rounded-xl p-4 max-w-md">
        <div className="text-white">
          <h3 className="text-lg font-semibold text-blue-300 mb-3 flex items-center space-x-2">
            <Icon path={mdiFaceRecognition} className="w-5 h-5" />
            <span>Face Scanning Instructions</span>
          </h3>
          <div className="space-y-2 text-base">
            <p className="flex items-center space-x-2">
              <Icon path={mdiEye} className="w-4 h-4 text-blue-400" />
              <span>Look directly at the camera</span>
            </p>
            <p className="flex items-center space-x-2">
              <Icon path={mdiFaceRecognition} className="w-4 h-4 text-green-400" />
              <span>Position your face in the center</span>
            </p>
            <p className="flex items-center space-x-2">
              <Icon path={mdiClock} className="w-4 h-4 text-yellow-400" />
              <span>Hold position for 2 seconds</span>
            </p>
            {/* Network Status Indicator */}
            <div className="flex items-center space-x-2 pt-2">
              <div className="relative">
                <div className={`w-3 h-3 rounded-full ${
                  isOnline ? 'bg-green-500' : 'bg-red-500'
                } shadow-lg ${isOnline ? 'shadow-green-500/50' : 'shadow-red-500/50'}`}></div>
                {isOnline && (
                  <div className="absolute inset-0 w-3 h-3 rounded-full bg-green-500 animate-ping opacity-75"></div>
                )}
              </div>
              <span className={`text-sm ${isOnline ? 'text-green-400' : 'text-red-400'}`}>
                {isOnline ? 'Connected to Internet' : 'No Connection to Internet'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Student Recognition Display */}
      {trackedFaces.length > 0 && (
        <div className="absolute bottom-6 left-6 right-6 z-[10000]">
          <div className="grid grid-cols-1 gap-3">
            {/* Minimal Sophisticated Student Recognition Cards */}
            {trackedFaces.map(face => (
              <div key={face.id} className={`group relative overflow-hidden rounded-2xl backdrop-blur-xl border transition-all duration-700 ease-out transform hover:scale-[1.01] ${
                face.status === 'recognizing'
                  ? 'bg-gradient-to-r from-slate-900/80 via-gray-900/60 to-slate-900/80 border-gray-400/30 shadow-2xl shadow-gray-500/10'
                  : face.status === 'recognized' && face.attendanceStatus === 'late'
                  ? 'bg-gradient-to-r from-yellow-900/90 via-amber-900/70 to-yellow-900/90 border-yellow-400/40 shadow-2xl shadow-yellow-500/15'
                  : face.status === 'recognized' && face.name
                  ? 'bg-gradient-to-r from-green-900/90 via-emerald-900/70 to-green-900/90 border-green-400/40 shadow-2xl shadow-green-500/15'
                  : face.name
                  ? 'bg-gradient-to-r from-green-900/90 via-emerald-900/70 to-green-900/90 border-green-400/40 shadow-2xl shadow-green-500/15'
                  : 'bg-gradient-to-r from-slate-900/80 via-gray-900/60 to-slate-900/80 border-gray-400/30 shadow-2xl shadow-gray-500/10'
              }`}>
                {/* Subtle animated background */}
                <div className="absolute inset-0 opacity-5">
                  <div className={`absolute inset-0 ${
                    face.status === 'recognizing'
                      ? 'bg-gradient-to-r from-gray-500/20 to-transparent animate-pulse'
                      : face.status === 'recognized' && face.attendanceStatus === 'late' 
                      ? 'bg-gradient-to-r from-amber-500/20 to-transparent' 
                      : face.name ? 'bg-gradient-to-r from-emerald-500/20 to-transparent' : 'bg-gradient-to-r from-gray-500/20 to-transparent'
                  }`}></div>
                </div>

                <div className="relative p-6">
                  <div className="flex items-center justify-between">
                    {/* Minimal Student Info */}
                    <div className="flex-1 space-y-3">
                      {face.name ? (
                        <>
                          {/* Elegant Name Display */}
                          <div className="flex items-center space-x-4">
                            <div className={`text-7xl font-light tracking-tight ${
                              face.status === 'recognizing' ? 'text-gray-200' :
                              face.status === 'recognized' && face.attendanceStatus === 'late' ? 'text-amber-200' : 'text-emerald-200'
                            }`}>
                              {face.name}
                            </div>
                            {/* Loading Spinner for recognizing state */}
                            {face.status === 'recognizing' && (
                              <div className="relative w-12 h-12">
                                <div className="absolute inset-0 border-4 border-gray-200/30 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-t-gray-400 rounded-full animate-spin"></div>
                              </div>
                            )}
                            {/* Minimal Status Indicator for other states */}
                            {face.status !== 'recognizing' && (
                              <div className={`px-3 py-1 rounded-full text-xs font-medium tracking-wider ${
                                face.status === 'recognized' && face.attendanceStatus === 'late'
                                ? 'bg-amber-500/20 text-amber-200 border border-amber-400/30'
                                : 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30'
                              }`}>
                                {face.status === 'recognized' && face.attendanceStatus === 'late' ? 'LATE' : '✓'}
                              </div>
                            )}
                          </div>

                          {/* Clean Status Line */}
                          <div className="flex items-center space-x-3">
                            <div className={`w-2 h-2 rounded-full ${
                              face.status === 'recognizing' 
                                ? 'bg-gray-400 animate-pulse'
                                : face.status === 'recognized' && face.attendanceStatus === 'late' 
                                ? 'bg-amber-400' 
                                : 'bg-emerald-400'
                            }`}></div>
                            <span className="text-2xl font-light text-gray-200 tracking-wide">
                              {face.status === 'recognizing' 
                                ? 'MARKING ATTENDANCE...'
                                : face.status === 'recognized' && face.attendanceStatus === 'late' 
                                ? 'LATE ARRIVAL' 
                                : 'PRESENT'}
                            </span>
                          </div>

                          {/* Minimal Time & Confidence */}
                          <div className="flex items-center space-x-6 pt-2">
                            <div className="text-lg font-mono text-gray-400 tracking-wider">
                              {new Date().toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false
                              })}
                            </div>
                            {face.confidence && (
                              <div className={`text-sm font-medium px-2 py-1 rounded-md ${
                                face.confidence >= recognitionThreshold
                                  ? 'bg-emerald-500/10 text-emerald-300'
                                  : 'bg-red-500/10 text-red-300'
                              }`}>
                                {face.confidence.toFixed(0)}%
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Minimal Unknown State */}
                          <div className="flex items-center space-x-4">
                            <div className="text-5xl font-light text-gray-400 tracking-tight">
                              {face.status === 'detecting' ? 'DETECTING' :
                               face.status === 'recognizing' ? 'RECOGNIZING' :
                               face.status === 'unknown' ? 'UNKNOWN' : 'PROCESSING'}
                            </div>
                            <div className="w-8 h-8 rounded-full bg-gray-500/20 flex items-center justify-center">
                              <div className="w-4 h-4 bg-gray-400 rounded-full animate-pulse"></div>
                            </div>
                          </div>
                          <div className="text-lg text-gray-500 font-light tracking-wide">
                            {face.message || 'Position face in frame'}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Sophisticated Status Orb */}
                    <div className="flex flex-col items-center space-y-3 ml-8">
                      <div className={`relative w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
                        face.status === 'recognizing'
                          ? 'bg-gray-500/20 border-gray-400/60 shadow-lg shadow-gray-500/20'
                          : face.status === 'scanning'
                          ? 'bg-blue-500/20 border-blue-400/60 shadow-lg shadow-blue-500/20'
                          : face.status === 'recognized'
                          ? face.attendanceStatus === 'late'
                            ? 'bg-amber-500/20 border-amber-400/60 shadow-lg shadow-amber-500/20'
                            : 'bg-emerald-500/20 border-emerald-400/60 shadow-lg shadow-emerald-500/20'
                          : face.status === 'unknown'
                          ? 'bg-red-500/20 border-red-400/60 shadow-lg shadow-red-500/20'
                          : 'bg-gray-500/20 border-gray-400/60 shadow-lg shadow-gray-500/20'
                      }`}>
                        <div className="w-6 h-6 bg-white/90 rounded-full"></div>
                        {/* Subtle pulsing ring */}
                        <div className={`absolute inset-0 rounded-full border border-white/20 ${
                          face.status === 'recognizing' ? 'animate-ping' :
                          face.status === 'scanning' ? 'animate-ping' :
                          'opacity-0'
                        }`}></div>
                      </div>

                      {/* Minimal status text */}
                      <div className="text-center">
                        <div className={`font-medium uppercase tracking-widest ${
                          face.status === 'recognizing' ? 'text-base text-gray-300' :
                          face.status === 'scanning' ? 'text-base text-blue-300' :
                          face.status === 'recognized' 
                            ? face.attendanceStatus === 'late' 
                              ? 'text-2xl text-amber-300' 
                              : 'text-2xl text-emerald-300'
                            : face.status === 'unknown' ? 'text-base text-red-300' : 'text-base text-gray-300'
                        }`}>
                          {face.status === 'recognizing' ? 'Marking' :
                           face.status === 'scanning' ? 'Active' :
                           face.status === 'recognized' 
                             ? face.attendanceStatus === 'late' 
                               ? 'Late Arrival' 
                               : 'Present'
                             : face.status === 'unknown' ? 'Error' : 'Wait'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Minimal Progress Bar */}
                  {(face.isScanning || face.status === 'recognizing') && (
                    <div className="mt-6">
                      <div className="w-full bg-gray-700/30 rounded-full h-1 overflow-hidden">
                        <div className={`h-full rounded-full animate-pulse ${
                          face.status === 'recognizing' 
                            ? 'bg-gradient-to-r from-gray-400 to-gray-500' 
                            : face.attendanceStatus === 'late'
                            ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                            : 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                        }`}
                             style={{width: '100%'}}></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading Overlay for Camera Initialization */}
      {isCameraLoading && (
        <div className="absolute inset-0 z-[10001] bg-gradient-to-br from-blue-900 via-slate-900 to-indigo-900 flex items-center justify-center">
          {/* Animated Background Pattern */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
          </div>
          
          {/* Subtle Grid Pattern */}
          <div className="absolute inset-0 opacity-5" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
            backgroundSize: '20px 20px'
          }}></div>
          
          <div className="relative text-center text-white max-w-md mx-auto px-8">
            <div className="relative mx-auto mb-8">
              {/* Enhanced Animated Camera Icon */}
              <div className="relative w-32 h-32 mx-auto mb-6">
                {/* Outer spinning ring */}
                <div className="absolute inset-0 border-4 border-blue-500/30 border-t-blue-400 border-r-indigo-400 rounded-full animate-spin"></div>
                {/* Inner pulsing ring */}
                <div className="absolute inset-3 border-2 border-indigo-400/40 border-b-purple-400 rounded-full animate-spin" style={{animationDirection: 'reverse', animationDuration: '3s'}}></div>
                {/* Camera icon with glow */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="p-4 bg-gradient-to-br from-blue-500/20 to-indigo-600/20 rounded-full backdrop-blur-sm">
                    <Icon path={mdiCamera} className="w-12 h-12 text-blue-300 drop-shadow-lg animate-pulse" />
                  </div>
                </div>
                {/* Orbiting dots */}
                <div className="absolute inset-0">
                  <div className="w-3 h-3 bg-blue-400 rounded-full absolute -top-1 left-1/2 transform -translate-x-1/2 animate-ping"></div>
                  <div className="w-2 h-2 bg-indigo-400 rounded-full absolute top-1/2 -right-1 transform -translate-y-1/2 animate-ping" style={{animationDelay: '0.5s'}}></div>
                  <div className="w-3 h-3 bg-purple-400 rounded-full absolute -bottom-1 left-1/2 transform -translate-x-1/2 animate-ping" style={{animationDelay: '1s'}}></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full absolute top-1/2 -left-1 transform -translate-y-1/2 animate-ping" style={{animationDelay: '1.5s'}}></div>
                </div>
              </div>
            </div>
            
            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-300 via-indigo-300 to-purple-300 bg-clip-text text-transparent drop-shadow-lg">
              Starting Camera
            </h2>
            <p className="text-xl text-blue-100 mb-8 drop-shadow-md">Initializing face recognition system...</p>
            
            {/* Enhanced Loading Animation */}
            <div className="flex justify-center space-x-3 mb-8">
              <div className="w-4 h-4 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full animate-bounce drop-shadow-lg"></div>
              <div className="w-4 h-4 bg-gradient-to-r from-indigo-400 to-indigo-500 rounded-full animate-bounce drop-shadow-lg" style={{animationDelay: '0.1s'}}></div>
              <div className="w-4 h-4 bg-gradient-to-r from-purple-400 to-purple-500 rounded-full animate-bounce drop-shadow-lg" style={{animationDelay: '0.2s'}}></div>
            </div>
            
            {/* Enhanced Progress Bar */}
            <div className="w-80 mx-auto bg-slate-800/60 backdrop-blur-sm rounded-full h-3 overflow-hidden border border-blue-500/20 shadow-lg">
              <div className="bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500 h-full rounded-full animate-pulse shadow-lg shadow-blue-500/20"
                   style={{
                     background: 'linear-gradient(90deg, #60a5fa, #6366f1, #8b5cf6)',
                     animation: 'pulse 2s ease-in-out infinite'
                   }}>
              </div>
            </div>
            
            {/* Status Text */}
            <p className="text-sm text-blue-200/80 mt-6 font-medium tracking-wide">
              Please allow camera access when prompted
            </p>
          </div>
        </div>
      )}

      {/* Full Screen Camera */}
      <div className="w-full h-full relative">
        {isCameraActive ? (
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            className="w-full h-full object-cover"
            videoConstraints={{ 
              // Optimized for iPad Safari performance
              facingMode: 'user',
              deviceId: selectedCamera ? { exact: selectedCamera } : undefined,
              width: { ideal: 640, max: 800 }, // Reduced from 1280 for better performance
              height: { ideal: 480, max: 600 }, // Reduced from 720 for better performance
            //  frameRate: { ideal: 15, max: 20 } // Added frame rate limit for mobile devices
            }}
            style={{ transform: "scaleX(-1)" }}
            onUserMedia={onUserMedia}
            onUserMediaError={onUserMediaError}
          />
        ) : isCameraShutdown ? (
          // Camera shutdown due to inactivity - show restart UI
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-gray-900 to-blue-900">
            {/* Animated Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
              <div className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
            </div>
            
            <div className="relative text-center text-white max-w-lg mx-auto px-8">
              {/* Camera Off Icon with Animation */}
              <div className="relative mx-auto mb-8">
                <div className="relative w-48 h-48 mx-auto mb-6">
                  {/* Pulsing ring */}
                  <div className="absolute inset-0 border-4 border-red-500/30 border-t-red-400 rounded-full animate-pulse"></div>
                  {/* Camera icon */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="p-6 bg-gradient-to-br from-red-500/20 to-orange-600/20 rounded-full backdrop-blur-sm">
                      <Icon path={mdiCameraOff} size={80} className="w-24 h-24 text-red-300" />
                    </div>
                  </div>
                </div>
              </div>
              
              <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-red-300 via-orange-300 to-yellow-300 bg-clip-text text-transparent">
                Camera Stopped
              </h2>
              <p className="text-xl text-gray-300 mb-8">
                No faces detected for 45 seconds. Camera was automatically stopped.
              </p>
              
              {/* Restart Button */}
              <div className="space-y-6">
                <button
                  onClick={onRestartCamera}
                  className="group relative px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/25"
                >
                  <div className="flex items-center space-x-3">
                    <Icon path={mdiCamera} size={32} className="w-6 h-6 group-hover:animate-pulse" />
                    <span>Restart Camera</span>
                  </div>
                  {/* Subtle glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-indigo-500/20 rounded-xl blur group-hover:blur-md transition-all duration-300 -z-10"></div>
                </button>
                
                <p className="text-sm text-gray-400">
                  Click to restart face recognition scanning
                </p>
              </div>
            </div>
          </div>
        ) : (
          // Camera is off - default state
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center text-white">
              <Icon path={mdiCameraOff} className="w-24 h-24 mx-auto mb-4 text-gray-400" />
              <p className="text-2xl font-medium">Camera is off</p>
              <p className="text-gray-400 text-lg mt-2">Start scan to use zoom mode</p>
            </div>
          </div>
        )}
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full pointer-events-none z-10"
        />
      </div>
    </div>
  );
};

export default ZoomModeOverlay;
