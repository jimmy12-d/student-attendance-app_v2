"use client";

import { useState, useEffect } from 'react';
import Icon from '../../../_components/Icon';
import { mdiCog, mdiClose, mdiAlertCircle, mdiAlert, mdiCheckCircle, mdiInformation } from '@mdi/js';
import { OVERLAY_CONFIGS, getEnabledOverlays } from './overlayConfigs';

interface OverlaySettingsProps {
  onClose?: () => void;
}

export const OverlaySettings = ({ onClose }: OverlaySettingsProps) => {
  const [overlayStates, setOverlayStates] = useState<Record<string, boolean>>({});

  // Load overlay states from localStorage
  useEffect(() => {
    const states: Record<string, boolean> = {};
    Object.keys(OVERLAY_CONFIGS).forEach(key => {
      const saved = localStorage.getItem(`overlay-${key}`);
      states[key] = saved !== null ? saved === 'true' : OVERLAY_CONFIGS[key].enabled;
    });
    setOverlayStates(states);
  }, []);

  // Toggle overlay and save to localStorage
  const toggleOverlay = (key: string) => {
    const newState = !overlayStates[key];
    setOverlayStates(prev => ({
      ...prev,
      [key]: newState
    }));
    
    // Save to localStorage
    localStorage.setItem(`overlay-${key}`, newState.toString());
    
    // Update the config
    OVERLAY_CONFIGS[key].enabled = newState;
  };

  // Get color for overlay type
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'error': return 'text-red-600 bg-red-100';
      case 'warning': return 'text-orange-600 bg-orange-100';
      case 'success': return 'text-green-600 bg-green-100';
      case 'info': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Get icon for overlay type
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'error': return mdiAlertCircle;
      case 'warning': return mdiAlert;
      case 'success': return mdiCheckCircle;
      case 'info': return mdiInformation;
      default: return mdiInformation;
    }
  };

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl shadow-2xl ring-1 ring-white/20 dark:ring-gray-700/50 w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden flex flex-col" role="dialog" aria-labelledby="overlay-settings-title" aria-modal="true">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/20 dark:border-gray-700/50 bg-gradient-to-r from-green-50/50 to-transparent dark:from-green-900/20 dark:to-transparent">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 dark:bg-green-900 p-2 rounded-lg">
              <Icon path={mdiCog} size={24} className="text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 id="overlay-settings-title" className="text-2xl font-bold text-gray-900 dark:text-white">
                Overlay Settings
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Enable or disable overlay conditions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Icon path={mdiClose} size={24} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Overlay List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-transparent to-gray-50/30 dark:to-gray-900/30">
          {Object.entries(OVERLAY_CONFIGS).map(([key, config]) => (
            <div
              key={key}
              className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm rounded-2xl p-5 border border-white/20 dark:border-gray-700/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ring-1 ring-white/10 dark:ring-gray-700/30"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Overlay Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 rounded-md text-xs font-semibold ${getTypeColor(config.type)} flex items-center gap-1`}>
                      <Icon path={getTypeIcon(config.type)} size={12} />
                      {config.type.toUpperCase()}
                    </span>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      {config.title}
                    </h3>
                  </div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {config.message}
                  </p>
                  {config.subtitle && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {config.subtitle}
                    </p>
                  )}
                  {config.policyText && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">
                      📋 {config.policyText}
                    </p>
                  )}
                </div>

                {/* Toggle Switch */}
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={overlayStates[key]}
                    onChange={() => toggleOverlay(key)}
                    aria-label={`${config.title} toggle`}
                  />
                  <div className={`w-11 h-6 ${overlayStates[key] ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-700'} peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600`}></div>
                </label>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/20 dark:border-gray-700/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {getEnabledOverlays().length} of {Object.keys(OVERLAY_CONFIGS).length} overlays enabled
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-all hover:scale-105"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
