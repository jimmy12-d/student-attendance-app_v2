'use client'

import { useEffect, useState } from 'react'
import StudentTopNav from './StudentTopNav'

export default function AttendancePageWrapper() {
  const [AttendancePage, setAttendancePage] = useState<React.ComponentType | null>(null)

  // Dynamically import the attendance page
  useEffect(() => {
    import('../attendance/page').then((module) => {
      setAttendancePage(() => module.default)
    })
  }, [])

  return (
    <div className="relative min-h-screen">
      {/* Background styling similar to the main layout */}
      <style jsx global>{`
        /* Enhanced light mode styling with subtle colors */
        html:not(.dark) body {
          background: linear-gradient(135deg, rgb(248 250 252) 0%, rgb(241 245 249) 30%, rgb(236 242 251) 70%, rgb(243 244 246) 100%) !important;
          color: #111827 !important;
        }
        html.dark body {
          background: linear-gradient(135deg, rgb(2 6 23) 0%, rgb(15 23 42) 50%, rgb(30 41 59) 100%) !important;
          color: #f1f5f9 !important;
        }
      `}</style>
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800" />
      
      {/* Top Navigation */}
      <StudentTopNav />
      
      {/* Main Content with proper layout structure */}
      <main className="relative pb-24 bg-transparent">
        <div className="p-6 max-w-2xl mx-auto">
          {AttendancePage && <AttendancePage />}
        </div>
      </main>
    </div>
  )
}
