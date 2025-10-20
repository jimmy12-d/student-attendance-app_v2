"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase-config';
import { toast } from 'sonner';
import Icon from '@/app/_components/Icon';
import CardBox from '@/app/_components/CardBox';
import { 
  mdiArrowLeft, 
  mdiClockIn, 
  mdiClockOut, 
  mdiDownload, 
  mdiRefresh, 
  mdiAccount, 
  mdiMagnify,
  mdiCheckCircle,
  mdiClockOutline,
  mdiAccountCircle,
  mdiFaceRecognition
} from '@mdi/js';
import { EventAttendanceRecord, manualClockInOut } from '@/utils/eventAttendanceManager';

interface Event {
  id: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
}

export default function EventAttendancePage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;
  
  const [event, setEvent] = useState<Event | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<EventAttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'clocked-in' | 'clocked-out'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    if (!eventId) return;

    // Load event details
    const loadEvent = async () => {
      try {
        const eventDoc = await getDoc(doc(db, 'events', eventId));
        if (eventDoc.exists()) {
          const data = eventDoc.data();
          setEvent({
            id: eventDoc.id,
            name: data.name,
            description: data.description,
            startDate: data.startDate?.toDate() || new Date(),
            endDate: data.endDate?.toDate() || new Date()
          });
        }
      } catch (error) {
        console.error('Error loading event:', error);
        toast.error('Failed to load event details');
      }
    };

    loadEvent();

    // Real-time listener for attendance records
    const attendanceQuery = query(
      collection(db, 'eventAttendance'),
      where('eventId', '==', eventId)
    );

    const unsubscribe = onSnapshot(
      attendanceQuery,
      (snapshot) => {
        const records: EventAttendanceRecord[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          records.push({
            id: doc.id,
            ...data,
            clockInTime: data.clockInTime?.toDate(),
            clockOutTime: data.clockOutTime?.toDate(),
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate()
          } as EventAttendanceRecord);
        });

        // Sort by clock-in time (most recent first)
        records.sort((a, b) => {
          const timeA = a.clockInTime instanceof Date ? a.clockInTime.getTime() : 0;
          const timeB = b.clockInTime instanceof Date ? b.clockInTime.getTime() : 0;
          return timeB - timeA;
        });

        setAttendanceRecords(records);
        setLoading(false);
      },
      (error) => {
        console.error('Error loading attendance:', error);
        toast.error('Failed to load attendance records');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [eventId]);

  const filteredRecords = attendanceRecords.filter((record) => {
    // Filter by status
    if (filter === 'clocked-in' && record.status !== 'clocked-in') return false;
    if (filter === 'clocked-out' && record.status !== 'clocked-out') return false;
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return record.studentName.toLowerCase().includes(query);
    }
    
    return true;
  });

  const stats = {
    total: attendanceRecords.length,
    clockedIn: attendanceRecords.filter((r) => r.status === 'clocked-in').length,
    clockedOut: attendanceRecords.filter((r) => r.status === 'clocked-out').length
  };

  const exportToCSV = () => {
    const headers = ['Student Name', 'Clock In Time', 'Clock Out Time', 'Duration (min)', 'Status', 'Method'];
    const rows = attendanceRecords.map((record) => [
      record.studentName,
      record.clockInTime instanceof Date ? record.clockInTime.toLocaleString() : '',
      record.clockOutTime instanceof Date ? record.clockOutTime.toLocaleString() : 'Not clocked out',
      record.totalDuration?.toString() || 'N/A',
      record.status,
      record.clockInMethod
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${event?.name || 'event'}_attendance_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success('Attendance exported successfully');
  };

  const formatDuration = (minutes: number | undefined) => {
    if (!minutes) return '—';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatTime = (date: Date | any | undefined) => {
    if (!date) return '—';
    const actualDate = date instanceof Date ? date : date?.toDate?.();
    if (!actualDate || !(actualDate instanceof Date)) return '—';
    return actualDate.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (date: Date | any | undefined) => {
    if (!date) return '—';
    const actualDate = date instanceof Date ? date : date?.toDate?.();
    if (!actualDate || !(actualDate instanceof Date)) return '—';
    return actualDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-800 dark:via-gray-800 dark:to-blue-900 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-slate-900 dark:via-gray-900 dark:to-purple-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard/events')}
              className="p-2 hover:bg-white/50 dark:hover:bg-gray-800 rounded-lg transition-all"
            >
              <Icon path={mdiArrowLeft} size={1} className="text-gray-700 dark:text-gray-300" />
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                {event?.name || 'Event Attendance'}
              </h1>
              {event?.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{event.description}</p>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <Icon path={mdiRefresh} size={0.8} />
              <span className="hidden md:inline">Refresh</span>
            </button>
            <button
              onClick={exportToCSV}
              disabled={attendanceRecords.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Icon path={mdiDownload} size={0.8} />
              <span className="hidden md:inline">Export</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CardBox className="bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-100 font-medium">Total Attendees</p>
                <p className="text-4xl font-bold text-white mt-2">{stats.total}</p>
                <p className="text-xs text-blue-100 mt-1">All records</p>
              </div>
              <div className="p-3 bg-white/20 rounded-full">
                <Icon path={mdiAccount} size={1.5} className="text-white" />
              </div>
            </div>
          </CardBox>

          <CardBox className="bg-gradient-to-br from-green-500 to-green-600 dark:from-green-600 dark:to-green-700 p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-100 font-medium">Clocked In</p>
                <p className="text-4xl font-bold text-white mt-2">{stats.clockedIn}</p>
                <p className="text-xs text-green-100 mt-1">Currently present</p>
              </div>
              <div className="p-3 bg-white/20 rounded-full">
                <Icon path={mdiClockIn} size={1.5} className="text-white" />
              </div>
            </div>
          </CardBox>

          <CardBox className="bg-gradient-to-br from-gray-500 to-gray-600 dark:from-gray-600 dark:to-gray-700 p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-100 font-medium">Clocked Out</p>
                <p className="text-4xl font-bold text-white mt-2">{stats.clockedOut}</p>
                <p className="text-xs text-gray-100 mt-1">Completed</p>
              </div>
              <div className="p-3 bg-white/20 rounded-full">
                <Icon path={mdiClockOut} size={1.5} className="text-white" />
              </div>
            </div>
          </CardBox>
        </div>

        {/* Search and Filters */}
        <CardBox className="bg-white dark:bg-gray-800 p-4 md:p-6 shadow-sm">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <Icon 
                path={mdiMagnify} 
                size={0.9} 
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
              />
              <input
                type="text"
                placeholder="Search by student name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filter === 'all'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                All ({stats.total})
              </button>
              <button
                onClick={() => setFilter('clocked-in')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filter === 'clocked-in'
                    ? 'bg-green-600 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Present ({stats.clockedIn})
              </button>
              <button
                onClick={() => setFilter('clocked-out')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filter === 'clocked-out'
                    ? 'bg-gray-600 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Completed ({stats.clockedOut})
              </button>
            </div>
          </div>
        </CardBox>

        {/* Attendance Records - Card Grid */}
        {filteredRecords.length === 0 ? (
          <CardBox className="bg-white dark:bg-gray-800 p-12 text-center shadow-sm">
            <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <Icon path={mdiAccount} size={2} className="text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No attendance records found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchQuery ? 'Try adjusting your search query' : 'Students will appear here after clocking in'}
            </p>
          </CardBox>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRecords.map((record) => (
              <CardBox 
                key={record.id} 
                className={`bg-white dark:bg-gray-800 p-6 hover:shadow-lg transition-all duration-300 ${
                  record.status === 'clocked-in' 
                    ? 'border-l-4 border-l-green-500' 
                    : 'border-l-4 border-l-gray-500'
                }`}
              >
                {/* Student Info */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    {record.studentName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                      {record.studentName}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full ${
                          record.status === 'clocked-in'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <Icon 
                          path={record.status === 'clocked-in' ? mdiCheckCircle : mdiClockOut} 
                          size={0.5} 
                        />
                        {record.status === 'clocked-in' ? 'Present' : 'Completed'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Time Info */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <Icon path={mdiClockIn} size={0.7} className="text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Clock In</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatTime(record.clockInTime)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(record.clockInTime)}
                      </p>
                    </div>
                  </div>

                  {record.clockOutTime && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        <Icon path={mdiClockOut} size={0.7} className="text-gray-600 dark:text-gray-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Clock Out</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {formatTime(record.clockOutTime)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Duration */}
                  <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon path={mdiClockOutline} size={0.6} className="text-gray-500 dark:text-gray-400" />
                        <span className="text-xs text-gray-600 dark:text-gray-400">Duration</span>
                      </div>
                      <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                        {formatDuration(record.totalDuration)}
                      </span>
                    </div>
                  </div>

                  {/* Method */}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Method</span>
                    <span className="inline-flex items-center gap-1 text-xs text-gray-700 dark:text-gray-300">
                      <Icon 
                        path={record.clockInMethod === 'face-scan' ? mdiFaceRecognition : mdiAccountCircle} 
                        size={0.5} 
                      />
                      {record.clockInMethod === 'face-scan' ? 'Face Scan' : 'Manual'}
                    </span>
                  </div>
                </div>
              </CardBox>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
