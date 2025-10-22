import React, { useState, useEffect } from 'react';
import { db } from '../../../../firebase-config';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { AbsentNotificationSettings } from '../../../_interfaces';
import CardBox from '../../../_components/CardBox';
import SectionTitleLineWithButton from '../../../_components/Section/TitleLineWithButton';
import { mdiBellAlert } from '@mdi/js';
import { toast } from 'sonner';
import { useAuthContext } from '../../../_contexts/AuthContext';

export const AbsentNotificationSettingsComponent: React.FC<{
  onSave?: () => void;
}> = ({ onSave }) => {
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
      
      // Navigate back to dashboard after successful save
      if (onSave) {
        setTimeout(() => {
          onSave();
        }, 1500); // Small delay to show the success message
      }
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
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 rounded-xl shadow-xl border border-blue-100 dark:border-slate-600">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-200/30 to-purple-200/30 dark:from-blue-500/20 dark:to-purple-500/20 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-green-200/20 to-blue-200/20 dark:from-green-500/10 dark:to-blue-500/10 rounded-full translate-y-12 -translate-x-12"></div>
          
          <div className="relative p-8 space-y-8">
            {/* Enable/Disable Toggle */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-100/50 to-purple-100/50 dark:from-blue-900/30 dark:to-purple-900/30 rounded-xl transform rotate-1"></div>
              <div className="relative p-6 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl border border-blue-200/50 dark:border-slate-600 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-pulse"></div>
                      <svg className="relative w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">Automatic Notifications</h3>
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
                    <div className={`w-16 h-8 bg-gradient-to-r rounded-full shadow-md transition-all duration-300 ${
                      settings.enabled 
                        ? 'from-green-500 to-green-600' 
                        : 'from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700'
                    } peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800`}>
                      <div className={`absolute top-1 left-1 w-6 h-6 bg-white border rounded-full transition-all duration-300 shadow-sm ${
                        settings.enabled ? 'translate-x-8 border-white' : 'translate-x-0 border-gray-300 dark:border-gray-600'
                      }`}></div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Trigger Time Settings */}
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center justify-center mb-2">
                  <svg className="w-6 h-6 mr-3 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-gray-900 dark:text-gray-100">Notification Trigger Times</span>
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                  Set the time when parents should be notified about absent students for each shift. Notifications will be sent automatically at these times.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Morning Shift */}
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-200/40 to-red-200/40 dark:from-orange-500/20 dark:to-red-500/20 rounded-2xl transform rotate-2 group-hover:rotate-1 transition-transform duration-300"></div>
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-100/60 to-yellow-100/60 dark:from-orange-400/30 dark:to-yellow-400/30 rounded-2xl transform -rotate-1 group-hover:rotate-0 transition-transform duration-300"></div>
                  <div className="relative p-6 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-orange-200/70 dark:border-orange-700 shadow-xl">
                    <div className="flex items-center mb-4">
                      <div className="relative mr-3">
                        <div className="absolute inset-0 bg-orange-400/30 rounded-full animate-pulse"></div>
                        <svg className="relative w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
                        </svg>
                      </div>
                      <h4 className="text-lg font-bold text-orange-800 dark:text-orange-300">Morning Shift</h4>
                    </div>
                    <input
                      type="time"
                      value={settings.morningTriggerTime}
                      onChange={(e) => handleTimeChange('morning', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-orange-300 dark:border-orange-600 rounded-xl bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/50 dark:to-yellow-900/50 text-gray-900 dark:text-gray-100 focus:ring-4 focus:ring-orange-400 focus:border-orange-500 transition-all duration-200 font-semibold text-center text-lg shadow-inner"
                      disabled={!settings.enabled}
                    />
                    <p className="text-xs text-gray-700 dark:text-gray-300 mt-3 text-center font-medium">
                      Notifications sent at <span className="font-bold text-orange-800 dark:text-orange-200">{settings.morningTriggerTime}</span>
                    </p>
                  </div>
                </div>

                {/* Afternoon Shift */}
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-200/40 to-orange-200/40 dark:from-yellow-500/20 dark:to-orange-500/20 rounded-2xl transform -rotate-2 group-hover:rotate-0 transition-transform duration-300"></div>
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-100/60 to-orange-100/60 dark:from-yellow-400/30 dark:to-orange-400/30 rounded-2xl transform rotate-1 group-hover:-rotate-1 transition-transform duration-300"></div>
                  <div className="relative p-6 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-yellow-200/70 dark:border-yellow-700 shadow-xl">
                    <div className="flex items-center mb-4">

                      <h4 className="text-lg font-bold text-yellow-800 dark:text-yellow-300">☀️ Afternoon Shift</h4>
                    </div>
                    <input
                      type="time"
                      value={settings.afternoonTriggerTime}
                      onChange={(e) => handleTimeChange('afternoon', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-yellow-300 dark:border-yellow-600 rounded-xl bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/50 dark:to-orange-900/50 text-gray-900 dark:text-gray-100 focus:ring-4 focus:ring-yellow-400 focus:border-yellow-500 transition-all duration-200 font-semibold text-center text-lg shadow-inner"
                      disabled={!settings.enabled}
                    />
                    <p className="text-xs text-gray-700 dark:text-gray-300 mt-3 text-center font-medium">
                      Notifications sent at <span className="font-bold text-yellow-800 dark:text-yellow-200">{settings.afternoonTriggerTime}</span>
                    </p>
                  </div>
                </div>

                {/* Evening Shift */}
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-200/40 to-purple-200/40 dark:from-indigo-500/20 dark:to-purple-500/20 rounded-2xl transform rotate-2 group-hover:rotate-1 transition-transform duration-300"></div>
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-100/60 to-purple-100/60 dark:from-indigo-400/30 dark:to-purple-400/30 rounded-2xl transform -rotate-1 group-hover:rotate-0 transition-transform duration-300"></div>
                  <div className="relative p-6 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-indigo-200/70 dark:border-indigo-700 shadow-xl">
                    <div className="flex items-center mb-4">
                      <div className="relative mr-3">
                        <div className="absolute inset-0 bg-indigo-400/30 rounded-full animate-pulse"></div>
                        <svg className="relative w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                        </svg>
                      </div>
                      <h4 className="text-lg font-bold text-indigo-800 dark:text-indigo-300">Evening Shift</h4>
                    </div>
                    <input
                      type="time"
                      value={settings.eveningTriggerTime}
                      onChange={(e) => handleTimeChange('evening', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-indigo-300 dark:border-indigo-600 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/50 dark:to-purple-900/50 text-gray-900 dark:text-gray-100 focus:ring-4 focus:ring-indigo-400 focus:border-indigo-500 transition-all duration-200 font-semibold text-center text-lg shadow-inner"
                      disabled={!settings.enabled}
                    />
                    <p className="text-xs text-gray-700 dark:text-gray-300 mt-3 text-center font-medium">
                      Notifications sent at <span className="font-bold text-indigo-800 dark:text-indigo-200">{settings.eveningTriggerTime}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Information Box */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-gray-100/50 to-blue-100/50 dark:from-slate-600/30 dark:to-blue-900/30 rounded-xl transform -rotate-1"></div>
              <div className="relative p-6 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-xl border border-gray-200/70 dark:border-slate-600 shadow-lg">
                <div className="flex items-start">
                  <div className="relative mr-3 flex-shrink-0">
                    <div className="absolute inset-0 bg-blue-400/30 rounded-full animate-pulse"></div>
                    <svg className="relative w-6 h-6 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    <p className="font-bold mb-3 text-lg text-gray-900 dark:text-gray-100">Quick Info:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="flex items-center space-x-2 p-2 bg-blue-50/50 dark:bg-blue-900/20 rounded-lg">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span>System checks hourly for absences</span>
                      </div>
                      <div className="flex items-center space-x-2 p-2 bg-green-50/50 dark:bg-green-900/20 rounded-lg">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Notifications sent at set times</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-center pt-6 border-t border-gray-200/50 dark:border-slate-600">
              <button
                onClick={handleSave}
                disabled={saving}
                className="relative group px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
              >
                <div className="absolute inset-0 bg-blue-500 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                <div className="relative flex items-center">
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                      <span className="text-lg">Saving Settings...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-lg">Save Settings</span>
                    </>
                  )}
                </div>
              </button>
            </div>
          </div>
        </div>
      </CardBox>
    </div>
  );
};
