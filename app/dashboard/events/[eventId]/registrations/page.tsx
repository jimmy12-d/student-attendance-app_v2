"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { db } from "@/firebase-config";
import { 
  collection, 
  query, 
  where,
  onSnapshot, 
  doc,
  getDoc,
  updateDoc,
  Timestamp,
  getDocs,
  addDoc,
  serverTimestamp
} from "firebase/firestore";
import { toast } from "sonner";
import Icon from "@/app/_components/Icon";
import { 
  mdiArrowLeft,
  mdiAccount,
  mdiCheck,
  mdiClose,
  mdiClockOutline,
  mdiCheckCircle,
  mdiCloseCircle,
  mdiCalendar,
  mdiPlus,
  mdiAccountPlus,
  mdiMagnify,
  mdiClockIn,
  mdiClockOut,
  mdiPencil,
  mdiDelete,
  mdiDotsVertical
} from "@mdi/js";
import AddStudentModal from "./AddStudentModal";

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

interface FormResponse {
  id: string;
  formId: string;
  studentId: string;
  studentName: string;
  studentEmail?: string;
  studentPhone?: string;
  class?: string;
  shift?: string;
  authUid: string;
  responses: Record<string, any>;
  submittedAt: Timestamp | Date;
  registrationStatus?: 'pending' | 'approved' | 'rejected';
}

interface Event {
  id: string;
  name: string;
  date: Timestamp | Date;
  formId: string;
  formTitle?: string;
  ticketImageUrl: string;
}

interface AttendanceRecord {
  id?: string;
  studentId: string;
  date?: string;
  status: string;
  timeIn?: string;
  timestamp?: any;
  clockInTime?: any;
  clockOutTime?: any;
  clockInMethod?: 'face-scan' | 'manual';
  totalDuration?: number;
}

