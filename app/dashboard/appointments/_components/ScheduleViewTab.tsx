"use client";

import React, { useState } from 'react';
import { mdiCalendarClock, mdiCheck, mdiClose, mdiClockOutline, mdiCalendar, mdiChevronDown, mdiChevronUp, mdiChartLine } from '@mdi/js';
import Icon from '../../../_components/Icon';
import { AdminAvailability, AppointmentRequest } from '../../../_interfaces';
import { formatDateForDisplay } from '../../../_utils/dateUtils';

interface SlotInfo {
  time: string;
  date: string;
  status: 'free' | 'pending' | 'approved' | 'rejected';
  request?: AppointmentRequest;
}

interface AppointmentScheduleGridProps {
  availabilities: AdminAvailability[];
  appointmentRequests: AppointmentRequest[];
  onApproveRequest: (request: AppointmentRequest) => void;
  onRejectRequest: (request: AppointmentRequest) => void;
  onDeleteRequest: (request: AppointmentRequest) => void;
  onMarkAttendance: (request: AppointmentRequest, status: 'met' | 'no-show') => void;
  onEditMeeting: (request: AppointmentRequest) => void;
  onFetchDetails: (studentId: string, studentName: string, appointmentRequest: AppointmentRequest) => void;
}

const ScheduleViewTab: React.FC<AppointmentScheduleGridProps> = ({
  availabilities,
  appointmentRequests,
  onApproveRequest,
  onRejectRequest,
  onDeleteRequest,
  onMarkAttendance,
  onEditMeeting,
  onFetchDetails,
}) => {
  const [expandedSlots, setExpandedSlots] = useState<Set<string>>(new Set());

  const toggleSlot = (slotKey: string) => {
    setExpandedSlots(prev => {
      const newSet = new Set(prev);
      if (newSet.has(slotKey)) {
        newSet.delete(slotKey);
      } else {
        newSet.add(slotKey);
      }
      return newSet;
    });
  };

  const generateTimeSlots = (availability: AdminAvailability): SlotInfo[] => {
    const slots: SlotInfo[] = [];
    const startTime = new Date(`2000-01-01T${availability.startTime}`);
    const endTime = new Date(`2000-01-01T${availability.endTime}`);
    const slotDuration = availability.slotDuration;

    let currentTime = new Date(startTime);

    while (currentTime < endTime) {
      const timeString = currentTime.toTimeString().slice(0, 5);
      
      const matchingRequest = appointmentRequests.find(req => 
        req.appointmentDate === availability.date && 
        req.appointmentTime === timeString
      );

      slots.push({
        time: timeString,
        date: availability.date,
        status: matchingRequest ? matchingRequest.status as 'pending' | 'approved' | 'rejected' : 'free',
        request: matchingRequest
      });

      currentTime.setMinutes(currentTime.getMinutes() + slotDuration);
    }

    return slots;
  };

  const slotsByDate = availabilities.reduce((acc, availability) => {
    const date = availability.date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(...generateTimeSlots(availability));
    return acc;
  }, {} as Record<string, SlotInfo[]>);

  const sortedDates = Object.keys(slotsByDate).sort();

  const getSlotColor = (status: string) => {
    switch (status) {
      case 'free': return 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700';
      case 'pending': return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700';
      case 'approved': return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700';
      case 'rejected': return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700';
      default: return 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
    }
  };

  const getSlotIcon = (status: string) => {
    switch (status) {
      case 'pending': return mdiClockOutline;
      case 'approved': return mdiCheck;
      case 'rejected': return mdiClose;
      default: return null;
    }
  };

  if (sortedDates.length === 0) {
    return (
      <div className="text-center py-16 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 rounded-2xl mb-4">
          <Icon path={mdiCalendarClock} size={16} className="text-slate-400 dark:text-slate-500" />
        </div>
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">No availability schedules</h3>
        <p className="text-slate-600 dark:text-slate-400">Create availability schedules in the Admin Availability tab first</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {sortedDates.map(date => (
        <div key={date} className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-200/50 dark:border-slate-700/50">
          <div className="flex items-center gap-3 mb-6">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl shadow-lg shadow-purple-500/25">
              <Icon path={mdiCalendar} size={16} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">
                {formatDateForDisplay(date)}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {slotsByDate[date].length} time slots available
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
            {slotsByDate[date].map((slot, index) => {
              const slotKey = `${slot.date}-${slot.time}-${index}`;
              const isExpanded = expandedSlots.has(slotKey);
              
              return (
                <div
                  key={slotKey}
                  className={`relative border rounded-xl p-2 transition-all duration-200 ${getSlotColor(slot.status)} ${
                    slot.status !== 'free' ? 'cursor-default' : 'cursor-pointer'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-xs font-medium text-slate-800 dark:text-slate-200 mb-1">
                      {slot.time}
                    </div>
                    
                    {slot.status !== 'free' && slot.request && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-center gap-1">
                          <Icon path={getSlotIcon(slot.status) || mdiCalendar} size={10} className="text-slate-600 dark:text-slate-400" />
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-300 capitalize">
                            {slot.status}
                          </span>
                        </div>
                        
                        <div className="text-xs text-slate-600 dark:text-slate-400 truncate">
                          {slot.request.studentName}
                        </div>
                        {slot.request.studentClass && (
                          <div className="text-xs text-slate-500 dark:text-slate-500">
                            {slot.request.studentClass}
                          </div>
                        )}
                        
                        {/* Expand/Collapse Button */}
                        {slot.status === 'approved' && (
                          <button
                            onClick={() => toggleSlot(slotKey)}
                            className="w-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs px-1 py-0.5 rounded hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-1"
                          >
                            <Icon path={isExpanded ? mdiChevronUp : mdiChevronDown} size={10} />
                            {isExpanded ? 'Hide' : 'Actions'}
                          </button>
                        )}
                        
                        {/* Expanded Content - Only for approved slots */}
                        {slot.status === 'approved' && isExpanded && (
                          <div className="space-y-1 pt-1 border-t border-slate-300 dark:border-slate-600">
                            {slot.request.attendanceStatus ? (
                              <div className={`text-xs px-1 py-0.5 rounded text-white font-medium text-center ${
                                slot.request.attendanceStatus === 'met' 
                                  ? 'bg-green-600' 
                                  : 'bg-red-600'
                              }`}>
                                {slot.request.attendanceStatus === 'met' ? '✓ Attended' : '✗ No Show'}
                              </div>
                            ) : (
                              <div className="flex gap-1">
                                <button
                                  onClick={() => onMarkAttendance(slot.request!, 'met')}
                                  className="flex-1 bg-green-600 text-white text-xs px-1 py-0.5 rounded hover:bg-green-700 transition-colors text-center"
                                  title="Mark as attended"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={() => onMarkAttendance(slot.request!, 'no-show')}
                                  className="flex-1 bg-red-600 text-white text-xs px-1 py-0.5 rounded hover:bg-red-700 transition-colors text-center"
                                  title="Mark as no-show"
                                >
                                  ✗
                                </button>
                              </div>
                            )}
                            <button
                              onClick={() => onFetchDetails(slot.request!.studentId, slot.request!.studentName, slot.request!)}
                              className="w-full bg-indigo-600 text-white text-xs px-1 py-0.5 rounded hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1"
                              title="View Details"
                            >
                              <Icon path={mdiChartLine} size={10} />
                            </button>
                          </div>
                        )}
                        
                        {/* Pending status buttons */}
                        {slot.status === 'pending' && (
                          <div className="space-y-1">
                            <div className="flex gap-1">
                              <button
                                onClick={() => onApproveRequest(slot.request!)}
                                className="flex-1 bg-green-600 text-white text-xs px-1 py-0.5 rounded hover:bg-green-700 transition-colors flex items-center justify-center gap-1"
                                title="Approve"
                              >
                                <Icon path={mdiCheck} size={10} />
                              </button>
                              <button
                                onClick={() => onRejectRequest(slot.request!)}
                                className="flex-1 bg-red-600 text-white text-xs px-1 py-0.5 rounded hover:bg-red-700 transition-colors flex items-center justify-center gap-1"
                                title="Reject"
                              >
                                <Icon path={mdiClose} size={10} />
                              </button>
                            </div>
                            <button
                              onClick={() => onEditMeeting(slot.request!)}
                              className="w-full bg-blue-600 text-white text-xs px-1 py-0.5 rounded hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                              title="Edit Meeting Time"
                            >
                              <Icon path={mdiChevronDown} size={10} />
                            </button>
                          </div>
                        )}
                        
                        {/* Rejected reason */}
                        {slot.status === 'rejected' && slot.request.rejectionReason && (
                          <div className="text-xs text-red-600 dark:text-red-400 mt-1 truncate" title={slot.request.rejectionReason}>
                            {slot.request.rejectionReason}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {slot.status === 'free' && (
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Available
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ScheduleViewTab;
