import React, { useState, useEffect } from 'react';
import { mdiCog, mdiClose, mdiAutorenew, mdiCalendarCheck } from '@mdi/js';
import Icon from '../../../_components/Icon';
import CardBoxModal from '../../../_components/CardBox/Modal';

interface FlipFlopSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FlipFlopSettingsModal: React.FC<FlipFlopSettingsModalProps> = ({
  isOpen,
  onClose
}) => {
  const [autoApplyEnabled, setAutoApplyEnabled] = useState(true);
  const [autoApplyDelay, setAutoApplyDelay] = useState(10);
  const [gracePeriodDays, setGracePeriodDays] = useState(7);
  const [notificationEnabled, setNotificationEnabled] = useState(true);

  // Load settings from localStorage
  useEffect(() => {
    const settings = localStorage.getItem('flipFlopSettings');
    if (settings) {
      try {
        const parsed = JSON.parse(settings);
        setAutoApplyEnabled(parsed.autoApplyEnabled ?? true);
        setAutoApplyDelay(parsed.autoApplyDelay ?? 10);
        setGracePeriodDays(parsed.gracePeriodDays ?? 7);
        setNotificationEnabled(parsed.notificationEnabled ?? true);
      } catch (error) {
        console.warn('Failed to load flip-flop settings:', error);
      }
    }
  }, [isOpen]);

  const saveSettings = () => {
    const settings = {
      autoApplyEnabled,
      autoApplyDelay,
      gracePeriodDays,
      notificationEnabled,
      lastUpdated: new Date().toISOString()
    };
    
    localStorage.setItem('flipFlopSettings', JSON.stringify(settings));
    onClose();
  };

  const resetToDefaults = () => {
    setAutoApplyEnabled(true);
    setAutoApplyDelay(10);
    setGracePeriodDays(7);
    setNotificationEnabled(true);
  };

  return (
    <CardBoxModal
      title="Flip-Flop Schedule Settings"
      buttonColor="info"
      buttonLabel="Save Settings"
      isActive={isOpen}
      onConfirm={saveSettings}
      onCancel={onClose}
    >
      <div className="space-y-6">
        {/* Auto-apply setting */}
        <div className="flex items-start space-x-3">
          <div className="flex items-center h-5">
            <input
              id="auto-apply"
              type="checkbox"
              checked={autoApplyEnabled}
              onChange={(e) => setAutoApplyEnabled(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="auto-apply" className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Enable Auto-Apply
            </label>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Automatically apply flip-flop schedule changes when entering a new month
            </p>
          </div>
        </div>

        {/* Auto-apply delay */}
        {autoApplyEnabled && (
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              Auto-Apply Delay
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="range"
                min="5"
                max="30"
                value={autoApplyDelay}
                onChange={(e) => setAutoApplyDelay(Number(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[4rem]">
                {autoApplyDelay} seconds
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Countdown time before automatically applying changes
            </p>
          </div>
        )}

        {/* Grace period */}
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            Grace Period
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="range"
              min="1"
              max="15"
              value={gracePeriodDays}
              onChange={(e) => setGracePeriodDays(Number(e.target.value))}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[4rem]">
              {gracePeriodDays} days
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Number of days in the new month to show update reminders
          </p>
        </div>

        {/* Notifications */}
        <div className="flex items-start space-x-3">
          <div className="flex items-center h-5">
            <input
              id="notifications"
              type="checkbox"
              checked={notificationEnabled}
              onChange={(e) => setNotificationEnabled(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="notifications" className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Enable Notifications
            </label>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Show notifications and reminders for flip-flop schedule updates
            </p>
          </div>
        </div>

        {/* Reset button */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={resetToDefaults}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            Reset to defaults
          </button>
        </div>
      </div>
    </CardBoxModal>
  );
};
