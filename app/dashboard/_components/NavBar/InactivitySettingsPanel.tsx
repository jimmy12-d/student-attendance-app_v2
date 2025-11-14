// app/dashboard/_components/NavBar/InactivitySettingsPanel.tsx
"use client";

import React, { useState, useEffect } from 'react';
import Icon from '../../../_components/Icon';
import { mdiCog, mdiTimerSand, mdiCheck, mdiClose } from '@mdi/js';
import {
  getInactivitySettings,
  saveInactivitySettings,
  formatTimeout,
  type InactivitySettings,
  type InactivityTimeoutOption,
} from '../../../_utils/inactivitySettings';

interface InactivitySettingsPanelProps {
  onSettingsChange?: (settings: InactivitySettings) => void;
}

export default function InactivitySettingsPanel({ onSettingsChange }: InactivitySettingsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<InactivitySettings>(() => getInactivitySettings());

  useEffect(() => {
    // Load settings on mount
    const loadedSettings = getInactivitySettings();
    setSettings(loadedSettings);
  }, []);

  const handleToggleEnabled = () => {
    const newSettings: InactivitySettings = {
      ...settings,
      enabled: !settings.enabled,
    };
    setSettings(newSettings);
    saveInactivitySettings(newSettings);
    onSettingsChange?.(newSettings);
  };

  const handleTimeoutChange = (timeoutSeconds: InactivityTimeoutOption) => {
    const newSettings: InactivitySettings = {
      ...settings,
      timeoutSeconds,
    };
    setSettings(newSettings);
    saveInactivitySettings(newSettings);
    onSettingsChange?.(newSettings);
  };

  const timeoutOptions: InactivityTimeoutOption[] = [30, 60, 120];

  return (
    <div className="relative">
      {/* Settings Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors duration-200 relative"
        title="Inactivity Settings"
      >
        <Icon
          path={mdiCog}
          size={16}
          className="text-gray-600 dark:text-gray-300"
        />
        {settings.enabled && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full"></span>
        )}
      </button>

      {/* Settings Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-200 dark:border-slate-700 z-50">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Icon
                    path={mdiTimerSand}
                    size={20}
                    className="text-blue-600 dark:text-blue-400"
                  />
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Inactivity Timer
                  </h3>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <Icon
                    path={mdiClose}
                    size={18}
                    className="text-gray-600 dark:text-gray-300"
                  />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Enable/Disable Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium text-gray-900 dark:text-white">
                    Enable Timer
                  </label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Show inactivity warning
                  </p>
                </div>
                <button
                  onClick={handleToggleEnabled}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.enabled
                      ? 'bg-blue-600 dark:bg-blue-500'
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Timeout Duration */}
              <div className={settings.enabled ? '' : 'opacity-50 pointer-events-none'}>
                <label className="block font-medium text-gray-900 dark:text-white mb-2">
                  Timeout Duration
                </label>
                <div className="space-y-2">
                  {timeoutOptions.map((timeout) => (
                    <button
                      key={timeout}
                      onClick={() => handleTimeoutChange(timeout)}
                      disabled={!settings.enabled}
                      className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                        settings.timeoutSeconds === timeout
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
                          : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatTimeout(timeout)}
                      </span>
                      {settings.timeoutSeconds === timeout && (
                        <Icon
                          path={mdiCheck}
                          size={18}
                          className="text-blue-600 dark:text-blue-400"
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Info */}
              <div className="pt-2 border-t border-gray-200 dark:border-slate-700">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {settings.enabled
                    ? `You'll see a warning after ${formatTimeout(settings.timeoutSeconds)} of inactivity.`
                    : 'Inactivity timer is disabled.'}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
