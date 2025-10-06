"use client";

import React from 'react';
import { mdiCog } from '@mdi/js';
import CardBox from '../../../_components/CardBox';
import Icon from '../../../_components/Icon';

interface RecognitionControlsProps {
  recognitionThreshold: number;
  setRecognitionThreshold: (threshold: number) => void;
  showRecognitionControls: boolean;
  setShowRecognitionControls: (show: boolean) => void;
  minFaceSize: number;
  setMinFaceSize: (size: number) => void;
  maxFaceSize: number;
  setMaxFaceSize: (size: number) => void;
  detectionInterval: number;
  setDetectionInterval: (interval: number) => void;
}

const RecognitionControls: React.FC<RecognitionControlsProps> = ({
  recognitionThreshold,
  setRecognitionThreshold,
  showRecognitionControls,
  setShowRecognitionControls,
  minFaceSize,
  setMinFaceSize,
  maxFaceSize,
  setMaxFaceSize,
  detectionInterval,
  setDetectionInterval
}) => {
  return (
    <div className="mb-6">
      <CardBox className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-700">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg">
              <Icon path={mdiCog} className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Recognition Controls
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {showRecognitionControls 
                  ? 'Fine-tune detection parameters' 
                  : `Current threshold: ${recognitionThreshold}% • Face size: ${minFaceSize}-${maxFaceSize}px • Interval: ${detectionInterval}ms`
                }
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {!showRecognitionControls && (
              <div className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg text-sm font-bold">
                {recognitionThreshold}%
              </div>
            )}
            <div className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-semibold">
              AI Powered
            </div>
            <button
              onClick={() => setShowRecognitionControls(!showRecognitionControls)}
              className="px-4 py-2 text-sm bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
            >
              {showRecognitionControls ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
        
        {showRecognitionControls && (
          <div className="space-y-6">
            {/* Recognition Threshold */}
            <div className="bg-white dark:bg-gray-800/50 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <label className="text-lg font-semibold text-gray-800 dark:text-white">
                  Recognition Threshold
                </label>
                <div className="flex items-center space-x-2">
                  <div className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg text-sm font-bold">
                    {recognitionThreshold}%
                  </div>
                  <button
                    onClick={() => setRecognitionThreshold(65)}
                    className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    title="Reset to default (60%)"
                  >
                    Reset
                  </button>
                </div>
              </div>
              
              <div className="flex items-center space-x-4 mb-3">
                <div className="flex items-center space-x-2 text-sm">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-gray-600 dark:text-gray-400">Lenient (50%)</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="70"
                  step="5"
                  value={recognitionThreshold}
                  onChange={(e) => setRecognitionThreshold(Number(e.target.value))}
                  className="flex-1 h-3 bg-gradient-to-r from-green-200 via-yellow-200 to-red-200 dark:from-green-800 dark:via-yellow-800 dark:to-red-800 rounded-lg appearance-none cursor-pointer slider"
                  style={{
                    background: `linear-gradient(to right, 
                      #86efac 0%, 
                      #fcd34d ${((recognitionThreshold - 50) / 20) * 50}%, 
                      #fca5a5 ${((recognitionThreshold - 50) / 20) * 100}%)`
                  }}
                />
                <div className="flex items-center space-x-2 text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Strict (70%)</span>
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="text-lg font-bold text-green-600 dark:text-green-400">50%</div>
                  <div className="text-xs text-green-600 dark:text-green-400">Lenient</div>
                  <div className="text-xs text-gray-500 mt-1">Fast recognition</div>
                </div>
                <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">60%</div>
                  <div className="text-xs text-yellow-600 dark:text-yellow-400">Recommended</div>
                  <div className="text-xs text-gray-500 mt-1">Balanced</div>
                </div>
                <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="text-lg font-bold text-red-600 dark:text-red-400">70%</div>
                  <div className="text-xs text-red-600 dark:text-red-400">Strict</div>
                  <div className="text-xs text-gray-500 mt-1">High accuracy</div>
                </div>
              </div>

            </div>

            {/* Face Size Range */}
            <div className="bg-white dark:bg-gray-800/50 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <label className="text-lg font-semibold text-gray-800 dark:text-white">
                  Distance Control
                </label>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setMinFaceSize(130);
                      setMaxFaceSize(350);
                    }}
                    className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    title="Reset to default"
                  >
                    Reset
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Minimum Size (Far Distance)</label>
                    <span className="text-sm font-bold text-purple-600 dark:text-purple-400">{minFaceSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="60"
                    max="160"
                    step="10"
                    value={minFaceSize}
                    onChange={(e) => setMinFaceSize(Number(e.target.value))}
                    className="w-full h-2 bg-gradient-to-r from-blue-200 to-blue-500 dark:from-blue-800 dark:to-blue-500 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>60px (Very Far)</span>
                    <span>160px (Close)</span>
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Maximum Size (Near Distance)</label>
                    <span className="text-sm font-bold text-purple-600 dark:text-purple-400">{maxFaceSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="250"
                    max="400"
                    step="10"
                    value={maxFaceSize}
                    onChange={(e) => setMaxFaceSize(Number(e.target.value))}
                    className="w-full h-2 bg-gradient-to-r from-orange-200 to-red-500 dark:from-orange-800 dark:to-red-500 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>250px (Far)</span>
                    <span>400px (Very Close)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Detection Interval */}
            <div className="bg-white dark:bg-gray-800/50 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <label className="text-lg font-semibold text-gray-800 dark:text-white">
                  Detection Speed
                </label>
                <div className="flex items-center space-x-2">
                  <div className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg text-sm font-bold">
                    {detectionInterval}ms
                  </div>
                  <button
                    onClick={() => setDetectionInterval(1000)}
                    className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    title="Reset to default (1000ms)"
                  >
                    Reset
                  </button>
                </div>
              </div>
              
              <div className="flex items-center space-x-4 mb-3">
                <div className="flex items-center space-x-2 text-sm">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-gray-600 dark:text-gray-400">Fast (500ms)</span>
                </div>
                <input
                  type="range"
                  min="500"
                  max="1200"
                  step="100"
                  value={detectionInterval}
                  onChange={(e) => setDetectionInterval(Number(e.target.value))}
                  className="flex-1 h-3 bg-gradient-to-r from-green-200 via-yellow-200 to-red-200 dark:from-green-800 dark:via-yellow-800 dark:to-red-800 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex items-center space-x-2 text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Slow (1200ms)</span>
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="text-lg font-bold text-green-600 dark:text-green-400">500ms</div>
                  <div className="text-xs text-green-600 dark:text-green-400">Fast</div>
                  <div className="text-xs text-gray-500 mt-1">High CPU usage</div>
                </div>
                <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">1000ms</div>
                  <div className="text-xs text-yellow-600 dark:text-yellow-400">Balanced</div>
                  <div className="text-xs text-gray-500 mt-1">Recommended</div>
                </div>
                <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="text-lg font-bold text-red-600 dark:text-red-400">1200ms</div>
                  <div className="text-xs text-red-600 dark:text-red-400">Slow</div>
                  <div className="text-xs text-gray-500 mt-1">Low CPU usage</div>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center space-x-2 text-sm text-blue-700 dark:text-blue-300">
                  <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                    <span className="text-white text-xs">i</span>
                  </div>
                  <span className="font-medium">Detection Interval Info:</span>
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 leading-relaxed">
                  Lower values (500ms) provide faster detection but use more CPU resources. 
                  Higher values (1200ms) are more efficient but may feel less responsive. 
                  The default 1000ms provides a good balance between performance and responsiveness.
                </p>
              </div>
            </div>

          </div>
        )}
      </CardBox>
    </div>
  );
};

export default RecognitionControls;