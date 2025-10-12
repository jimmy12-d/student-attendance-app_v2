import React, { useState, useEffect } from 'react';
import { db } from '../../../../firebase-config';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { AbsentNotificationSettings } from '../../../_interfaces';
import CardBox from '../../../_components/CardBox';
import SectionTitleLineWithButton from '../../../_components/Section/TitleLineWithButton';
import { mdiBellAlert } from '@mdi/js';
import { toast } from 'sonner';
import { useAuthContext } from '../../../_contexts/AuthContext';

export const AbsentNotificationSettingsComponent: React.FC = () => {
  const { currentUser } = useAuthContext();
  const [settings, setSettings] = useState<AbsentNotificationSettings>({
    morningTriggerTime: '09:00',
    afternoonTriggerTime: '14:00',
    eveningTriggerTime: '18:00',
    enabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const settingsDoc = await getDoc(doc(db, 'absentNotificationSettings', 'default'));
      
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        setSettings({
          morningTriggerTime: data.morningTriggerTime || '09:00',
          afternoonTriggerTime: data.afternoonTriggerTime || '14:00',
          eveningTriggerTime: data.eveningTriggerTime || '18:00',
          enabled: data.enabled ?? true,
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load notification settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      await setDoc(doc(db, 'absentNotificationSettings', 'default'), {
        ...settings,
        updatedAt: Timestamp.now(),
        updatedBy: currentUser?.email || 'unknown',
      });
      
      toast.success('Notification settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save notification settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTimeChange = (shift: 'morning' | 'afternoon' | 'evening', value: string) => {
    setSettings(prev => ({
      ...prev,
      [`${shift}TriggerTime`]: value,
    }));
  };

  if (loading) {
    return (
      <CardBox>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">Loading settings...</span>
        </div>
      </CardBox>
    );
  }

  return (
    <div className="space-y-6">
      <SectionTitleLineWithButton 
        icon={mdiBellAlert} 
        title="Parent Absence Notification Settings"
      />
      
      <CardBox>
        <div className="p-6 space-y-6">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center space-x-3">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Automatic Notifications</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Send automatic notifications to parents when students are absent</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={settings.enabled}
                onChange={(e) => setSettings(prev => ({ ...prev, enabled: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Trigger Time Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Notification Trigger Times
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Set the time when parents should be notified about absent students for each shift. Notifications will be sent automatically at these times.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Morning Shift */}
              <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="flex items-center mb-3">
                  <svg className="w-5 h-5 text-orange-600 dark:text-orange-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
                  </svg>
                  <h4 className="font-semibold text-orange-800 dark:text-orange-300">🌅 Morning Shift</h4>
                </div>
                <input
                  type="time"
                  value={settings.morningTriggerTime}
                  onChange={(e) => handleTimeChange('morning', e.target.value)}
                  className="w-full px-3 py-2 border border-orange-300 dark:border-orange-700 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  disabled={!settings.enabled}
                />
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                  Notifications sent at {settings.morningTriggerTime}
                </p>
              </div>

              {/* Afternoon Shift */}
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-center mb-3">
                  <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
                  </svg>
                  <h4 className="font-semibold text-yellow-800 dark:text-yellow-300">☀️ Afternoon Shift</h4>
                </div>
                <input
                  type="time"
                  value={settings.afternoonTriggerTime}
                  onChange={(e) => handleTimeChange('afternoon', e.target.value)}
                  className="w-full px-3 py-2 border border-yellow-300 dark:border-yellow-700 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  disabled={!settings.enabled}
                />
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                  Notifications sent at {settings.afternoonTriggerTime}
                </p>
              </div>

              {/* Evening Shift */}
              <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                <div className="flex items-center mb-3">
                  <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                  <h4 className="font-semibold text-indigo-800 dark:text-indigo-300">🌙 Evening Shift</h4>
                </div>
                <input
                  type="time"
                  value={settings.eveningTriggerTime}
                  onChange={(e) => handleTimeChange('evening', e.target.value)}
                  className="w-full px-3 py-2 border border-indigo-300 dark:border-indigo-700 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  disabled={!settings.enabled}
                />
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                  Notifications sent at {settings.eveningTriggerTime}
                </p>
              </div>
            </div>
          </div>

          {/* Information Box */}
          <div className="p-4 bg-gray-50 dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="text-sm text-gray-700 dark:text-gray-300">
                <p className="font-semibold mb-1">How it works:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>The system checks for absent students hourly</li>
                  <li>At the trigger time for each shift, parents will be notified via Telegram</li>
                  <li>Only parents who have registered with the Telegram bot will receive notifications</li>
                  <li>Each parent will only be notified once per day per absence</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-slate-600">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save Settings
                </>
              )}
            </button>
          </div>
        </div>
      </CardBox>
    </div>
  );
};
