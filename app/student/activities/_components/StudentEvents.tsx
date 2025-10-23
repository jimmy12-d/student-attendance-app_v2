"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/firebase-config';
import { collection, query, where, onSnapshot, orderBy, Timestamp, doc, getDoc, getDocs } from 'firebase/firestore';
import Icon from '@/app/_components/Icon';
import { mdiCalendarStar, mdiTicket, mdiClose, mdiCalendar, mdiFormSelect, mdiCheckCircle, mdiCloseCircle, mdiClockOutline, mdiChevronRight, mdiLock, mdiAlertCircle, mdiImage } from '@mdi/js';
import { useTranslations } from 'next-intl';

interface Event {
  id: string;
  name: string;
  date: Timestamp | Date;
  formId: string;
  formTitle?: string;
  ticketImageUrl: string;
  createdAt: Timestamp | Date;
  isFree?: boolean;
  pricingOptions?: any[];
  allowBorrow?: boolean;
  attendanceData?: {
    confidence?: number;
    clockInTime?: Timestamp | Date;
    clockOutTime?: Timestamp | Date;
    status?: string;
    totalDuration?: number;
  };
}

interface FormStatus {
  isActive: boolean;
  exists: boolean;
}

interface StudentEventsProps {
  studentUid: string;
}

const StudentEvents = ({ studentUid }: StudentEventsProps) => {
  const t = useTranslations('student.events');
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Event | null>(null);
  const [registrationStatuses, setRegistrationStatuses] = useState<Record<string, string>>({});
  const [formStatuses, setFormStatuses] = useState<Record<string, FormStatus>>({});

  useEffect(() => {
    console.log('StudentEvents useEffect running, studentUid:', studentUid);
    const fetchEvents = async () => {
      console.log('Fetching events...');
      // Load all upcoming events
      const eventsQuery = query(
        collection(db, "events"),
        orderBy("date", "desc")
      );

      const snapshot = await getDocs(eventsQuery);
      console.log('Events fetched:', snapshot.docs.length);
      const allEvents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Event));

      // Check registration status and form status for each event
      const statuses: Record<string, string> = {};
      const formStatusMap: Record<string, FormStatus> = {};
      const attendanceDataMap: Record<string, any> = {};
      const visibleEvents: Event[] = [];
      
      for (const event of allEvents) {
        // Check form status and visibility
        let isFormVisible = false;
        try {
          const formDoc = await getDoc(doc(db, "forms", event.formId));
          if (formDoc.exists()) {
            const formData = formDoc.data();
            isFormVisible = formData.isVisible !== false; // undefined or true = visible
            
            formStatusMap[event.id] = {
              isActive: formData.isActive || false,
              exists: true
            };
            
            // Only include event if its form is visible
            if (isFormVisible) {
              visibleEvents.push(event);
            }
          } else {
            formStatusMap[event.id] = {
              isActive: false,
              exists: false
            };
            // Don't include events with non-existent forms
          }
        } catch (error) {
          console.error("Error checking form status:", error);
          formStatusMap[event.id] = {
            isActive: false,
            exists: false
          };
        }

        // Only check registration and attendance for visible events
        if (!isFormVisible) {
          continue; // Skip this event
        }

        // Check registration status
        // Try to find response by authUid first (preferred for newer records)
        let responsesQuery = query(
          collection(db, "form_responses"),
          where("formId", "==", event.formId),
          where("authUid", "==", studentUid)
        );
        
        let responsesSnapshot = await getDocs(responsesQuery);
        
        // If not found by authUid, try studentUid (for older records)
        if (responsesSnapshot.empty) {
          responsesQuery = query(
            collection(db, "form_responses"),
            where("formId", "==", event.formId),
            where("studentUid", "==", studentUid)
          );
          responsesSnapshot = await getDocs(responsesQuery);
        }
        
        console.log(`Event ${event.name} (ID: ${event.id}, FormID: ${event.formId}):`, {
          hasResponse: !responsesSnapshot.empty,
          responseCount: responsesSnapshot.docs.length,
          responses: responsesSnapshot.docs.map(d => ({
            id: d.id,
            formId: d.data().formId,
            authUid: d.data().authUid,
            studentUid: d.data().studentUid,
            registrationStatus: d.data().registrationStatus
          }))
        });
        if (!responsesSnapshot.empty) {
          const responseData = responsesSnapshot.docs[0].data();
          statuses[event.id] = responseData.registrationStatus || 'pending';
        }

        // Check attendance data for past events
        if (!isUpcoming(event.date)) {
          try {
            const attendanceQuery = query(
              collection(db, "eventAttendance"),
              where("eventId", "==", event.id),
              where("authUid", "==", studentUid)
            );
            const attendanceSnapshot = await getDocs(attendanceQuery);
            if (!attendanceSnapshot.empty) {
              const attendanceData = attendanceSnapshot.docs[0].data();
              attendanceDataMap[event.id] = {
                confidence: attendanceData.confidence,
                clockInTime: attendanceData.clockInTime,
                clockOutTime: attendanceData.clockOutTime,
                status: attendanceData.status,
                totalDuration: attendanceData.totalDuration
              };
            }
          } catch (error) {
            console.error("Error checking attendance data:", error);
          }
        }
      }

      setFormStatuses(formStatusMap);
      setRegistrationStatuses(statuses);
      console.log('Final registration statuses:', statuses);
      console.log('Final form statuses:', formStatusMap);
      
      // Add attendance data to events
      const eventsWithAttendance = visibleEvents.map(event => ({
        ...event,
        attendanceData: attendanceDataMap[event.id]
      }));
      
      setEvents(eventsWithAttendance);
      setLoading(false);
    };

    fetchEvents();
  }, [studentUid]);

  const formatDate = (timestamp: Timestamp | Date) => {
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'Asia/Phnom_Penh'
    });
  };

  const formatTime = (timestamp: Timestamp | Date) => {
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Phnom_Penh'
    });
  };

  const isUpcoming = (eventDate: Timestamp | Date) => {
    const date = eventDate instanceof Timestamp ? eventDate.toDate() : eventDate;
    return date >= new Date();
  };

  const getRegistrationBadge = (eventId: string) => {
    const status = registrationStatuses[eventId];
    const formStatus = formStatuses[eventId];

    // Check registration status first
    if (status) {
      switch (status) {
        case 'approved':
          return (
            <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-medium flex items-center gap-1">
              <Icon path={mdiCheckCircle} size={16} />
              {t('registered')}
            </span>
          );
        case 'rejected':
          return (
            <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-xs font-medium flex items-center gap-1">
              <Icon path={mdiCloseCircle} size={16} />
              {t('rejected')}
            </span>
          );
        case 'pending':
          return (
            <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full text-xs font-medium flex items-center gap-1">
              <Icon path={mdiClockOutline} size={16} />
              {t('pending')}
            </span>
          );
      }
    }

    // If not registered, show form status
    if (!formStatus?.exists) {
      return (
        <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs font-medium flex items-center gap-1">
          <Icon path={mdiAlertCircle} size={16} />
          {t('formUnavailable')}
        </span>
      );
    }

    if (!formStatus?.isActive) {
      return null;
    }

    // Form is active and available - no badge needed (Register button will show in action area)
    return null;
  };

  const getActionButton = (event: Event) => {
    const eventId = event.id;
    const registrationStatus = registrationStatuses[eventId];
    const formStatus = formStatuses[eventId];

    // Already approved - show ticket
    if (registrationStatus === 'approved') {
      return (
        <button
          onClick={() => setSelectedTicket(event)}
          className="flex-1 px-4 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
        >
          <Icon path={mdiTicket} size={16} />
          {t('viewTicket')}
        </button>
      );
    }

    // Already registered but pending approval
    if (registrationStatus === 'pending') {
      const isPaidEvent = event.isFree === false && event.pricingOptions && event.pricingOptions.length > 0;
      return (
        <div className="flex-1 px-4 py-2.5 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-lg">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 text-sm">
            <Icon path={mdiClockOutline} size={16} />
            <span className="font-medium">
              {isPaidEvent ? t('awaitingPayment') : t('awaitingApproval')}
            </span>
          </div>
        </div>
      );
    }

    // Registration rejected
    if (registrationStatus === 'rejected') {
      return (
        <div className="flex-1 px-4 py-2.5 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-lg">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-300 text-sm">
            <Icon path={mdiCloseCircle} size={16} />
            <span className="font-medium">{t('registrationRejected')}</span>
          </div>
        </div>
      );
    }

    // Form doesn't exist
    if (!formStatus?.exists) {
      return (
        <div className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm">
            <Icon path={mdiAlertCircle} size={16} />
            <span className="font-medium">{t('formNotAvailable')}</span>
          </div>
        </div>
      );
    }

    // Form is closed/inactive
    if (!formStatus?.isActive) {
      return (
        <div className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm">
            <Icon path={mdiLock} size={16} />
            <span className="font-medium">{t('registrationClosed')}</span>
          </div>
        </div>
      );
    }

    // Form is active and not registered - show register button
    return (
      <a
        href={`/student/forms/${event.formId}`}
        className="flex-1 px-4 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
      >
        <Icon path={mdiFormSelect} size={16} />
        {t('registerNow')}
      </a>
    );
  };

  const upcomingEvents = events.filter(event => isUpcoming(event.date));
  const pastEvents = events.filter(event => !isUpcoming(event.date));

  if (loading) {
    return (
      <div className="space-y-4 px-2">
        <div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
        <div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (events.length === 0) {
    return null; // Don't show section if no events
  }

  return (
    <>
      <div className="space-y-4 px-2">
        {/* Upcoming Events */}
        {upcomingEvents.length > 0 ? (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
              <Icon path={mdiCalendarStar} size={20} />
              {t('upcomingEvents')}
            </h2>
            <div className="space-y-3">
              {upcomingEvents.map((event) => (
                <div
                  key={event.id}
                  className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden hover:shadow-md transition-shadow duration-200"
                >
                  {/* Event Header with Image */}
                  <div className="relative h-40 overflow-hidden">
                    {event.ticketImageUrl ? (
                      <img
                        src={event.ticketImageUrl}
                        alt={event.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 flex items-center justify-center">
                        <Icon path={mdiImage} size={48} className="text-blue-400 dark:text-blue-500" />
                      </div>
                    )}
                  </div>

                  {/* Event Details */}
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white leading-tight">
                        {event.name}
                      </h3>
                      {registrationStatuses[event.id] === 'approved' && (
                        <span className="px-2 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-md text-xs font-medium flex items-center gap-1 ml-3 flex-shrink-0">
                          <Icon path={mdiCheckCircle} size={14} />
                          {t('registered')}
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Icon path={mdiCalendar} size={16} />
                        <span>{formatDate(event.date)}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Icon path={mdiFormSelect} size={16} />
                        <span>{event.formTitle}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      {getActionButton(event)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
              <Icon path={mdiCalendarStar} size={20} />
              {t('upcomingEvents')}
            </h2>
            <div className="text-center">
              <Icon path={mdiCalendar} size={48} className="text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {t('noUpcomingEvents')}
              </h3>
            </div>
          </div>
        )}

        {/* Past Events - Expanded by default */}
        {pastEvents.length > 0 && (
          <details className="group" open>
            <summary className="cursor-pointer list-none">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                <Icon path={mdiCalendarStar} size={20} />
                {t('pastEvents')} ({pastEvents.length})
                <Icon
                  path={mdiChevronRight}
                  size={18}
                  className="transition-transform group-open:rotate-90 ml-auto"
                />
              </h2>
            </summary>
            <div className="space-y-3 mt-3">
              {pastEvents.map((event) => (
                <div
                  key={event.id}
                  className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden opacity-60 hover:opacity-80 transition-opacity duration-200"
                >
                  <div className="relative h-32 overflow-hidden">
                    {event.ticketImageUrl ? (
                      <img
                        src={event.ticketImageUrl}
                        alt={event.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center">
                        <Icon path={mdiImage} size={32} className="text-gray-400 dark:text-gray-500" />
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                          {event.name}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <Icon path={mdiCalendar} size={16} />
                          <span>{formatDate(event.date)}</span>
                        </div>
                      </div>
                      {event.attendanceData && (
                        <div className="flex flex-col gap-1 ml-4">
                          {event.attendanceData.clockInTime && (
                            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                              <Icon path={mdiCheckCircle} size={16} />
                              <span>{t('checkIn')} {formatTime(event.attendanceData.clockInTime)}</span>
                            </div>
                          )}
                          {event.attendanceData.clockOutTime && (
                            <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                              <Icon path={mdiCheckCircle} size={16} />
                              <span>{t('checkOut')} {formatTime(event.attendanceData.clockOutTime)}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {registrationStatuses[event.id] === 'approved' && (
                      <button
                        onClick={() => setSelectedTicket(event)}
                        className="w-full px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                      >
                        <Icon path={mdiTicket} size={16} />
                        {t('viewTicket')}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      {/* Ticket Modal */}
      {selectedTicket && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
          onClick={() => setSelectedTicket(null)}
        >
          <div 
            className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon path={mdiTicket} size={20} className="text-gray-900 dark:text-white" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('eventTicket')}</h2>
                </div>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <Icon path={mdiClose} size={20} className="text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            </div>

            {/* Ticket Content */}
            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {selectedTicket.name}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {formatDate(selectedTicket.date)}
                </p>
              </div>

              <div className="rounded-xl overflow-hidden shadow-lg mb-6">
                {selectedTicket.ticketImageUrl ? (
                  <img
                    src={selectedTicket.ticketImageUrl}
                    alt={selectedTicket.name}
                    className="w-full h-auto"
                  />
                ) : (
                  <div className="w-full h-48 bg-gradient-to-br from-emerald-100 to-blue-100 dark:from-emerald-900/20 dark:to-blue-900/20 flex items-center justify-center rounded-xl">
                    <Icon path={mdiImage} size={64} className="text-emerald-400 dark:text-emerald-500" />
                  </div>
                )}
              </div>

              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/30 rounded-xl">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                  <Icon path={mdiCheckCircle} size={16} />
                  <span className="font-medium">{t('registrationApproved')}</span>
                </div>
                <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
                  {t('showTicketMessage')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default StudentEvents;
