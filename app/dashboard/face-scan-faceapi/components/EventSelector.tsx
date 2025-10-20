"use client";

import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase-config';
import Icon from '../../../_components/Icon';
import { mdiCalendarClock, mdiChevronDown } from '@mdi/js';

interface Event {
  id: string;
  name: string;
  description?: string;
  formId?: string; // Associated form ID for registration check
  startDate: Date;
  endDate: Date;
  isActive: boolean;
}

interface EventSelectorProps {
  selectedEventId: string;
  onEventSelect: (eventId: string, eventName: string, formId?: string) => void;
  disabled?: boolean;
}

export default function EventSelector({ selectedEventId, onEventSelect, disabled }: EventSelectorProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadActiveEvents();
  }, []);

  const loadActiveEvents = async () => {
    try {
      setLoading(true);
      const eventsRef = collection(db, 'events');
      
      const snapshot = await getDocs(eventsRef);
      
      console.log(`Found ${snapshot.size} total events in database`);
      
      const activeEvents: Event[] = [];
      const now = new Date();
      
      snapshot.forEach(doc => {
        const data = doc.data();
        
        // Events use 'date' field (single date), not startDate/endDate
        let eventDate: Date;
        if (data.date?.toDate) {
          eventDate = data.date.toDate();
        } else if (data.date instanceof Date) {
          eventDate = data.date;
        } else {
          console.warn(`Event ${doc.id} has invalid date:`, data.date);
          return;
        }
        
        // Check if event is today or in the future (within 7 days)
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekFromNow = new Date(todayStart);
        weekFromNow.setDate(weekFromNow.getDate() + 7);
        
        const isActive = eventDate >= todayStart && eventDate <= weekFromNow;
        
        console.log(`Event "${data.name}": date=${eventDate.toLocaleDateString()}, isActive=${isActive}`);
        
        if (isActive) {
          activeEvents.push({
            id: doc.id,
            name: data.name || 'Unnamed Event',
            description: data.formTitle || '',
            formId: data.formId || '', // Include form ID for registration filtering
            startDate: eventDate,
            endDate: eventDate, // Same day event
            isActive: true
          });
        }
      });
      
      // Sort by date (soonest first)
      activeEvents.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
      
      console.log(`Loaded ${activeEvents.length} active events:`, activeEvents.map(e => e.name));
      
      setEvents(activeEvents);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedEvent = events.find(e => e.id === selectedEventId);

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        <Icon path={mdiCalendarClock} size={16} className="inline mr-1" />
        Event Attendance Mode
      </label>
      
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled || loading}
          className={`
            w-full px-4 py-3 text-left bg-white dark:bg-gray-800 
            border border-gray-300 dark:border-gray-600 rounded-lg
            focus:outline-none focus:ring-2 focus:ring-blue-500
            ${disabled || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-blue-400'}
            transition-all duration-200
          `}
        >
          <div className="flex items-center justify-between">
            <div>
              {loading ? (
                <span className="text-gray-500 dark:text-gray-400">Loading events...</span>
              ) : selectedEvent ? (
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {selectedEvent.name}
                  </div>
                  {selectedEvent.description && (
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {selectedEvent.description}
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-gray-500 dark:text-gray-400">
                  {events.length === 0 ? 'No active events' : 'Select an event'}
                </span>
              )}
            </div>
            <Icon 
              path={mdiChevronDown} 
              size={0.8} 
              className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`}
            />
          </div>
        </button>

        {/* Dropdown Menu */}
        {isOpen && !disabled && !loading && events.length > 0 && (
          <div className="absolute z-50 mt-2 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-96 overflow-y-auto">
            {events.map(event => (
              <button
                key={event.id}
                onClick={() => {
                  onEventSelect(event.id, event.name, event.formId);
                  setIsOpen(false);
                }}
                className={`
                  w-full px-4 py-3 text-left hover:bg-blue-50 dark:hover:bg-gray-700
                  transition-colors duration-150 border-b border-gray-100 dark:border-gray-700
                  last:border-b-0
                  ${selectedEventId === event.id ? 'bg-blue-50 dark:bg-gray-700' : ''}
                `}
              >
                <div className="font-medium text-gray-900 dark:text-white">
                  {event.name}
                </div>
                {event.description && (
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {event.description}
                  </div>
                )}
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {event.startDate.toLocaleDateString()} - {event.endDate.toLocaleDateString()}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Info Text */}
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        {selectedEventId ? (
          <>
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
            Face scan will record clock-in/out for this event
          </>
        ) : (
          <>
            <span className="inline-block w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
            Select an event to enable event attendance tracking
          </>
        )}
      </p>

      {/* Click outside to close */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
