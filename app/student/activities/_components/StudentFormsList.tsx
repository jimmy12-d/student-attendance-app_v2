"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, query, where, onSnapshot, Timestamp, getDocs } from "firebase/firestore";
import { db } from "@/firebase-config";
import { Form, FormWithResponseStatus } from "@/app/_interfaces/forms";
import { toast } from "sonner";
import { useTranslations, useLocale } from 'next-intl';

interface StudentFormsListProps {
  studentUid: string;
  studentClassType?: string; // Student's class type for filtering
  khmerFont: (additionalClasses?: string) => string;
  createRipple?: (event: React.MouseEvent<HTMLDivElement>, color?: string) => void;
}

const StudentFormsList: React.FC<StudentFormsListProps> = ({ 
  studentUid,
  studentClassType,
  khmerFont,
  createRipple 
}) => {
  const router = useRouter();
  const t = useTranslations('student.forms');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  
  // Helper function for single language display (uses current locale)
  const getText = (key: string) => {
    return t(key);
  };
  
  // Helper function for bilingual display (for status badges that need both)
  const bilingualText = (key: string) => {
    const englishTranslations = {
      activeForms: "Active Forms",
      allCaughtUp: "All Caught Up!",
      noActiveForms: "No active forms at the moment",
      approved: "Approved",
      rejected: "Rejected", 
      pending: "Pending",
      done: "Done",
      urgent: "Urgent",
      approvedStatus: "Approved",
      rejectedStatus: "Rejected",
      pendingReview: "Pending Review",
      completed: "Completed",
      questions: "questions"
    };
    
    // For inline status text, just return the translation
    return t(key);
  };
  
  const [forms, setForms] = useState<FormWithResponseStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissedForms, setDismissedForms] = useState<Set<string>>(new Set());
  const [swipeState, setSwipeState] = useState<{ [key: string]: { x: number; startX: number; swiping: boolean } }>({});

  // Load dismissed forms from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`dismissed_forms_${studentUid}`);
    if (stored) {
      try {
        setDismissedForms(new Set(JSON.parse(stored)));
      } catch (e) {
        console.error("Error loading dismissed forms:", e);
      }
    }
  }, [studentUid]);

  useEffect(() => {
    if (!studentUid) {
      setLoading(false);
      return;
    }

    // Query all forms (no deadline filter)
    // We'll filter by isVisible client-side, and show visible forms even after deadline
    const formsQuery = query(collection(db, "forms"));

    const unsubscribe = onSnapshot(formsQuery, async (snapshot) => {
      // Filter by isVisible on client side (undefined or true = visible, false = hidden)
      // No deadline filter - visible forms show even after deadline expires
      const fetchedForms = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Form))
        .filter(form => form.isVisible !== false); // Only exclude if explicitly false

      // Get all form IDs that are linked to events
      const eventsQuery = query(collection(db, "events"));
      const eventsSnapshot = await getDocs(eventsQuery);
      const eventFormIds = new Set(
        eventsSnapshot.docs.map(doc => doc.data().formId).filter(Boolean)
      );

      // Filter forms by student's class type and exclude event forms
      const filteredForms = fetchedForms.filter(form => {
        // Exclude forms that are linked to events
        if (eventFormIds.has(form.id)) {
          return false;
        }
        
        // If form has no targetClassTypes, it's available to all
        if (!form.targetClassTypes || form.targetClassTypes.length === 0) {
          return true;
        }
        // If student has a classType, check if it's in the form's targetClassTypes
        if (studentClassType && form.targetClassTypes.includes(studentClassType)) {
          return true;
        }
        // Otherwise, exclude this form
        return false;
      });

      // Get current timestamp for deadline comparison
      const now = Timestamp.now();

      // Check which forms the student has already responded to
      const formsWithStatus = await Promise.all(
        filteredForms.map(async (form) => {
          // Check if student has responded
          const studentResponseQuery = query(
            collection(db, "form_responses"),
            where("formId", "==", form.id),
            where("authUid", "==", studentUid)
          );
          const studentResponseSnap = await getDocs(studentResponseQuery);
          
          // Get approval status if response exists
          let approvalStatus = undefined;
          const hasSubmitted = !studentResponseSnap.empty;
          
          if (hasSubmitted) {
            const responseData = studentResponseSnap.docs[0].data();
            approvalStatus = responseData.approvalStatus || 'pending';
          }
          
          // Hide forms past deadline if student hasn't submitted
          if (!hasSubmitted && form.deadline) {
            const deadlineTime = form.deadline instanceof Timestamp 
              ? form.deadline.toMillis() 
              : form.deadline.getTime();
            if (deadlineTime < now.toMillis()) {
              return null; // Mark for filtering
            }
          }
          
          const formWithStatus = {
            ...form,
            hasResponded: !studentResponseSnap.empty,
            approvalStatus: approvalStatus,
            isFull: false // Remove client-side maxResponses check due to permission restrictions
          };
          
          return formWithStatus;
        })
      );

      // Filter out null values (forms past deadline that student hasn't submitted)
      const availableForms = formsWithStatus.filter(form => form !== null);
      setForms(availableForms);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching forms:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [studentUid, studentClassType]);

  const handleFormClick = (formId: string, hasResponded: boolean, isActive: boolean, e: React.MouseEvent<HTMLDivElement>) => {
    if (createRipple) {
      createRipple(e, 'rgba(59, 130, 246, 0.3)');
    }
    
    // If form is not active, show a message
    if (!isActive) {
      toast.info(t('notOpenYet'));
      return;
    }
    
    if (hasResponded) {
      // Optionally show a message or navigate to view their response
      return;
    }
    
    router.push(`/student/forms/${formId}`);
  };

  const handleTouchStart = (formId: string, e: React.TouchEvent) => {
    setSwipeState(prev => ({
      ...prev,
      [formId]: {
        x: 0,
        startX: e.touches[0].clientX,
        swiping: true
      }
    }));
  };

  const handleTouchMove = (formId: string, e: React.TouchEvent) => {
    const state = swipeState[formId];
    if (!state?.swiping) return;

    const currentX = e.touches[0].clientX;
    const diff = state.startX - currentX;
    
    // Only allow left swipe (diff > 0) and limit to 100px
    if (diff > 0) {
      setSwipeState(prev => ({
        ...prev,
        [formId]: {
          ...state,
          x: Math.min(diff, 100)
        }
      }));
    }
  };

  const handleTouchEnd = (formId: string) => {
    const state = swipeState[formId];
    if (!state) return;

    // If swiped more than 60px, show delete button, otherwise reset
    if (state.x > 60) {
      setSwipeState(prev => ({
        ...prev,
        [formId]: {
          ...state,
          x: 80,
          swiping: false
        }
      }));
    } else {
      setSwipeState(prev => ({
        ...prev,
        [formId]: {
          x: 0,
          startX: 0,
          swiping: false
        }
      }));
    }
  };

  const handleDismissForm = (formId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Find the form to check if it's submitted
    const form = forms.find(f => f.id === formId);
    if (!form || !form.hasResponded) {
      toast.error("You can only hide forms you've already submitted");
      return;
    }
    
    const newDismissed = new Set(dismissedForms);
    newDismissed.add(formId);
    setDismissedForms(newDismissed);
    
    // Save to localStorage
    localStorage.setItem(`dismissed_forms_${studentUid}`, JSON.stringify(Array.from(newDismissed)));
    
    // Reset swipe state
    setSwipeState(prev => {
      const newState = { ...prev };
      delete newState[formId];
      return newState;
    });
    
    toast.success("Form hidden from list");
  };

  const formatDeadline = (deadline: Timestamp | Date) => {
    const date = deadline instanceof Timestamp ? deadline.toDate() : deadline;
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffDays > 7) {
      return { text: `${diffDays} days left`, urgent: false, color: 'text-emerald-600 dark:text-emerald-400' };
    } else if (diffDays > 1) {
      return { text: `${diffDays} days left`, urgent: false, color: 'text-blue-600 dark:text-blue-400' };
    } else if (diffDays === 1) {
      return { text: 'Tomorrow', urgent: false, color: 'text-orange-600 dark:text-orange-400' };
    } else if (diffHours > 3) {
      return { text: `${diffHours}h left`, urgent: true, color: 'text-orange-600 dark:text-orange-400' };
    } else if (diffHours > 0) {
      return { text: `${diffHours}h ${diffMinutes}m left`, urgent: true, color: 'text-red-600 dark:text-red-400' };
    } else {
      return { text: 'Due soon!', urgent: true, color: 'text-red-600 dark:text-red-400' };
    }
  };

  if (loading) {
    return (
      <div className="">
        {/* Loading Header - Aligned with Quick Actions */}
        <div className="flex items-center gap-4 mb-4">
          <div className="h-6 w-32 bg-slate-200 dark:bg-slate-600 rounded-lg animate-pulse" />
        </div>

        {/* Loading Cards - Aligned with Quick Actions */}
        <div className="grid grid-cols-1 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-full bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm px-4 py-3 rounded-3xl shadow-xl border border-gray-100/80 dark:border-slate-600/80 min-h-[80px] animate-pulse">
              <div className="flex items-center w-full space-x-4">
                <div className="w-16 h-16 bg-slate-200 dark:bg-slate-600 rounded-2xl flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-600 rounded-lg" />
                  <div className="h-3 w-1/2 bg-slate-200 dark:bg-slate-600 rounded" />
                  <div className="h-3 w-2/3 bg-slate-200 dark:bg-slate-600 rounded" />
                </div>
                <div className="w-6 h-6 bg-slate-200 dark:bg-slate-600 rounded flex-shrink-0" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (forms.length === 0) {
    return (
      <div className="space-y-4 mx-1">
        {/* Header for Empty State - Aligned with Quick Actions */}
        <div className="flex items-center gap-4 pt-2 mb-4">
          <div className={khmerFont('font-bold text-xl text-gray-900 dark:text-white')}>
            {bilingualText('activeForms')}
          </div>
        </div>

        {/* Empty State - Aligned with Quick Actions */}
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <svg className="w-6 h-6 text-slate-400 dark:text-slate-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
            </svg>
          </div>
          <h3 className={khmerFont('font-semibold text-base text-gray-900 dark:text-white mb-1')}>
            {bilingualText('allCaughtUp')}
          </h3>
          <p className={khmerFont('text-sm text-gray-500 dark:text-gray-400')}>
            {bilingualText('noActiveForms')}
          </p>
        </div>
      </div>
    );
  }

  // Filter out dismissed forms
  const visibleForms = forms.filter(f => !dismissedForms.has(f.id));
  const pendingCount = visibleForms.filter(f => !f.hasResponded).length;

  return (
    <div className="space-y-4 mx-1">
      {/* Header - Aligned with Quick Actions */}
      <div className="flex items-center gap-4 mb-4">
        <div className={khmerFont('font-bold text-xl text-gray-900 dark:text-white')}>
          {bilingualText('activeForms')}
        </div>
        {pendingCount > 0 && (
          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">{pendingCount}</span>
          </div>
        )}
      </div>

      {/* Forms Grid - Aligned with Quick Actions */}
      <div className="grid grid-cols-1 gap-3">
        {visibleForms.map((form, index) => {
          const deadlineInfo = formatDeadline(form.deadline);
          const isSubmitted = form.hasResponded;
          const swipeX = swipeState[form.id]?.x || 0;
          
          return (
            <div
              key={form.id}
              className="relative overflow-visible"
              style={{ 
                animationDelay: `${index * 75}ms`,
                animationFillMode: 'both'
              }}
            >
              {/* Delete Button Background - Revealed on swipe (only for submitted forms) */}
              {isSubmitted && (
                <div 
                  className="absolute right-0 top-0 bottom-0 w-20 bg-red-500 rounded-r-3xl flex items-center justify-center"
                  style={{
                    opacity: swipeX > 0 ? 1 : 0,
                    transition: 'opacity 0.2s'
                  }}
                >
                  <button
                    onClick={(e) => handleDismissForm(form.id, e)}
                    className="text-white p-3"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
                    </svg>
                  </button>
                </div>
              )}

              {/* Swipeable Card */}
              <div
                onTouchStart={(e) => isSubmitted && handleTouchStart(form.id, e)}
                onTouchMove={(e) => isSubmitted && handleTouchMove(form.id, e)}
                onTouchEnd={() => isSubmitted && handleTouchEnd(form.id)}
                onClick={(e) => {
                  if (swipeX === 0) {
                    handleFormClick(form.id, isSubmitted || false, form.isActive, e as any);
                  } else {
                    // Reset swipe if card is swiped (only applicable to submitted forms)
                    if (isSubmitted) {
                      setSwipeState(prev => ({
                        ...prev,
                        [form.id]: { x: 0, startX: 0, swiping: false }
                      }));
                    }
                  }
                }}
                className={`group relative overflow-hidden touch-manipulation ${
                  isSubmitted ? 'cursor-default' : 'cursor-pointer'
                }`}
                style={{ 
                  WebkitTapHighlightColor: 'transparent',
                  transform: isSubmitted ? `translateX(-${swipeX}px)` : 'none',
                  transition: swipeState[form.id]?.swiping ? 'none' : 'transform 0.3s ease-out'
                }}
              >
              {/* Background overlay for active state */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-3xl opacity-0 group-active:opacity-100 transition-opacity duration-150"></div>
              
              {/* Main Card Content - Aligned with Quick Actions */}
              <div className={`relative w-full bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm px-4 py-3 rounded-3xl shadow-xl border min-h-[80px] flex items-center transition-transform duration-150 ${
                !form.isActive && !isSubmitted
                  ? 'border-gray-300/80 dark:border-gray-600/80'
                  : isSubmitted 
                  ? form.requiresApproval
                    ? form.approvalStatus === 'approved'
                      ? 'border-green-200/80 dark:border-green-700/80'
                      : form.approvalStatus === 'rejected'
                        ? 'border-red-200/80 dark:border-red-700/80'
                        : 'border-orange-200/80 dark:border-orange-700/80'
                    : 'border-green-200/80 dark:border-green-700/80'
                  : 'border-gray-100/80 dark:border-slate-600/80'
              }`}>
                
                {/* Status Badge - Top Right */}
                <div className="absolute top-3 right-3 z-10">
                  {!form.isActive && !isSubmitted ? (
                    // Show "Not Open Yet" badge only for visible but inactive forms that haven't been submitted
                    <div className="flex items-center gap-1 px-2 py-1 bg-gray-400 dark:bg-gray-600 text-white text-xs font-medium rounded-full shadow-sm">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12,1L21,5V11C21,16.55 17.16,21.74 12,23C6.84,21.74 3,16.55 3,11V5L12,1M12,5A3,3 0 0,0 9,8A3,3 0 0,0 12,11A3,3 0 0,0 15,8A3,3 0 0,0 12,5M17.13,17C15.92,18.85 14.11,20.24 12,20.92C9.89,20.24 8.08,18.85 6.87,17C6.53,16.5 6.24,16 6,15.47C6,13.82 8.71,12.47 12,12.47C15.29,12.47 18,13.79 18,15.47C17.76,16 17.47,16.5 17.13,17Z"/>
                      </svg>
                      <span className={khmerFont()}>Not Open Yet</span>
                    </div>
                  ) : isSubmitted ? (
                    // Show approval status badge if form requires approval
                    form.requiresApproval ? (
                      form.approvalStatus === 'approved' ? (
                        <div className="flex items-center gap-1 px-2 py-1 bg-green-500 text-white text-xs font-medium rounded-full shadow-sm">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M10,17L6,13L7.41,11.59L10,14.17L16.59,7.58L18,9L10,17Z"/>
                          </svg>
                          <span className={khmerFont()}>{t('approved')}</span>
                        </div>
                      ) : form.approvalStatus === 'rejected' ? (
                        <div className="flex items-center gap-1 px-2 py-1 bg-red-500 text-white text-xs font-medium rounded-full shadow-sm">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12,2C17.53,2 22,6.47 22,12C22,17.53 17.53,22 12,22C6.47,22 2,17.53 2,12C2,6.47 6.47,2 12,2M15.59,7L12,10.59L8.41,7L7,8.41L10.59,12L7,15.59L8.41,17L12,13.41L15.59,17L17,15.59L13.41,12L17,8.41L15.59,7Z"/>
                          </svg>
                          <span className={khmerFont()}>{t('rejected')}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 px-2 py-1 bg-orange-500 text-white text-xs font-medium rounded-full shadow-sm">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12.5,7V13H11V7H12.5M12,15.5A1,1 0 0,1 11,16.5A1,1 0 0,1 10,15.5A1,1 0 0,1 11,14.5A1,1 0 0,1 12,15.5Z"/>
                          </svg>
                          <span className={khmerFont()}>{t('pending')}</span>
                        </div>
                      )
                    ) : (
                      // Simple Done badge for forms without approval
                      <div className="flex items-center gap-1 px-2 py-1 bg-green-500 text-white text-xs font-medium rounded-full shadow-sm">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M10,9L7,12L10,15L17,8L15.59,6.58L10,12.17L8.41,10.59L10,9Z"/>
                        </svg>
                        <span className={khmerFont()}>{t('done')}</span>
                      </div>
                    )
                  ) : deadlineInfo.urgent ? (
                    <div className="flex items-center gap-1 px-2 py-1 bg-red-500 text-white text-xs font-medium rounded-full shadow-sm animate-pulse">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12.5,7V13H11V7H12.5M12,15.5A1,1 0 0,1 11,16.5A1,1 0 0,1 10,15.5A1,1 0 0,1 11,14.5A1,1 0 0,1 12,15.5Z"/>
                      </svg>
                      <span className={khmerFont()}>{t('urgent')}</span>
                    </div>
                  ) : null}
                </div>

                <div className="flex items-center w-full space-x-4">
                  {/* Icon Section - Aligned with Quick Actions */}
                  <div className="relative flex-shrink-0">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${
                      !form.isActive && !isSubmitted
                        ? 'bg-gradient-to-br from-gray-400 to-gray-500'
                        : isSubmitted
                        ? form.requiresApproval
                          ? form.approvalStatus === 'approved'
                            ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                            : form.approvalStatus === 'rejected'
                              ? 'bg-gradient-to-br from-red-500 to-rose-600'
                              : 'bg-gradient-to-br from-orange-500 to-amber-600'
                          : 'bg-gradient-to-br from-green-500 to-emerald-600'
                        : 'bg-gradient-to-br from-blue-500 to-purple-600'
                    }`}>
                      <div className="absolute inset-0 bg-white/15 rounded-2xl backdrop-blur-sm"></div>
                      {!form.isActive && !isSubmitted
                        ? <svg className="text-white relative z-10 w-6.5 h-6.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12,1L21,5V11C21,16.55 17.16,21.74 12,23C6.84,21.74 3,16.55 3,11V5L12,1M12,5A3,3 0 0,0 9,8A3,3 0 0,0 12,11A3,3 0 0,0 15,8A3,3 0 0,0 12,5M17.13,17C15.92,18.85 14.11,20.24 12,20.92C9.89,20.24 8.08,18.85 6.87,17C6.53,16.5 6.24,16 6,15.47C6,13.82 8.71,12.47 12,12.47C15.29,12.47 18,13.79 18,15.47C17.76,16 17.47,16.5 17.13,17Z"/>
                          </svg>
                        : isSubmitted 
                        ? form.requiresApproval
                          ? form.approvalStatus === 'approved'
                            ? <svg className="text-white relative z-10 w-6.5 h-6.5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M10,17L6,13L7.41,11.59L10,14.17L16.59,7.58L18,9L10,17Z"/>
                              </svg>
                            : form.approvalStatus === 'rejected'
                              ? <svg className="text-white relative z-10 w-6.5 h-6.5" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12,2C17.53,2 22,6.47 22,12C22,17.53 17.53,22 12,22C6.47,22 2,17.53 2,12C2,6.47 6.47,2 12,2M15.59,7L12,10.59L8.41,7L7,8.41L10.59,12L7,15.59L8.41,17L12,13.41L15.59,17L17,15.59L13.41,12L17,8.41L15.59,7Z"/>
                                </svg>
                              : <svg className="text-white relative z-10 w-6.5 h-6.5" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12.5,7V13H11V7H12.5M12,15.5A1,1 0 0,1 11,16.5A1,1 0 0,1 10,15.5A1,1 0 0,1 11,14.5A1,1 0 0,1 12,15.5Z"/>
                                </svg>
                          : <svg className="text-white relative z-10 w-6.5 h-6.5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M10,9L7,12L10,15L17,8L15.59,6.58L10,12.17L8.41,10.59L10,9Z"/>
                            </svg>
                        : <svg className="text-white relative z-10 w-6.5 h-6.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                          </svg>
                      }
                    </div>
                  </div>

                  {/* Content Section - Aligned with Quick Actions */}
                  <div className="text-left flex-1 min-w-0">
                    <h3 className={khmerFont('text-base font-bold text-gray-900 dark:text-white mb-1')}>
                      {form.title}
                    </h3>
                    
                    {/* Status and Meta Info */}
                    <div className="flex items-center space-x-3">
                      {/* Deadline Status */}
                      <div className="flex items-center space-x-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          !form.isActive
                            ? 'bg-gray-400'
                            : isSubmitted 
                            ? form.requiresApproval
                              ? form.approvalStatus === 'approved'
                                ? 'bg-green-500'
                                : form.approvalStatus === 'rejected'
                                  ? 'bg-red-500'
                                  : 'bg-orange-500'
                              : 'bg-green-500'
                            : deadlineInfo.urgent 
                              ? 'bg-red-500' 
                              : 'bg-blue-500'
                        }`}></div>
                        <span className={khmerFont(`text-xs font-medium ${
                          !form.isActive
                            ? 'text-gray-500 dark:text-gray-400'
                            : isSubmitted 
                            ? form.requiresApproval
                              ? form.approvalStatus === 'approved'
                                ? 'text-green-600 dark:text-green-400'
                                : form.approvalStatus === 'rejected'
                                  ? 'text-red-600 dark:text-red-400'
                                  : 'text-orange-600 dark:text-orange-400'
                              : 'text-green-600 dark:text-green-400'
                            : deadlineInfo.urgent 
                              ? 'text-red-600 dark:text-red-400' 
                              : 'text-blue-600 dark:text-blue-400'
                        }`)}>
                          {!form.isActive
                            ? 'Not Open Yet'
                            : isSubmitted 
                            ? form.requiresApproval
                              ? form.approvalStatus === 'approved'
                                ? bilingualText('approvedStatus')
                                : form.approvalStatus === 'rejected'
                                  ? bilingualText('rejectedStatus')
                                  : bilingualText('pendingReview')
                              : bilingualText('completed')
                            : deadlineInfo.text
                          }
                        </span>
                      </div>
                      
                      {/* Questions Count */}
                      <span className={khmerFont('text-xs text-gray-500 dark:text-gray-400')}>
                        • {form.questions.length} {t('questions')}
                      </span>
                    </div>
                    
                  </div>

                  {/* Arrow - Aligned with Quick Actions */}
                  {(!isSubmitted || !form.isActive) && (
                    <div className={`flex-shrink-0 ${!form.isActive ? 'text-gray-400 dark:text-gray-500' : 'text-gray-400 dark:text-gray-500'}`}>
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z"/>
                      </svg>
                    </div>
                  )}
                </div>
              </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StudentFormsList;
