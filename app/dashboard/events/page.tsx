"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db, storage } from "@/firebase-config";
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
  getDocs,
  where
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { toast } from "sonner";
import Icon from "@/app/_components/Icon";
import { 
  mdiCalendarStar, 
  mdiPlus, 
  mdiPencil, 
  mdiDelete, 
  mdiAccount,
  mdiCalendar,
  mdiFormSelect,
  mdiImage,
  mdiClose,
  mdiChevronRight,
  mdiTicket,
  mdiClockOutline,
  mdiFaceRecognition
} from "@mdi/js";

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

interface Event {
  id: string;
  name: string;
  date: Timestamp | Date;
  formId: string;
  formTitle?: string;
  ticketImageUrl: string;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  registrationCount?: number;
}

interface Form {
  id: string;
  title: string;
}

const EventsPage = () => {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  
  // Form states
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [selectedFormId, setSelectedFormId] = useState("");
  const [ticketImage, setTicketImage] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load events
  useEffect(() => {
    const eventsQuery = query(
      collection(db, "events"),
      orderBy("date", "desc")
    );

    const unsubscribe = onSnapshot(eventsQuery, async (snapshot) => {
      const fetchedEvents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Event));

      // Get registration counts for each event
      const eventsWithCounts = await Promise.all(
        fetchedEvents.map(async (event) => {
          const responsesQuery = query(
            collection(db, "form_responses"),
            where("formId", "==", event.formId)
          );
          const responsesSnap = await getDocs(responsesQuery);
          
          return {
            ...event,
            registrationCount: responsesSnap.size
          };
        })
      );

      setEvents(eventsWithCounts);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching events:", error);
      toast.error("Failed to load events");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Load forms
  useEffect(() => {
    const formsQuery = query(
      collection(db, "forms"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(formsQuery, (snapshot) => {
      const fetchedForms = snapshot.docs.map(doc => ({
        id: doc.id,
        title: doc.data().title
      } as Form));
      setForms(fetchedForms);
    });

    return () => unsubscribe();
  }, []);

  const handleImageUpload = async (file: File): Promise<string> => {
    const storageRef = ref(storage, `event-tickets/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!eventName || !eventDate || !selectedFormId) {
      toast.error("Please fill all required fields");
      return;
    }

    if (!ticketImage && !editingEvent) {
      toast.error("Please upload a ticket image");
      return;
    }

    setSubmitting(true);

    try {
      let ticketImageUrl = editingEvent?.ticketImageUrl || "";
      
      // Upload new image if provided
      if (ticketImage) {
        setUploadingImage(true);
        ticketImageUrl = await handleImageUpload(ticketImage);
        setUploadingImage(false);
      }

      const selectedForm = forms.find(f => f.id === selectedFormId);
      const eventData = {
        name: eventName,
        date: Timestamp.fromDate(new Date(eventDate)),
        formId: selectedFormId,
        formTitle: selectedForm?.title || "",
        ticketImageUrl,
        updatedAt: Timestamp.now()
      };

      if (editingEvent) {
        // Update existing event
        await updateDoc(doc(db, "events", editingEvent.id), eventData);
        toast.success("Event updated successfully");
      } else {
        // Create new event
        await addDoc(collection(db, "events"), {
          ...eventData,
          createdAt: Timestamp.now()
        });
        toast.success("Event created successfully");
      }

      resetForm();
      setShowCreateModal(false);
    } catch (error) {
      console.error("Error saving event:", error);
      toast.error("Failed to save event");
    } finally {
      setSubmitting(false);
      setUploadingImage(false);
    }
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setEventName(event.name);
    const eventDate = event.date instanceof Timestamp ? event.date.toDate() : event.date;
    setEventDate(eventDate.toISOString().split('T')[0]);
    setSelectedFormId(event.formId);
    setShowCreateModal(true);
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return;

    try {
      await deleteDoc(doc(db, "events", eventId));
      toast.success("Event deleted successfully");
    } catch (error) {
      console.error("Error deleting event:", error);
      toast.error("Failed to delete event");
    }
  };

  const resetForm = () => {
    setEventName("");
    setEventDate("");
    setSelectedFormId("");
    setTicketImage(null);
    setEditingEvent(null);
  };

  const handleCloseModal = () => {
    resetForm();
    setShowCreateModal(false);
  };

  const viewRegistrations = (eventId: string) => {
    router.push(`/dashboard/events/${eventId}/registrations`);
  };

  const formatDate = (timestamp: Timestamp | Date) => {
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'Asia/Phnom_Penh'
    });
  };

  const isUpcoming = (eventDate: Timestamp | Date) => {
    const date = eventDate instanceof Timestamp ? eventDate.toDate() : eventDate;
    return date >= new Date();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="h-32 bg-white dark:bg-gray-800 rounded-lg shadow-sm animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-white dark:bg-gray-800 rounded-lg shadow-sm animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const upcomingEvents = events.filter(event => isUpcoming(event.date));
  const pastEvents = events.filter(event => !isUpcoming(event.date));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                  <Icon path={mdiCalendarStar} size={24} className="text-white" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Event Management
                </h1>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base ml-15">
                Create and manage school events with form registrations
              </p>
              
              <div className="flex flex-wrap gap-2 mt-4 ml-15">
                <div className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm">
                  {upcomingEvents.length} Upcoming
                </div>
                <div className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm">
                  {pastEvents.length} Past Events
                </div>
              </div>
            </div>
            
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-4 rounded-lg shadow-sm hover:shadow-md transform hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <Icon path={mdiPlus} size={16} />
              <span className="font-bold">Create Event</span>
            </button>
          </div>
        </div>
      </div>

      {/* Events Grid */}
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Upcoming Events */}
        {upcomingEvents.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Icon path={mdiCalendarStar} size={16} />
              Upcoming Events
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onViewRegistrations={viewRegistrations}
                  formatDate={formatDate}
                  isPast={false}
                />
              ))}
            </div>
          </div>
        )}

        {/* Past Events */}
        {pastEvents.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Icon path={mdiClockOutline} size={16} />
              Past Events
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pastEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onViewRegistrations={viewRegistrations}
                  formatDate={formatDate}
                  isPast={true}
                />
              ))}
            </div>
          </div>
        )}

        {events.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
            <div className="w-24 h-24 mx-auto mb-6 bg-purple-600 rounded-lg flex items-center justify-center shadow-sm">
              <Icon path={mdiCalendarStar} size={28} className="text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              No events yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
              Create your first event to start collecting registrations from students
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-lg shadow-sm hover:shadow-md transform hover:scale-105 transition-all duration-300 inline-flex items-center gap-2"
            >
              <Icon path={mdiPlus} size={16} />
              <span className="font-bold">Create Your First Event</span>
            </button>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={handleCloseModal}
        >
          <div 
            className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-lg shadow-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-purple-600 p-6 rounded-t-lg sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">
                  {editingEvent ? "Edit Event" : "Create New Event"}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <Icon path={mdiClose} size={16} className="text-white" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Event Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Event Name *
                </label>
                <input
                  type="text"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="e.g., Annual Sports Day"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Event Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Event Date *
                </label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Linked Form */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Registration Form *
                </label>
                <select
                  value={selectedFormId}
                  onChange={(e) => setSelectedFormId(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                >
                  <option value="">Select a form</option>
                  {forms.map((form) => (
                    <option key={form.id} value={form.id}>
                      {form.title}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Students will use this form to register for the event
                </p>
              </div>

              {/* Ticket Image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Event Ticket Image *
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg hover:border-purple-400 transition-colors">
                  <div className="space-y-2 text-center">
                    <Icon path={mdiImage} size={28} className="mx-auto text-gray-400" />
                    <div className="flex text-sm text-gray-600 dark:text-gray-400">
                      <label className="relative cursor-pointer bg-white dark:bg-gray-700 rounded-md font-medium text-purple-600 hover:text-purple-500 px-3 py-2">
                        <span>Upload a file</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setTicketImage(e.target.files?.[0] || null)}
                          className="sr-only"
                        />
                      </label>
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                    {ticketImage && (
                      <p className="text-sm text-green-600 dark:text-green-400">
                        ✓ {ticketImage.name}
                      </p>
                    )}
                    {editingEvent && !ticketImage && (
                      <p className="text-sm text-blue-600 dark:text-blue-400">
                        Current image will be kept if not changed
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || uploadingImage}
                  className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? "Saving..." : uploadingImage ? "Uploading..." : editingEvent ? "Update Event" : "Create Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Event Card Component
interface EventCardProps {
  event: Event;
  onEdit: (event: Event) => void;
  onDelete: (eventId: string) => void;
  onViewRegistrations: (eventId: string) => void;
  formatDate: (date: Timestamp | Date) => string;
  isPast: boolean;
}

const EventCard = ({ event, onEdit, onDelete, onViewRegistrations, formatDate, isPast }: EventCardProps) => {
  const router = useRouter();
  
  const handleFaceScan = () => {
    // Navigate to face scan page with event details as URL parameters
    const params = new URLSearchParams({
      eventId: event.id,
      eventName: event.name,
      formId: event.formId
    });
    router.push(`/dashboard/face-scan-faceapi?${params.toString()}`);
  };
  
  return (
    <div className={`group bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-all duration-300 ${isPast ? 'opacity-75' : ''}`}>
      {/* Ticket Image */}
      <div className="relative h-48 bg-gray-200 dark:bg-gray-700 overflow-hidden">
        <img 
          src={event.ticketImageUrl} 
          alt={event.name}
          className="w-full h-full object-cover"
        />
        {isPast && (
          <div className="absolute top-2 right-2 px-3 py-1 bg-gray-800/80 text-white rounded-full text-xs font-medium">
            Past Event
          </div>
        )}
        {!isPast && (
          <div className="absolute top-2 right-2 px-3 py-1 bg-purple-600 text-white rounded-full text-xs font-medium">
            Upcoming
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-2">
          {event.name}
        </h3>
        
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Icon path={mdiCalendar} size={16} />
            <span>{formatDate(event.date)}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Icon path={mdiFormSelect} size={16} />
            <span className="line-clamp-1">{event.formTitle}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Icon path={mdiAccount} size={16} />
            <span>{event.registrationCount || 0} Registrations</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          {/* Primary Actions Row */}
          <div className="flex gap-2">
            <button
              onClick={() => onViewRegistrations(event.id)}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
            >
              <Icon path={mdiAccount} size={16} />
              Registrations
            </button>
            <button
              onClick={handleFaceScan}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
            >
              <Icon path={mdiFaceRecognition} size={16} />
              Face Scan
            </button>
          </div>
          
          {/* Secondary Actions Row */}
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(event)}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
            >
              <Icon path={mdiPencil} size={16} />
              Edit
            </button>
            <button
              onClick={() => onDelete(event.id)}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
            >
              <Icon path={mdiDelete} size={16} />
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventsPage;
