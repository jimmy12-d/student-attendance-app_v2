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
import DatePicker from "@/app/_components/DatePicker";
import CustomCombobox from "@/app/_components/CustomCombobox";
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
  mdiFaceRecognition,
  mdiCurrencyUsd,
  mdiStar,
  mdiHandCoin,
  mdiGift,
  mdiCheck
} from "@mdi/js";

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

interface PricingOption {
  id: string;
  starPrice?: number; // Stars only
  moneyPrice?: number; // Money only
  starWithMoney?: {
    stars: number | undefined;
    money: number | undefined;
  }; // Combination option
  stock?: number; // Optional ticket limit
  soldCount?: number;
  type?: 'stars' | 'money' | 'combo'; // UI state for selected type
}

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
  isFree?: boolean; // true if event is free
  pricingOptions?: PricingOption[]; // Multiple pricing tiers
  allowBorrow?: boolean; // Allow students to borrow for payment
  isTakeAttendance?: boolean; // Whether to show clock in/out buttons
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
  
  // Pricing states
  const [isFree, setIsFree] = useState(true);
  const [pricingOptions, setPricingOptions] = useState<PricingOption[]>([]);
  const [allowBorrow, setAllowBorrow] = useState(false);
  const [isTakeAttendance, setIsTakeAttendance] = useState(true);

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
      
      // Build event data with only defined values
      const eventData: any = {
        name: eventName,
        date: Timestamp.fromDate(new Date(eventDate)),
        formId: selectedFormId,
        formTitle: selectedForm?.title || "",
        ticketImageUrl: ticketImageUrl || "", // Ensure it's never undefined
        isFree: isFree !== undefined ? isFree : true,
        isTakeAttendance: isTakeAttendance !== undefined ? isTakeAttendance : true,
        updatedAt: Timestamp.now()
      };

      // Only add pricingOptions if not free and has options
      if (!isFree && pricingOptions.length > 0) {
        eventData.pricingOptions = cleanPricingOptions(pricingOptions);
        eventData.allowBorrow = allowBorrow || false;
      } else {
        // For free events, explicitly set these
        eventData.pricingOptions = [];
        eventData.allowBorrow = false;
      }

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
    setIsFree(event.isFree !== false); // Default to true if undefined
    setPricingOptions(event.pricingOptions || []);
    setAllowBorrow(event.allowBorrow || false);
    setIsTakeAttendance(event.isTakeAttendance !== false); // Default to true if undefined
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
    setIsFree(true);
    setPricingOptions([]);
    setAllowBorrow(false);
    setIsTakeAttendance(true);
  };

  const handleCloseModal = () => {
    resetForm();
    setShowCreateModal(false);
  };

  const viewRegistrations = (eventId: string) => {
    router.push(`/dashboard/events/${eventId}/registrations`);
  };

  // Clean pricing options to remove undefined values
  const cleanPricingOptions = (options: PricingOption[]) => {
    return options.map(option => {
      const cleaned: any = {
        id: option.id,
        type: option.type
      };
      
      if (option.starPrice !== undefined) cleaned.starPrice = option.starPrice;
      if (option.moneyPrice !== undefined) cleaned.moneyPrice = option.moneyPrice;
      if (option.starWithMoney !== undefined) cleaned.starWithMoney = option.starWithMoney;
      if (option.stock !== undefined) cleaned.stock = option.stock;
      if (option.soldCount !== undefined) cleaned.soldCount = option.soldCount;
      
      return cleaned;
    });
  };

  // Pricing option helpers
  const addPricingOption = () => {
    const newOption: PricingOption = {
      id: `option_${Date.now()}`,
      starPrice: undefined,
      moneyPrice: undefined,
      starWithMoney: undefined,
      stock: undefined,
      soldCount: 0,
      type: undefined
    };
    setPricingOptions([...pricingOptions, newOption]);
  };

  const updatePricingOption = (id: string, updates: Partial<PricingOption>) => {
    setPricingOptions(pricingOptions.map(opt => 
      opt.id === id ? { ...opt, ...updates } : opt
    ));
  };

  const removePricingOption = (id: string) => {
    setPricingOptions(pricingOptions.filter(opt => opt.id !== id));
  };

  const setPricingType = (id: string, type: 'stars' | 'money' | 'combo') => {
    const updates: Partial<PricingOption> = {
      type: type,
      starPrice: type === 'stars' ? undefined : undefined,
      moneyPrice: type === 'money' ? undefined : undefined,
      starWithMoney: type === 'combo' ? { stars: undefined, money: undefined } : undefined
    };
    updatePricingOption(id, updates);
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
          className="pt-20 fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={handleCloseModal}
        >
          <div 
            className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-lg shadow-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-purple-600 py-4 px-4 rounded-t-lg sticky top-0 z-10">
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
                <DatePicker
                  selectedDate={eventDate}
                  onDateChange={setEventDate}
                  placeholder="Select event date"
                />
              </div>

              {/* Linked Form */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Registration Form *
                </label>
                <CustomCombobox
                  options={forms.map(form => ({
                    value: form.id,
                    label: form.title
                  }))}
                  selectedValue={selectedFormId}
                  onChange={setSelectedFormId}
                  placeholder="Select a registration form"
                  editable={false}
                  fieldData={{
                    className: "w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  }}
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Students will use this form to register for the event
                </p>
              </div>

              {/* Ticket Image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Event Ticket Image (Optional)
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

              {/* Pricing Configuration */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Ticket Pricing
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <input
                        type="checkbox"
                        id="isFree"
                        checked={isFree}
                        onChange={(e) => {
                          setIsFree(e.target.checked);
                          if (e.target.checked) {
                            setPricingOptions([]);
                            setAllowBorrow(false);
                          }
                        }}
                        className="sr-only"
                      />
                      <div
                        onClick={() => {
                          setIsFree(!isFree);
                          if (!isFree) {
                            setPricingOptions([]);
                            setAllowBorrow(false);
                          }
                        }}
                        className={`w-4 h-4 border-2 rounded flex items-center justify-center transition-colors cursor-pointer ${
                          isFree
                            ? 'bg-purple-600 border-purple-600'
                            : 'bg-white border-gray-300 dark:border-gray-600'
                        }`}>
                        {isFree && (
                          <Icon path={mdiCheck} size={12} className="text-white" />
                        )}
                      </div>
                    </div>
                    <label htmlFor="isFree" className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                      Free Event
                    </label>
                  </div>
                </div>

                {!isFree && (
                  <div className="space-y-4">
                    {/* Pricing Options */}
                    {pricingOptions.map((option, index) => (
                      <div key={option.id} className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                            Option {index + 1}
                          </h4>
                          <button
                            type="button"
                            onClick={() => removePricingOption(option.id)}
                            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-600"
                          >
                            <Icon path={mdiClose} size={16} />
                          </button>
                        </div>

                        {/* Payment Type Selection */}
                        <div className="mb-3">
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Payment Type
                          </label>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setPricingType(option.id, 'stars')}
                              className={`flex-1 px-3 py-2 rounded text-xs font-medium transition-colors flex items-center justify-center ${
                                option.type === 'stars'
                                  ? 'bg-yellow-500 text-white'
                                  : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                              }`}
                            >
                              <Icon path={mdiStar} size={14} className="inline mr-1 flex-shrink-0" />
                              Stars Only
                            </button>
                            <button
                              type="button"
                              onClick={() => setPricingType(option.id, 'money')}
                              className={`flex-1 px-3 py-2 rounded text-xs font-medium transition-colors flex items-center justify-center ${
                                option.type === 'money'
                                  ? 'bg-green-500 text-white'
                                  : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                              }`}
                            >
                              <Icon path={mdiCurrencyUsd} size={14} className="inline mr-1 flex-shrink-0" />
                              Money Only
                            </button>
                            <button
                              type="button"
                              onClick={() => setPricingType(option.id, 'combo')}
                              className={`flex-1 px-3 py-2 rounded text-xs font-medium transition-colors flex items-center justify-center ${
                                option.type === 'combo'
                                  ? 'bg-purple-500 text-white'
                                  : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                              }`}
                            >
                              <Icon path={mdiHandCoin} size={14} className="inline mr-1 flex-shrink-0" />
                              Combo
                            </button>
                          </div>
                        </div>

                        {/* Price Inputs */}
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          {option.type === 'stars' && (
                            <div className="col-span-2">
                              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                                <Icon path={mdiStar} size={12} className="inline mr-1" />
                                Stars
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={option.starPrice ?? ""}
                                onChange={(e) => updatePricingOption(option.id, { starPrice: e.target.value === "" ? 0 : parseInt(e.target.value) || 0 })}
                                className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                              />
                            </div>
                          )}

                          {option.type === 'money' && (
                            <div className="col-span-2">
                              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                                <Icon path={mdiCurrencyUsd} size={12} className="inline mr-1" />
                                Money ($)
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={option.moneyPrice ?? ""}
                                onChange={(e) => updatePricingOption(option.id, { moneyPrice: e.target.value === "" ? 0 : parseFloat(e.target.value) || 0 })}
                                className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                              />
                            </div>
                          )}

                          {option.type === 'combo' && (
                            <>
                              <div>
                                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                                  <Icon path={mdiStar} size={12} className="inline mr-1" />
                                  Stars
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  value={option.starWithMoney?.stars ?? ""}
                                  onChange={(e) => updatePricingOption(option.id, {
                                    starWithMoney: {
                                      ...option.starWithMoney!,
                                      stars: e.target.value === "" ? 0 : parseInt(e.target.value) || 0
                                    }
                                  })}
                                  className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                                  <Icon path={mdiCurrencyUsd} size={12} className="inline mr-1" />
                                  Money ($)
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={option.starWithMoney?.money ?? ""}
                                  onChange={(e) => updatePricingOption(option.id, {
                                    starWithMoney: {
                                      ...option.starWithMoney!,
                                      money: e.target.value === "" ? 0 : parseFloat(e.target.value) || 0
                                    }
                                  })}
                                  className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                />
                              </div>
                            </>
                          )}
                        </div>

                        {/* Optional Stock */}
                        <div>
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                            Stock Limit (optional)
                          </label>
                          <input
                            type="number"
                            value={option.stock ?? ""}
                            onChange={(e) => updatePricingOption(option.id, { stock: e.target.value ? parseInt(e.target.value) : undefined })}
                            placeholder="Unlimited if empty"
                            className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                          />
                        </div>
                      </div>
                    ))}

                    {/* Add Option Button */}
                    <button
                      type="button"
                      onClick={addPricingOption}
                      className="w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 font-medium"
                    >
                      <Icon path={mdiPlus} size={16} className="inline mr-2" />
                      Add Pricing Option
                    </button>

                    {/* Allow Borrow */}
                    <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div className="relative">
                        <input
                          type="checkbox"
                          id="allowBorrow"
                          checked={allowBorrow}
                          onChange={(e) => setAllowBorrow(e.target.checked)}
                          className="sr-only"
                        />
                        <div
                          onClick={() => setAllowBorrow(!allowBorrow)}
                          className={`w-4 h-4 border-2 rounded flex items-center justify-center transition-colors cursor-pointer ${
                            allowBorrow
                              ? 'bg-blue-600 border-blue-600'
                              : 'bg-white border-gray-300 dark:border-gray-600'
                          }`}>
                          {allowBorrow && (
                            <Icon path={mdiCheck} size={12} className="text-white" />
                          )}
                        </div>
                      </div>
                      <label htmlFor="allowBorrow" className="flex-1 cursor-pointer">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          <Icon path={mdiHandCoin} size={16} className="inline mr-1" />
                          Allow Borrowing
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          Students can borrow stars/money if they don't have enough
                        </div>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Attendance Tracking Configuration */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
                <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="relative">
                    <input
                      type="checkbox"
                      id="isTakeAttendance"
                      checked={isTakeAttendance}
                      onChange={(e) => setIsTakeAttendance(e.target.checked)}
                      className="sr-only"
                    />
                    <div
                      onClick={() => setIsTakeAttendance(!isTakeAttendance)}
                      className={`w-4 h-4 border-2 rounded flex items-center justify-center transition-colors cursor-pointer ${
                        isTakeAttendance
                          ? 'bg-blue-600 border-blue-600'
                          : 'bg-white border-gray-300 dark:border-gray-600'
                      }`}>
                      {isTakeAttendance && (
                        <Icon path={mdiCheck} size={12} className="text-white" />
                      )}
                    </div>
                  </div>
                  <label htmlFor="isTakeAttendance" className="flex-1 cursor-pointer">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      <Icon path={mdiClockOutline} size={16} className="inline mr-1" />
                      Enable Attendance Tracking
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      Show clock in/out and face scan buttons on registration page
                    </div>
                  </label>
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
        {event.ticketImageUrl ? (
          <img 
            src={event.ticketImageUrl} 
            alt={event.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icon path={mdiCalendarStar} size={64} className="text-gray-400 dark:text-gray-500" />
          </div>
        )}
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

          {/* Pricing Info */}
          {event.isFree !== false ? (
            <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
              <Icon path={mdiGift} size={16} />
              <span>Free Event</span>
            </div>
          ) : (
            <div className="space-y-1">
              {event.pricingOptions && event.pricingOptions.length > 0 && (
                <>
                  {event.pricingOptions.map((option, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                      <Icon path={mdiTicket} size={14} />
                      <span className="font-medium">Tier {idx + 1}:</span>
                      {option.type === 'stars' && (
                        <span className="text-yellow-600 dark:text-yellow-400">
                          ⭐ {option.starPrice}
                        </span>
                      )}
                      {option.type === 'money' && (
                        <span className="text-green-600 dark:text-green-400">
                          ${option.moneyPrice}
                        </span>
                      )}
                      {option.type === 'combo' && (
                        <span className="text-purple-600 dark:text-purple-400">
                          ⭐ {option.starWithMoney?.stars} + ${option.starWithMoney?.money}
                        </span>
                      )}
                    </div>
                  ))}
                  {event.allowBorrow && (
                    <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 mt-1">
                      <Icon path={mdiHandCoin} size={12} />
                      <span>Borrowing available</span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          {/* Primary Actions Row */}
          <div className="flex gap-2">
            <button
              onClick={() => onViewRegistrations(event.id)}
              className={`${event.isTakeAttendance === true ? 'flex-1' : 'w-full'} px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium`}
            >
              <Icon path={mdiAccount} size={16} />
              Registrations
            </button>
            {event.isTakeAttendance === true && (
              <button
                onClick={handleFaceScan}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
              >
                <Icon path={mdiFaceRecognition} size={16} />
                Face Scan
              </button>
            )}
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
