'use client'

import { motion } from 'framer-motion'
import Icon from '@/app/_components/Icon'
import { mdiAccountCheckOutline, mdiClockAlertOutline, mdiAccountOffOutline } from '@mdi/js'

export default function AttendancePreview() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      {/* Top Navigation Preview */}
      <nav className="bg-white/95 dark:bg-slate-800/90 backdrop-blur-lg shadow-lg border-b border-gray-200/70 dark:border-slate-700/50">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">R</span>
              </div>
              <span className="text-lg font-bold text-gray-800 dark:text-white">Student Portal</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex flex-col items-end">
                <span className="text-base font-semibold text-gray-800 dark:text-slate-100">Student Name</span>
                <span className="text-xs text-gray-500 dark:text-slate-400">Class A</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Preview */}
      <main className="relative pb-24">
        <div className="p-6 max-w-2xl mx-auto">
          {/* Attendance Summary Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white dark:bg-slate-800/90 backdrop-blur-sm rounded-3xl shadow-lg border border-gray-100/80 dark:border-slate-700/50 p-6 mb-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Today's Attendance</h2>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                <Icon path={mdiAccountCheckOutline} size={24} className="text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">85%</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Present</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">10%</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Late</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">5%</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Absent</div>
              </div>
            </div>
          </motion.div>

          {/* Recent Records Preview */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white dark:bg-slate-800/90 backdrop-blur-sm rounded-3xl shadow-lg border border-gray-100/80 dark:border-slate-700/50 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Attendance</h3>
            <div className="space-y-3">
              {[
                { date: 'Today', status: 'Present', time: '07:45 AM', icon: mdiAccountCheckOutline, color: 'green' },
                { date: 'Yesterday', status: 'Late', time: '08:15 AM', icon: mdiClockAlertOutline, color: 'yellow' },
                { date: '2 days ago', status: 'Present', time: '07:30 AM', icon: mdiAccountCheckOutline, color: 'green' },
              ].map((record, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      record.color === 'green' 
                        ? 'bg-green-100 dark:bg-green-900/20' 
                        : 'bg-yellow-100 dark:bg-yellow-900/20'
                    }`}>
                      <Icon path={record.icon} size={20} className={`${
                        record.color === 'green' 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-yellow-600 dark:text-yellow-400'
                      }`} />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{record.date}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{record.time}</div>
                    </div>
                  </div>
                  <div className={`px-3 py-1 text-sm font-medium rounded-full ${
                    record.color === 'green'
                      ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                      : 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300'
                  }`}>
                    {record.status}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </main>

      {/* Bottom Navigation Preview */}
      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[280px] z-30">
        <div className="flex items-center justify-around bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg rounded-full shadow-lg border border-white/20 px-2">
          {['Home', 'Mock Exam', 'Account'].map((item, index) => (
            <div key={item} className="flex flex-col items-center justify-center flex-1 h-14 text-sm font-medium text-gray-700 dark:text-gray-300">
              <div className={`w-6 h-6 rounded-full mb-1 ${index === 0 ? 'bg-company-purple' : 'bg-gray-400'}`}></div>
              <span className="text-xs">{item}</span>
            </div>
          ))}
        </div>
      </nav>
    </div>
  )
}
