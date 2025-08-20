import React from 'react';
import LoadingSpinner from '../../../_components/LoadingSpinner';

interface RecognitionSectionProps {
  handleRecognition: () => void;
  isRecognizing: boolean;
  isEnrolling: boolean;
}

export const RecognitionSection: React.FC<RecognitionSectionProps> = ({
  handleRecognition,
  isRecognizing,
  isEnrolling,
}) => {
  return (
    <div className="space-y-4">
      <h4 className="text-lg font-semibold">Mark Attendance</h4>
      <p className="text-gray-600">Click the button below and look at your camera to mark attendance.</p>
      
      <button
        onClick={handleRecognition}
        disabled={isRecognizing || isEnrolling}
        className={`w-full px-6 py-4 font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-opacity-75 transition duration-150 ease-in-out ${
          isRecognizing || isEnrolling
            ? 'bg-gray-400 text-white cursor-not-allowed'
            : 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-400'
        }`}
      >
        {isRecognizing ? (
          <div className="flex items-center justify-center">
            <LoadingSpinner />
            <span className="ml-2">Recognizing...</span>
          </div>
        ) : (
          'Start Attendance Recognition'
        )}
      </button>
      
      <div className="text-sm text-gray-500">
        <p>• Ensure good lighting</p>
        <p>• Look directly at the camera</p>
        <p>• Remove glasses if recognition fails</p>
      </div>
    </div>
  );
};
