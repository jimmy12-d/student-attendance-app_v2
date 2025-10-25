import React from 'react';
import CardBox from '../../../_components/CardBox';
import SectionTitleLineWithButton from '../../../_components/Section/TitleLineWithButton';
import { mdiBellAlert } from '@mdi/js';

export const AbsentNotificationSettingsComponent: React.FC<{
  onSave?: () => void;
}> = ({ onSave }) => {
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
            {/* Header */}
            <div className="text-center">
              <div className="flex items-center justify-center mb-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-pulse"></div>
                  <svg className="relative w-12 h-12 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
              </div>
              <h3 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent mb-2">
                Automatic Absent Notifications
              </h3>
            </div>

            {/* Status Badge */}
            <div className="flex justify-center">
              <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-full shadow-lg">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-semibold">Active & Running</span>
              </div>
            </div>

            {/* Trigger Time Settings */}
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center justify-center mb-2">
                  <svg className="w-6 h-6 mr-3 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-gray-900 dark:text-gray-100">Notification Schedule</span>
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                  Notifications are sent automatically at the following times for each shift
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Morning Shift */}
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-200/40 to-red-200/40 dark:from-orange-500/20 dark:to-red-500/20 rounded-2xl transform rotate-2 group-hover:rotate-1 transition-transform duration-300"></div>
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-100/60 to-yellow-100/60 dark:from-orange-400/30 dark:to-yellow-400/30 rounded-2xl transform -rotate-1 group-hover:rotate-0 transition-transform duration-300"></div>
                  <div className="relative p-6 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-orange-200/70 dark:border-orange-700 shadow-xl">
                    <div className="flex items-center justify-center mb-4">
                      <div className="relative mr-3">
                        <div className="absolute inset-0 bg-orange-400/30 rounded-full animate-pulse"></div>
                        <svg className="relative w-8 h-8 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
                        </svg>
                      </div>
                      <h4 className="text-lg font-bold text-orange-800 dark:text-orange-300">🌅 Morning</h4>
                    </div>
                    <div className="text-center">
                      <div className="text-5xl font-bold text-orange-700 dark:text-orange-300 mb-2">7:30</div>
                      <div className="text-sm text-orange-600 dark:text-orange-400 font-medium">AM</div>
                      <div className="mt-4 px-4 py-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                        <p className="text-xs text-orange-800 dark:text-orange-200 font-medium">
                          Morning shift absences
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Afternoon Shift */}
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-200/40 to-orange-200/40 dark:from-yellow-500/20 dark:to-orange-500/20 rounded-2xl transform -rotate-2 group-hover:rotate-0 transition-transform duration-300"></div>
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-100/60 to-orange-100/60 dark:from-yellow-400/30 dark:to-orange-400/30 rounded-2xl transform rotate-1 group-hover:-rotate-1 transition-transform duration-300"></div>
                  <div className="relative p-6 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-yellow-200/70 dark:border-yellow-700 shadow-xl">
                    <div className="flex items-center justify-center mb-4">
                      <div className="relative mr-3">
                        <div className="absolute inset-0 bg-yellow-400/30 rounded-full animate-pulse"></div>
                        <svg className="relative w-8 h-8 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
                        </svg>
                      </div>
                      <h4 className="text-lg font-bold text-yellow-800 dark:text-yellow-300">☀️ Afternoon</h4>
                    </div>
                    <div className="text-center">
                      <div className="text-5xl font-bold text-yellow-700 dark:text-yellow-300 mb-2">1:30</div>
                      <div className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">PM</div>
                      <div className="mt-4 px-4 py-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                        <p className="text-xs text-yellow-800 dark:text-yellow-200 font-medium">
                          Afternoon shift absences
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Evening Shift */}
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-200/40 to-purple-200/40 dark:from-indigo-500/20 dark:to-purple-500/20 rounded-2xl transform rotate-2 group-hover:rotate-1 transition-transform duration-300"></div>
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-100/60 to-purple-100/60 dark:from-indigo-400/30 dark:to-purple-400/30 rounded-2xl transform -rotate-1 group-hover:rotate-0 transition-transform duration-300"></div>
                  <div className="relative p-6 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-indigo-200/70 dark:border-indigo-700 shadow-xl">
                    <div className="flex items-center justify-center mb-4">
                      <div className="relative mr-3">
                        <div className="absolute inset-0 bg-indigo-400/30 rounded-full animate-pulse"></div>
                        <svg className="relative w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                        </svg>
                      </div>
                      <h4 className="text-lg font-bold text-indigo-800 dark:text-indigo-300">🌙 Evening</h4>
                    </div>
                    <div className="text-center">
                      <div className="text-5xl font-bold text-indigo-700 dark:text-indigo-300 mb-2">6:00</div>
                      <div className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">PM</div>
                      <div className="mt-4 px-4 py-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                        <p className="text-xs text-indigo-800 dark:text-indigo-200 font-medium">
                          Evening shift absences
                        </p>
                      </div>
                    </div>
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
                    <p className="font-bold mb-3 text-lg text-gray-900 dark:text-gray-100">How It Works:</p>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span>System automatically checks for absent students every 30 minutes</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Notifications are sent to parents via Telegram at the times shown above</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        <span>Parents receive details including date, shift, and send time</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        <span>Each student is notified only once per day to avoid spam</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Back Button */}
            {onSave && (
              <div className="flex justify-center pt-6 border-t border-gray-200/50 dark:border-slate-600">
                <button
                  onClick={onSave}
                  className="relative group px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
                >
                  <div className="relative flex items-center">
                    <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    <span className="text-lg">Back to Dashboard</span>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </CardBox>
    </div>
  );
};
