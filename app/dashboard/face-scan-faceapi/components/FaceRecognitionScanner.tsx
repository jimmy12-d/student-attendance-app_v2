// "use client";

// import React from 'react';
// import Webcam from 'react-webcam';
// import { mdiCamera, mdiCameraOff, mdiFaceRecognition, mdiCheck } from '@mdi/js';
// import CardBox from '../../../_components/CardBox';
// import Icon from '../../../_components/Icon';
// import CustomDropdown from '../../students/components/CustomDropdown';
// import { TrackedFace } from '../utils/faceDetection';

// interface FaceRecognitionScannerProps {
//   isCameraActive: boolean;
//   isCameraLoading: boolean;
//   selectedShift: string;
//   selectedCamera: string;
//   setSelectedCamera: (camera: string) => void;
//   availableCameras: { value: string; label: string; }[];
//   loadCameras: () => void;
//   webcamRef: React.RefObject<Webcam>;
//   canvasRef: React.RefObject<HTMLCanvasElement>;
//   trackedFaces: TrackedFace[];
//   recognitionThreshold: number;
//   isZoomMode: boolean;
//   onStartScan: () => void;
//   onStopCamera: () => void;
//   onUserMedia?: () => void;
//   onUserMediaError?: (error: any) => void;
// }

// const FaceRecognitionScanner: React.FC<FaceRecognitionScannerProps> = ({
//   isCameraActive,
//   isCameraLoading,
//   selectedShift,
//   selectedCamera,
//   setSelectedCamera,
//   availableCameras,
//   loadCameras,
//   webcamRef,
//   canvasRef,
//   trackedFaces,
//   recognitionThreshold,
//   isZoomMode,
//   onStartScan,
//   onStopCamera,
//   onUserMedia,
//   onUserMediaError
// }) => {
//   return (
//     <div className="lg:col-span-2">
//       <CardBox className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
//         <div className="p-6 border-b border-gray-100 dark:border-gray-700">
//           <div className="flex items-center justify-between">
//             <div className="flex items-center space-x-3">
//               <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
//                 <Icon path={mdiCamera} className="w-5 h-5 text-blue-600 dark:text-blue-400" />
//               </div>
//               <div>
//                 <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Face Recognition Scanner</h3>
//                 <p className="text-sm text-gray-600 dark:text-gray-400">AI-powered attendance scanning</p>
//               </div>
//             </div>
//             <div className="flex items-center space-x-3">
//               <button
//                 onClick={async () => {
//                   if (isCameraActive) {
//                     onStopCamera();
//                   } else {
//                     onStartScan();
//                   }
//                 }}
//                 disabled={(!selectedShift && !isCameraActive) || isCameraLoading}
//                 className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-md flex items-center space-x-2 ${
//                   (!selectedShift && !isCameraActive) || isCameraLoading
//                     ? 'bg-gray-400 text-white cursor-not-allowed'
//                     : isCameraActive
//                     ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white'
//                     : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white'
//                 }`}
//               >
//                 {isCameraLoading ? (
//                   <>
//                     <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
//                     <span>Starting...</span>
//                   </>
//                 ) : (
//                   <span>{isCameraActive ? 'Stop Scan' : 'Start Scan'}</span>
//                 )}
//               </button>
//             </div>
//           </div>
//         </div>

//         <div className="p-6">
//           {/* Camera Selection */}
//           <div className="mb-4">
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               <CustomDropdown
//                 id="camera-selection"
//                 label="Select Camera"
//                 value={selectedCamera}
//                 onChange={setSelectedCamera}
//                 options={availableCameras}
//                 placeholder="Choose camera..."
//                 searchable={false}
//                 className="w-full"
//                 disabled={isCameraActive}
//               />
              
//               <div className="flex items-end">
//                 <button
//                   onClick={loadCameras}
//                   disabled={isCameraActive}
//                   className={`px-4 py-2.5 rounded-lg font-medium transition-all duration-200 text-sm flex items-center space-x-2 ${
//                     isCameraActive
//                       ? 'bg-gray-400 text-white cursor-not-allowed'
//                       : 'bg-blue-500 hover:bg-blue-600 text-white'
//                   }`}
//                   title="Refresh camera list"
//                 >
//                   <span>Refresh Cameras</span>
//                 </button>
//               </div>
//             </div>
//           </div>