const EventRegistrationsPage = () => {
  const router = useRouter();
  const params = useParams();
  const eventId = params?.eventId as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [registrations, setRegistrations] = useState<FormResponse[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [attendanceFilter, setAttendanceFilter] = useState<'all' | 'clocked-in' | 'clocked-out' | 'not-clocked-in'>('all');
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingAttendance, setEditingAttendance] = useState<{studentId: string, studentName: string, record: AttendanceRecord} | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.attendance-menu')) {
        setOpenMenuId(null);
      }
    };

    if (openMenuId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openMenuId]);

  // Load event details
  useEffect(() => {
    if (!eventId) return;

    const loadEvent = async () => {
      try {
        const eventDoc = await getDoc(doc(db, "events", eventId));
        if (eventDoc.exists()) {
          setEvent({ id: eventDoc.id, ...eventDoc.data() } as Event);
        } else {
          toast.error("Event not found");
          router.push("/dashboard/events");
        }
      } catch (error) {
        console.error("Error loading event:", error);
        toast.error("Failed to load event");
      }
    };

    loadEvent();
  }, [eventId, router]);

  // Load registrations
  useEffect(() => {
    if (!event?.formId) return;

    const registrationsQuery = query(
      collection(db, "form_responses"),
      where("formId", "==", event.formId)
    );

    const unsubscribe = onSnapshot(registrationsQuery, (snapshot) => {
      const fetchedRegistrations = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as FormResponse));

      // Sort by submittedAt in descending order (most recent first)
      const sortedRegistrations = fetchedRegistrations.sort((a, b) => {
        const aTime = a.submittedAt instanceof Timestamp ? a.submittedAt.toMillis() : new Date(a.submittedAt).getTime();
        const bTime = b.submittedAt instanceof Timestamp ? b.submittedAt.toMillis() : new Date(b.submittedAt).getTime();
        return bTime - aTime; // Descending order (most recent first)
      });

      setRegistrations(sortedRegistrations);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching registrations:", error);
      toast.error("Failed to load registrations");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [event]);

  // Load attendance data for the event
  useEffect(() => {
    if (!event?.id) return;

    const loadAttendance = async () => {
      try {
        // Query eventAttendance collection for this specific event
        const attendanceQuery = query(
          collection(db, "eventAttendance"),
          where("eventId", "==", event.id)
        );

        const attendanceSnapshot = await getDocs(attendanceQuery);
        const attendanceData = attendanceSnapshot.docs.map(doc => ({
          ...doc.data()
        } as AttendanceRecord));

        setAttendance(attendanceData);
      } catch (error) {
        console.error("Error loading attendance:", error);
      }
    };

    loadAttendance();
    
    // Set up real-time listener for attendance updates
    const attendanceQuery = query(
      collection(db, "eventAttendance"),
      where("eventId", "==", event.id)
    );
    
    const unsubscribe = onSnapshot(attendanceQuery, (snapshot) => {
      const attendanceData = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        } as AttendanceRecord & { id: string }))
        .filter(record => record.status !== 'deleted'); // Exclude deleted records
      setAttendance(attendanceData);
    });

    return () => unsubscribe();
  }, [event?.id]);

  const handleApprove = async (registrationId: string) => {
    try {
      await updateDoc(doc(db, "form_responses", registrationId), {
        registrationStatus: 'approved',
        approvalStatus: 'approved',
        approvedAt: Timestamp.now()
      });
      toast.success("Registration approved");
    } catch (error) {
      console.error("Error approving registration:", error);
      toast.error("Failed to approve registration");
    }
  };

  const handleReject = async (registrationId: string) => {
    try {
      await updateDoc(doc(db, "form_responses", registrationId), {
        registrationStatus: 'rejected',
        rejectedAt: Timestamp.now()
      });
      toast.success("Registration rejected");
    } catch (error) {
      console.error("Error rejecting registration:", error);
      toast.error("Failed to reject registration");
    }
  };

  const handleManualClockIn = async (studentId: string, studentName: string) => {
    if (!event?.id || !event?.name) {
      toast.error("Event information is missing");
      return;
    }

    try {
      const eventDate = event.date instanceof Timestamp ? event.date.toDate() : event.date;
      const eventDateStr = eventDate.toISOString().split('T')[0];

      // Check if already clocked in for this event today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const eventAttendanceRef = collection(db, 'eventAttendance');
      const q = query(
        eventAttendanceRef,
        where('eventId', '==', event.id),
        where('studentId', '==', studentId),
        where('clockInTime', '>=', Timestamp.fromDate(todayStart))
      );
      
      const existingRecords = await getDocs(q);
      const activeClockIn = existingRecords.docs.find(doc => !doc.data().clockOutTime);
      
      if (activeClockIn) {
        toast.error(`${studentName} is already clocked in for this event`);
        return;
      }

      // Create clock-in record
      await addDoc(eventAttendanceRef, {
        eventId: event.id,
        eventName: event.name,
        studentId: studentId,
        studentName: studentName,
        clockInTime: serverTimestamp(),
        clockInMethod: 'manual',
        clockOutTime: null,
        clockOutMethod: null,
        status: 'clocked-in',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Also mark in regular attendance
      const attendanceRef = collection(db, "attendance");
      const attendanceQuery = query(
        attendanceRef,
        where("studentId", "==", studentId),
        where("date", "==", eventDateStr)
      );
      
      const attendanceSnapshot = await getDocs(attendanceQuery);
      
      if (attendanceSnapshot.empty) {
        // Create new attendance record
        await addDoc(attendanceRef, {
          studentId: studentId,
          date: eventDateStr,
          status: "present",
          timeIn: new Date().toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
          }),
          timestamp: serverTimestamp(),
          markedManually: true,
          markedBy: "admin-event",
          eventId: event.id
        });
      } else {
        // Update existing attendance record if absent
        const attendanceDoc = attendanceSnapshot.docs[0];
        const attendanceData = attendanceDoc.data();
        
        if (attendanceData.status === "absent" || !attendanceData.status) {
          await updateDoc(doc(db, "attendance", attendanceDoc.id), {
            status: "present",
            timeIn: new Date().toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: true 
            }),
            timestamp: serverTimestamp(),
            markedManually: true,
            markedBy: "admin-event",
            eventId: event.id
          });
        }
      }

      // Refresh attendance data from eventAttendance
      const attendanceQuery2 = query(
        collection(db, "eventAttendance"),
        where("eventId", "==", event.id)
      );
      const attendanceSnapshot2 = await getDocs(attendanceQuery2);
      const attendanceData = attendanceSnapshot2.docs.map(doc => ({
        ...doc.data()
      } as AttendanceRecord));
      setAttendance(attendanceData);

      toast.success(`✅ ${studentName} clocked in successfully!`);
    } catch (error) {
      console.error("Error clocking in student:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to clock in ${studentName}: ${errorMessage}`);
    }
  };

  const handleManualClockOut = async (studentId: string, studentName: string) => {
    if (!event?.id) {
      toast.error("Event information is missing");
      return;
    }

    try {
      // Find the active clock-in record
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const eventAttendanceRef = collection(db, 'eventAttendance');
      const q = query(
        eventAttendanceRef,
        where('eventId', '==', event.id),
        where('studentId', '==', studentId),
        where('clockInTime', '>=', Timestamp.fromDate(todayStart))
      );
      
      const existingRecords = await getDocs(q);
      const activeRecord = existingRecords.docs.find(doc => !doc.data().clockOutTime);
      
      if (!activeRecord) {
        toast.error(`${studentName} is not clocked in`);
        return;
      }

      // Calculate duration
      const clockInTime = activeRecord.data().clockInTime.toDate();
      const clockOutTime = new Date();
      const durationMs = clockOutTime.getTime() - clockInTime.getTime();
      const durationMinutes = Math.round(durationMs / 60000);

      // Update with clock-out information
      await updateDoc(doc(db, 'eventAttendance', activeRecord.id), {
        clockOutTime: serverTimestamp(),
        clockOutMethod: 'manual',
        status: 'clocked-out',
        totalDuration: durationMinutes,
        updatedAt: serverTimestamp()
      });

      toast.success(`✅ ${studentName} clocked out successfully! Duration: ${durationMinutes} min`);
    } catch (error) {
      console.error("Error clocking out student:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to clock out ${studentName}: ${errorMessage}`);
    }
  };

  const handleDeleteAttendance = async (studentId: string, studentName: string) => {
    if (!event?.id) return;
    
    if (!confirm(`Are you sure you want to remove attendance record for ${studentName}?`)) {
      return;
    }

    try {
      // Find and delete the attendance record
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const eventAttendanceRef = collection(db, 'eventAttendance');
      const q = query(
        eventAttendanceRef,
        where('eventId', '==', event.id),
        where('studentId', '==', studentId),
        where('clockInTime', '>=', Timestamp.fromDate(todayStart))
      );
      
      const existingRecords = await getDocs(q);
      
      if (existingRecords.empty) {
        toast.error("No attendance record found");
        return;
      }

      // Delete all records for this student and event today
      const deletePromises = existingRecords.docs.map(docSnapshot => 
        updateDoc(doc(db, 'eventAttendance', docSnapshot.id), {
          status: 'deleted',
          deletedAt: serverTimestamp(),
          deletedBy: 'admin'
        })
      );

      await Promise.all(deletePromises);
      
      toast.success(`Attendance record removed for ${studentName}`);
      setOpenMenuId(null);
    } catch (error) {
      console.error("Error deleting attendance:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to remove attendance: ${errorMessage}`);
    }
  };

  const formatDate = (timestamp: Timestamp | Date) => {
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Phnom_Penh'
    });
  };

  const getAttendanceStatus = (studentId: string) => {
    const record = attendance.find(att => att.studentId === studentId);
    
    if (!record) {
      return {
        status: "absent",
        text: "Not Clocked In",
        color: "text-red-600 dark:text-red-400",
        bgColor: "bg-red-100 dark:bg-red-900/30"
      };
    }

    // Handle eventAttendance records (clocked-in, clocked-out)
    if (record.status === "clocked-in") {
      const clockInTime = record.clockInTime ? 
        new Date(record.clockInTime.toDate?.() || record.clockInTime).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        }) : "N/A";

      const method = record.clockInMethod === 'face-scan' ? '👤' : '✋';

      return {
        status: "clocked-in",
        text: `${method} Clocked In • ${clockInTime}`,
        color: "text-green-600 dark:text-green-400",
        bgColor: "bg-green-100 dark:bg-green-900/30"
      };
    }

    if (record.status === "clocked-out") {
      const clockInTime = record.clockInTime ? 
        new Date(record.clockInTime.toDate?.() || record.clockInTime).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        }) : "N/A";
      
      const clockOutTime = record.clockOutTime ? 
        new Date(record.clockOutTime.toDate?.() || record.clockOutTime).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        }) : "N/A";

      const duration = record.totalDuration ? `${record.totalDuration} min` : '';

      return {
        status: "clocked-out",
        text: `Completed • ${clockInTime} - ${clockOutTime}${duration ? ` (${duration})` : ''}`,
        color: "text-blue-600 dark:text-blue-400",
        bgColor: "bg-blue-100 dark:bg-blue-900/30"
      };
    }

    // Legacy attendance records (present, late, absent)
    if (record.status === "present" || record.status === "late") {
      const timeIn = record.timeIn || (record.timestamp ? 
        new Date(record.timestamp.toDate?.() || record.timestamp).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        }) : "N/A");

      return {
        status: record.status,
        text: record.status === "late" ? `Late • ${timeIn}` : `Arrived • ${timeIn}`,
        color: record.status === "late" ? "text-yellow-600 dark:text-yellow-400" : "text-green-600 dark:text-green-400",
        bgColor: record.status === "late" ? "bg-yellow-100 dark:bg-yellow-900/30" : "bg-green-100 dark:bg-green-900/30"
      };
    }

    return {
      status: record.status,
      text: record.status.charAt(0).toUpperCase() + record.status.slice(1),
      color: "text-gray-600 dark:text-gray-400",
      bgColor: "bg-gray-100 dark:bg-gray-700"
    };
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-medium flex items-center gap-1">
            <Icon path={mdiCheckCircle} size={16} />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-xs font-medium flex items-center gap-1">
            <Icon path={mdiCloseCircle} size={16} />
            Rejected
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full text-xs font-medium flex items-center gap-1">
            <Icon path={mdiClockOutline} size={16} />
            Pending
          </span>
        );
    }
  };

  const filteredRegistrations = registrations.filter(reg => {
    // Filter by registration status
    if (filter !== 'all') {
      if (filter === 'pending') {
        if (reg.registrationStatus && reg.registrationStatus !== 'pending') return false;
      } else if (reg.registrationStatus !== filter) {
        return false;
      }
    }
    
    // Filter by attendance status
    if (attendanceFilter !== 'all') {
      const attendanceRecord = attendance.find(att => att.studentId === reg.studentId);
      
      if (attendanceFilter === 'clocked-in') {
        if (!attendanceRecord || attendanceRecord.status !== 'clocked-in') return false;
      } else if (attendanceFilter === 'clocked-out') {
        if (!attendanceRecord || attendanceRecord.status !== 'clocked-out') return false;
      } else if (attendanceFilter === 'not-clocked-in') {
        if (attendanceRecord && (attendanceRecord.status === 'clocked-in' || attendanceRecord.status === 'clocked-out')) return false;
      }
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const studentName = (reg.studentName || '').toLowerCase();
      const studentClass = (reg.class || reg.responses?.class || '').toLowerCase();
      const studentId = (reg.studentId || '').toLowerCase();
      
      return studentName.includes(query) || 
             studentClass.includes(query) || 
             studentId.includes(query);
    }
    
    return true;
  });

  const pendingCount = registrations.filter(r => !r.registrationStatus || r.registrationStatus === 'pending').length;
  const approvedCount = registrations.filter(r => r.registrationStatus === 'approved').length;
  const rejectedCount = registrations.filter(r => r.registrationStatus === 'rejected').length;

  // Attendance counts
  const clockedInCount = registrations.filter(reg => {
    const record = attendance.find(att => att.studentId === reg.studentId);
    return record && record.status === 'clocked-in';
  }).length;
  
  const clockedOutCount = registrations.filter(reg => {
    const record = attendance.find(att => att.studentId === reg.studentId);
    return record && record.status === 'clocked-out';
  }).length;
  
  const notClockedInCount = registrations.filter(reg => {
    const record = attendance.find(att => att.studentId === reg.studentId);
    return !record || (record.status !== 'clocked-in' && record.status !== 'clocked-out');
  }).length;

  if (loading || !event) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="h-32 bg-white dark:bg-gray-800 rounded-lg shadow-sm animate-pulse" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-white dark:bg-gray-800 rounded-lg shadow-sm animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 md:p-8">
          <button
            onClick={() => router.push("/dashboard/events")}
            className="mb-4 flex items-center gap-2 text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 transition-colors"
          >
            <Icon path={mdiArrowLeft} size={16} />
            <span>Back to Events</span>
          </button>

          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                  <Icon path={mdiAccount} size={18} className="text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {event.name}
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Event Registrations
                  </p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 mt-4 ml-15">
                <div className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full text-sm">
                  {pendingCount} Pending
                </div>
                <div className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm">
                  {approvedCount} Approved
                </div>
                <div className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-sm">
                  {rejectedCount} Rejected
                </div>
              </div>
            </div>

            {/* Add Student Button */}
            <button
              onClick={() => setIsAddStudentModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
            >
              <Icon path={mdiAccountPlus} size={20} />
              <span>Add Student</span>
            </button>
          </div>
        </div>
      </div>

      {/* Combined Filters */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Registration Status */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <Icon path={mdiCheckCircle} size={18} />
                Registration Status
              </h3>
              <div className="flex gap-2 flex-wrap">
                {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilter(status)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      filter === status
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Attendance Status */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <Icon path={mdiClockOutline} size={18} />
                Attendance Status
              </h3>
              <div className="flex gap-2 flex-wrap">
                {([
                  { value: 'all', label: 'All', count: registrations.length, color: 'gray' },
                  { value: 'not-clocked-in', label: 'Not Clocked In', count: notClockedInCount, color: 'red' },
                  { value: 'clocked-in', label: 'Clocked In', count: clockedInCount, color: 'green' },
                  { value: 'clocked-out', label: 'Clocked Out', count: clockedOutCount, color: 'blue' },
                ] as const).map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setAttendanceFilter(option.value)}
                    className={`px-3 py-2 rounded-lg font-medium transition-all flex items-center gap-2 text-sm ${
                      attendanceFilter === option.value
                        ? option.color === 'gray' ? 'bg-gray-600 text-white shadow-md' :
                          option.color === 'red' ? 'bg-red-600 text-white shadow-md' :
                          option.color === 'green' ? 'bg-green-600 text-white shadow-md' :
                          'bg-blue-600 text-white shadow-md'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <span>{option.label}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      attendanceFilter === option.value
                        ? 'bg-white/20 text-white'
                        : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                    }`}>
                      {option.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search Box */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="relative">
            <Icon 
              path={mdiMagnify} 
              size={20} 
              className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" 
            />
            <input
              type="text"
              placeholder="Search by student name, class, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white placeholder-gray-500"
            />
          </div>
          {searchQuery && (
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Found {filteredRegistrations.length} registration{filteredRegistrations.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      {/* Registrations List */}
      <div className="max-w-7xl mx-auto">
        {filteredRegistrations.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
            <div className="w-24 h-24 mx-auto mb-6 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <Icon path={mdiAccount} size={28} className="text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              No registrations found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {filter !== 'all' 
                ? `No ${filter} registrations for this event.`
                : 'No students have registered for this event yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRegistrations.map((registration) => {
              const attendanceStatus = getAttendanceStatus(registration.studentId);
              
              return (
              <div
                key={registration.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Student Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                        <Icon path={mdiAccount} size={16} className="text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                          {registration.studentName}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {registration.class || registration.responses?.class || registration.studentId}
                          {registration.shift && ` · ${registration.shift}`}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1 ml-15">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Icon path={mdiCalendar} size={16} />
                        <span>Submitted: {formatDate(registration.submittedAt)}</span>
                      </div>

                      {/* Attendance Status */}
                      <div className="flex items-center gap-2">
                        <div className={`px-3 py-1 ${attendanceStatus.bgColor} rounded-lg flex items-center gap-2`}>
                          <Icon path={mdiClockOutline} size={14} className={attendanceStatus.color} />
                          <span className={`text-sm font-medium ${attendanceStatus.color}`}>
                            {attendanceStatus.text}
                          </span>
                        </div>
                        
                        {/* Edit/Delete Menu for clocked-in or clocked-out students */}
                        {(attendanceStatus.status === 'clocked-in' || attendanceStatus.status === 'clocked-out') && (
                          <div className="relative attendance-menu">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(openMenuId === registration.studentId ? null : registration.studentId);
                              }}
                              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                              title="Manage attendance"
                            >
                              <Icon path={mdiDotsVertical} size={16} className="text-gray-600 dark:text-gray-400" />
                            </button>
                            
                            {openMenuId === registration.studentId && (
                              <div className="absolute left-0 top-full mt-1 bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 z-10 min-w-[180px]">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const record = attendance.find(att => att.studentId === registration.studentId);
                                    if (record) {
                                      setEditingAttendance({
                                        studentId: registration.studentId,
                                        studentName: registration.studentName,
                                        record
                                      });
                                      setOpenMenuId(null);
                                    }
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2 text-gray-700 dark:text-gray-300 rounded-t-lg"
                                >
                                  <Icon path={mdiPencil} size={16} />
                                  Edit Times
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteAttendance(registration.studentId, registration.studentName);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-red-100 dark:hover:bg-red-900/30 flex items-center gap-2 text-red-600 dark:text-red-400 rounded-b-lg"
                                >
                                  <Icon path={mdiDelete} size={16} />
                                  Remove Record
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Response Details */}
                    {registration.responses && Object.keys(registration.responses).length > 0 && (
                      <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Form Responses:
                        </h4>
                        <div className="space-y-1">
                          {Object.entries(registration.responses).map(([question, answer]) => (
                            <div key={question} className="text-sm">
                              <span className="text-gray-600 dark:text-gray-400">{question}: </span>
                              <span className="text-gray-900 dark:text-white font-medium">
                                {Array.isArray(answer) ? answer.join(', ') : String(answer)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Status and Actions */}
                  <div className="flex flex-col items-end gap-3">
                    {getStatusBadge(registration.registrationStatus)}
                    
                    {/* Manual Clock-In/Out Button - Hide if pending or already clocked out */}
                    {registration.registrationStatus === 'approved' && attendanceStatus.status !== "clocked-out" && (
                      <>
                        {attendanceStatus.status === "clocked-in" ? (
                          <button
                            onClick={() => handleManualClockOut(registration.studentId, registration.studentName)}
                            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2 shadow-md"
                            title="Manually clock out student"
                          >
                            <Icon path={mdiClockOut} size={16} />
                            Manual Clock Out
                          </button>
                        ) : (
                          <button
                            onClick={() => handleManualClockIn(registration.studentId, registration.studentName)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-md"
                            title="Manually clock in student"
                          >
                            <Icon path={mdiClockIn} size={16} />
                            Manual Clock In
                          </button>
                        )}
                      </>
                    )}
                    
                    {(!registration.registrationStatus || registration.registrationStatus === 'pending') && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(registration.id)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                        >
                          <Icon path={mdiCheck} size={16} />
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(registration.id)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                        >
                          <Icon path={mdiClose} size={16} />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Attendance Time Modal */}
      {editingAttendance && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Edit Attendance Times
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Student: <span className="font-semibold">{editingAttendance.studentName}</span>
            </p>
            
            <div className="space-y-4">
              {/* Clock In Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Clock In Time
                </label>
                <input
                  type="datetime-local"
                  id="clockInTime"
                  defaultValue={
                    editingAttendance.record.clockInTime
                      ? new Date(editingAttendance.record.clockInTime.toDate?.() || editingAttendance.record.clockInTime)
                          .toISOString()
                          .slice(0, 16)
                      : ''
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Clock Out Time (if exists) */}
              {editingAttendance.record.status === 'clocked-out' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Clock Out Time
                  </label>
                  <input
                    type="datetime-local"
                    id="clockOutTime"
                    defaultValue={
                      editingAttendance.record.clockOutTime
                        ? new Date(editingAttendance.record.clockOutTime.toDate?.() || editingAttendance.record.clockOutTime)
                            .toISOString()
                            .slice(0, 16)
                        : ''
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={async () => {
                  try {
                    const clockInInput = document.getElementById('clockInTime') as HTMLInputElement;
                    const clockOutInput = document.getElementById('clockOutTime') as HTMLInputElement;
                    
                    const newClockInTime = clockInInput.value ? Timestamp.fromDate(new Date(clockInInput.value)) : null;
                    const newClockOutTime = clockOutInput?.value ? Timestamp.fromDate(new Date(clockOutInput.value)) : null;

                    if (!newClockInTime) {
                      toast.error("Clock in time is required");
                      return;
                    }

                    // Calculate new duration if both times exist
                    let duration = editingAttendance.record.totalDuration;
                    if (newClockOutTime && newClockInTime) {
                      const durationMs = newClockOutTime.toMillis() - newClockInTime.toMillis();
                      duration = Math.round(durationMs / 60000);
                    }

                    // Find the attendance record ID
                    const recordWithId = attendance.find(att => att.studentId === editingAttendance.studentId);
                    if (!recordWithId?.id) {
                      toast.error("Could not find attendance record");
                      return;
                    }

                    // Update the record
                    const updateData: any = {
                      clockInTime: newClockInTime,
                      updatedAt: serverTimestamp(),
                      editedBy: 'admin'
                    };

                    if (newClockOutTime) {
                      updateData.clockOutTime = newClockOutTime;
                      updateData.totalDuration = duration;
                    }

                    await updateDoc(doc(db, 'eventAttendance', recordWithId.id), updateData);

                    toast.success("Attendance times updated successfully");
                    setEditingAttendance(null);
                  } catch (error) {
                    console.error("Error updating times:", error);
                    toast.error("Failed to update times");
                  }
                }}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Save Changes
              </button>
              <button
                onClick={() => setEditingAttendance(null)}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      <AddStudentModal
        isOpen={isAddStudentModalOpen}
        onClose={() => setIsAddStudentModalOpen(false)}
        eventId={eventId}
        formId={event.formId}
        eventDate={event.date}
        existingRegistrations={registrations}
      />
    </div>
  );
};

export default EventRegistrationsPage;