//           <div className={`relative bg-gray-900 dark:bg-black rounded-lg overflow-hidden aspect-video ${isZoomMode ? 'hidden' : ''}`}>
//             {!isCameraActive && !isCameraLoading ? (
//               <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 via-gray-900 to-slate-800">
//                 <div className="text-center max-w-md mx-auto p-8">
//                   <div className="relative mb-6">
//                     <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
//                       <Icon path={mdiFaceRecognition} className="w-10 h-10 text-white" />
//                     </div>
//                     <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
//                       <Icon path={mdiCameraOff} className="w-4 h-4 text-gray-300" />
//                     </div>
//                   </div>
//                   <h3 className="text-white text-xl font-semibold mb-3">Face Recognition Ready</h3>
//                   <p className="text-gray-300 text-sm mb-4">Select a shift and click "Start Scan" to begin attendance recognition</p>
//                   <div className="flex items-center justify-center space-x-4 text-xs text-gray-400">
//                     <div className="flex items-center space-x-1">
//                       <div className="w-2 h-2 bg-green-400 rounded-full"></div>
//                       <span>Ready</span>
//                     </div>
//                     <div className="flex items-center space-x-1">
//                       <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
//                       <span>AI Powered</span>
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             ) : isCameraLoading ? (
//               <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-900 to-indigo-900">
//                 <div className="text-center">
//                   <div className="relative mb-6">
//                     <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-300 border-t-transparent mx-auto"></div>
//                     <Icon path={mdiCamera} className="w-8 h-8 text-blue-300 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
//                   </div>
//                   <p className="text-white text-lg font-medium mb-2">Initializing Camera</p>
//                   <p className="text-blue-200 text-sm">Please wait while we connect to your camera...</p>
//                 </div>
//               </div>
//             ) : (
//               <>
//                 {/* Webcam Component for active camera */}
//                 <Webcam
//                   audio={false}
//                   ref={webcamRef}
//                   screenshotFormat="image/jpeg"
//                   className="w-full h-full object-cover"
//                   videoConstraints={{ 
//                     facingMode: 'user',
//                     deviceId: selectedCamera ? { exact: selectedCamera } : undefined,
//                     width: { ideal: 1280 },
//                     height: { ideal: 720 }
//                   }}
//                   style={{ transform: "scaleX(-1)" }}
//                   onUserMedia={() => {
//                     console.log('Camera stream ready');
//                     onUserMedia?.();
//                   }}
//                   onUserMediaError={(error) => {
//                     console.error('Camera error:', error);
//                     onUserMediaError?.(error);
//                   }}
//                 />
//               </>
//             )}
//             <canvas
//               ref={canvasRef}
//               className={`absolute top-0 left-0 w-full h-full pointer-events-none z-10 ${isZoomMode ? 'hidden' : ''}`}
//             />
//           </div>

//           {/* Detection Status */}
//           {trackedFaces.length > 0 && (
//             <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
//               <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
//                 Recognition Status:
//               </h4>
              
//               <div className="space-y-3">
//                 {trackedFaces.map(face => (
//                   <div key={face.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
//                     <div className="flex items-center justify-between">
//                       <div className="flex items-center space-x-3">
//                         <div className={`w-4 h-4 rounded-full ${
//                           face.status === 'scanning' ? 'bg-green-500 animate-pulse' :
//                           face.status === 'recognized' ? 'bg-green-500 dark:bg-green-400' :
//                           face.status === 'recognizing' ? 'bg-blue-500 dark:bg-blue-400' :
//                           face.status === 'unknown' ? 'bg-red-500 dark:bg-red-400' : 'bg-gray-500 dark:bg-gray-400'
//                         }`}></div>
                        
//                         <div>
//                           {face.name ? (
//                             <>
//                               <div className={`text-2xl font-bold ${
//                                 face.attendanceStatus === 'late' ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'
//                               }`}>
//                                 {face.name}
//                               </div>
//                               <div className={`text-sm font-medium ${
//                                 face.isScanning ? 'text-blue-600 dark:text-blue-400' :
//                                 face.attendanceStatus === 'late' ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'
//                               }`}>
//                                 {face.isScanning ? 'Marking Attendance...' : 
//                                  face.attendanceStatus === 'late' ? 'Late Arrival' : 'Present'}
//                               </div>
//                             </>
//                           ) : (
//                             <>
//                               <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">
//                                 {face.status === 'detecting' ? 'Detecting...' :
//                                  face.status === 'recognizing' ? 'Recognizing...' :
//                                  face.status === 'unknown' ? 'Unknown Person' : 'Processing...'}
//                               </div>
//                               <div className="text-sm text-gray-600 dark:text-gray-400">
//                                 {face.message || 'Hold position for recognition'}
//                               </div>
//                             </>
//                           )}
//                         </div>
//                       </div>
                      
//                       {face.confidence && !face.isScanning && (
//                         <div className={`text-lg font-bold ${
//                           face.confidence >= recognitionThreshold 
//                             ? 'text-green-600 dark:text-green-400' 
//                             : 'text-red-500 dark:text-red-400'
//                         }`}>
//                           {face.confidence.toFixed(1)}%
//                         </div>
//                       )}
//                     </div>
                    
//                     {face.isScanning && (
//                       <div className="mt-3">
//                         <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
//                           <div className="bg-green-500 h-2 rounded-full animate-pulse" style={{width: '100%'}}></div>
//                         </div>
//                       </div>
//                     )}
//                   </div>
//                 ))}
//               </div>
//             </div>
//           )}
//         </div>
//       </CardBox>
//     </div>
//   );
// };

// export default FaceRecognitionScanner;
