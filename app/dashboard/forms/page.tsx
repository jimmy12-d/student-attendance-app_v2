"use client";

// Force dynamic rendering - this page uses real-time Firebase listeners
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, query, onSnapshot, orderBy, deleteDoc, doc, Timestamp, where, getDocs, addDoc, updateDoc } from "firebase/firestore";
import { db } from "@/firebase-config";
import { Form, FormWithResponseStatus } from "@/app/_interfaces/forms";
import Icon from "@/app/_components/Icon";
import { 
  mdiPlus, 
  mdiFormSelect, 
  mdiCalendarClock, 
  mdiDelete, 
  mdiPencil, 
  mdiChartBox,
  mdiCheckCircle,
  mdiCloseCircle,
  mdiAccountMultiple,
  mdiFileDocumentEditOutline,
  mdiTrendingUp,
  mdiClockAlertOutline,
  mdiEyeOutline,
  mdiEyeOffOutline,
  mdiContentCopy,
  mdiClose,
  mdiShieldCheck
} from "@mdi/js";
import { toast } from "sonner";
import { getFormTypeConfig } from "@/app/_constants/formTypes";

const FormsListPage = () => {
  // Array of colors for form icons
  const formIconColors = [
    'bg-blue-600',
    'bg-purple-600', 
    'bg-green-600',
    'bg-orange-600',
    'bg-red-600',
    'bg-indigo-600',
    'bg-pink-600',
    'bg-teal-600'
  ];

  // Corresponding background colors for form headers
  const formHeaderBgColors = [
    'bg-blue-50 dark:bg-blue-900/20',
    'bg-purple-50 dark:bg-purple-900/20',
    'bg-green-50 dark:bg-green-900/20', 
    'bg-orange-50 dark:bg-orange-900/20',
    'bg-red-50 dark:bg-red-900/20',
    'bg-indigo-50 dark:bg-indigo-900/20',
    'bg-pink-50 dark:bg-pink-900/20',
    'bg-teal-50 dark:bg-teal-900/20'
  ];

  const router = useRouter();
  const [forms, setForms] = useState<FormWithResponseStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewForm, setPreviewForm] = useState<Form | null>(null);
  const [deleteModal, setDeleteModal] = useState<{show: boolean, form: FormWithResponseStatus | null}>({show: false, form: null});
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  useEffect(() => {
    const formsQuery = query(
      collection(db, "forms"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(formsQuery, async (snapshot) => {
      const fetchedForms = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Form));
      
      // Get response counts for each form
      const formsWithCounts = await Promise.all(
        fetchedForms.map(async (form) => {
          const responsesQuery = query(
            collection(db, "form_responses"),
            where("formId", "==", form.id)
          );
          const responsesSnap = await getDocs(responsesQuery);
          
          return {
            ...form,
            responseCount: responsesSnap.size
          };
        })
      );
      
      setForms(formsWithCounts);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching forms:", error);
      toast.error("Failed to load forms");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleCreateNew = () => {
    router.push("/dashboard/forms/new");
  };

  const handleEdit = (formId: string) => {
    router.push(`/dashboard/forms/${formId}`);
  };

  const handleViewResponses = (formId: string) => {
    router.push(`/dashboard/forms/${formId}/responses`);
  };

  const handleDelete = (form: FormWithResponseStatus) => {
    setDeleteModal({show: true, form});
  };

  const confirmDelete = async () => {
    if (!deleteModal.form) return;

    try {
      await deleteDoc(doc(db, "forms", deleteModal.form.id));
      toast.success("Form deleted successfully");
      setDeleteModal({show: false, form: null});
    } catch (error) {
      console.error("Error deleting form:", error);
      toast.error("Failed to delete form");
    }
  };

  const cancelDelete = () => {
    setDeleteModal({show: false, form: null});
  };

  const handleDuplicate = async (form: Form) => {
    try {
      const newForm = {
        ...form,
        title: `${form.title} (Copy)`,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        isActive: false, // Start as inactive
        submittedBy: [], // Reset submission tracking for the duplicate
      };
      
      // Remove the id field as it will be auto-generated
      const { id, ...formWithoutId } = newForm;
      
      await addDoc(collection(db, "forms"), formWithoutId);
      toast.success("Form duplicated successfully");
    } catch (error) {
      console.error("Error duplicating form:", error);
      toast.error("Failed to duplicate form");
    }
  };

  const handleToggleActive = async (formId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, "forms", formId), {
        isActive: !currentStatus,
        updatedAt: Timestamp.now()
      });
      toast.success(`Form ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      console.error("Error toggling form status:", error);
      toast.error("Failed to update form status");
    }
  };

  const handleToggleVisibility = async (formId: string, currentVisibility: boolean) => {
    try {
      await updateDoc(doc(db, "forms", formId), {
        isVisible: !currentVisibility,
        updatedAt: Timestamp.now()
      });
      toast.success(`Form ${!currentVisibility ? 'shown' : 'hidden'} successfully`);
    } catch (error) {
      console.error("Error toggling form visibility:", error);
      toast.error("Failed to update form visibility");
    }
  };

  const handlePreview = (form: Form) => {
    setPreviewForm(form);
  };

  const closePreview = () => {
    setPreviewForm(null);
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

  const isExpired = (deadline: Timestamp | Date) => {
    const deadlineDate = deadline instanceof Timestamp ? deadline.toDate() : deadline;
    return deadlineDate < new Date();
  };

  // Pagination logic
  const totalPages = Math.ceil(forms.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentForms = forms.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 nokora-font">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header Skeleton */}
          <div className="h-32 bg-white dark:bg-gray-800 rounded-lg shadow-sm animate-pulse" />
          
          {/* Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="relative overflow-hidden rounded-lg h-80 bg-white dark:bg-gray-800 shadow-sm">
                <div className="absolute inset-0 shimmer" />
              </div>
            ))}
          </div>
        </div>
        <style jsx>{`
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
          .shimmer::after {
            content: '';
            position: absolute;
            top: 0; right: 0; bottom: 0; left: 0;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
            animation: shimmer 2s infinite;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6 nokora-font">
      {/* Clean Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                  <Icon path={mdiFileDocumentEditOutline} size={16} className="text-white" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                  Form Management
                </h1>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base ml-15">
                Create and manage interactive forms for students
              </p>
              
              {/* Stats Pills */}
              <div className="flex flex-wrap gap-2 mt-4 ml-15">
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                  <Icon path={mdiFormSelect} size={16} className="text-gray-600 dark:text-gray-400" />
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {forms.length} Forms
                  </span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-700">
                  <Icon path={mdiCheckCircle} size={16} className="text-green-600 dark:text-green-400" />
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {forms.filter(f => f.isActive && !isExpired(f.deadline)).length} Active
                  </span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
                  <Icon path={mdiAccountMultiple} size={16} className="text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {forms.reduce((sum, f) => sum + (f.responseCount || 0), 0)} Responses
                  </span>
                </div>
              </div>
            </div>
            
            {/* Create Button */}
            <button
              onClick={handleCreateNew}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-lg shadow-sm hover:shadow-md transform hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <Icon path={mdiPlus} size={16} />
              <span className="font-bold text-sm md:text-base">Create Form</span>
            </button>
          </div>
        </div>
      </div>

      {/* Forms Grid */}
      <div className="max-w-7xl mx-auto">
        {forms.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
            <div className="w-24 h-24 mx-auto mb-6 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
              <Icon 
                path={mdiFormSelect} 
                size={16} 
                className="text-white"
              />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              No forms yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
              Create your first form to start collecting responses from students
            </p>
            <button
              onClick={handleCreateNew}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg shadow-sm hover:shadow-md transform hover:scale-105 transition-all duration-300 inline-flex items-center gap-2"
            >
              <Icon path={mdiPlus} size={16} />
              <span className="font-bold">Create Your First Form</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentForms.map((form, index) => {
              const expired = isExpired(form.deadline);
              const hasResponses = (form.responseCount || 0) > 0;
              const formTypeConfig = getFormTypeConfig(form.formType || 'general');
              
              return (
                <div
                  key={form.id}
                  className="group relative"
                >
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border border-gray-200 dark:border-gray-700 group-hover:scale-[1.02]">
                    {/* Active and Visibility Toggle Switches */}
                    <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
                      {/* Visibility Toggle */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleVisibility(form.id, form.isVisible !== false); // Default to true for old forms
                        }}
                        className={`p-2 rounded-full transition-all duration-300 shadow-sm ${
                          form.isVisible !== false
                            ? 'bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50'
                            : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                        }`}
                        title={`Click to ${form.isVisible !== false ? 'hide' : 'show'} form in student list`}
                      >
                        <Icon 
                          path={form.isVisible !== false ? mdiEyeOutline : mdiEyeOffOutline} 
                          size={16}
                          className={form.isVisible !== false ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}
                        />
                      </button>
                      
                      {/* Active Toggle */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleActive(form.id, form.isActive);
                        }}
                        className={`relative inline-flex h-7 w-14 items-center rounded-full transition-all duration-300 shadow-sm ${
                          form.isActive
                            ? 'bg-green-500'
                            : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                        title={`Click to ${form.isActive ? 'deactivate' : 'activate'} form (bypasses deadline)`}
                      >
                        <span
                          className={`flex h-5 w-5 transform rounded-full bg-white transition-transform duration-300 shadow-sm items-center justify-center ${
                            form.isActive ? 'translate-x-8' : 'translate-x-1'
                          }`}
                        >
                          <Icon 
                            path={form.isActive ? mdiCheckCircle : mdiCloseCircle} 
                            size={12}
                            className={form.isActive ? 'text-green-600' : 'text-gray-500'}
                          />
                        </span>
                      </button>
                    </div>

                    {/* Form Header */}
                    <div className={`relative p-6 pb-4 ${
                      expired 
                        ? 'bg-gray-50 dark:bg-gray-700' 
                        : `${formTypeConfig.bgColor} ${formTypeConfig.darkBgColor}`
                    }`}>
                      <div className="flex items-start gap-3 pr-20">
                        <div className={`flex-shrink-0 w-14 h-14 rounded-lg flex items-center justify-center shadow-sm ${
                          expired 
                            ? 'bg-gray-400 dark:bg-gray-600' 
                            : `${formTypeConfig.color.replace('text-', 'bg-').replace('dark:text-', 'dark:bg-').split(' ')[0]}`
                        }`}>
                          <Icon 
                            path={formTypeConfig.icon} 
                            size={16} 
                            className="text-white"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${formTypeConfig.color} ${formTypeConfig.bgColor} ${formTypeConfig.darkBgColor}`}>
                              {formTypeConfig.label}
                            </span>
                            {form.requiresApproval && (
                              <span className="text-xs font-semibold px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 flex items-center gap-1">
                                <Icon path={mdiShieldCheck} size={12} />
                                Approval
                              </span>
                            )}
                          </div>
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-2 mb-1">
                            {form.title}
                          </h3>
                          {form.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                              {form.description}
                            </p>
                          )}
                          {form.targetClassTypes && form.targetClassTypes.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {form.targetClassTypes.slice(0, 2).map((ct) => (
                                <span key={ct} className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                                  {ct}
                                </span>
                              ))}
                              {form.targetClassTypes.length > 2 && (
                                <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                                  +{form.targetClassTypes.length - 2}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Form Details */}
                    <div className="p-6 space-y-3">
                      {/* Deadline */}
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <Icon path={mdiCalendarClock} size={16} />
                          <span className="font-medium">Deadline</span>
                        </div>
                        <span className={`font-bold ${
                          expired 
                            ? 'text-red-600 dark:text-red-400' 
                            : 'text-gray-900 dark:text-white'
                        }`}>
                          {formatDate(form.deadline)}
                        </span>
                      </div>

                      {/* Questions Count */}
                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                          <Icon path={mdiFileDocumentEditOutline} size={16} />
                          <span className="text-sm font-semibold">Questions</span>
                        </div>
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                          {form.questions.length}
                        </span>
                      </div>

                      {/* Response Count */}
                      <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                          <Icon path={mdiAccountMultiple} size={16} />
                          <span className="text-sm font-semibold">Responses</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-blue-700 dark:text-blue-300">
                            {form.responseCount || 0}
                            {form.maxResponses && (
                              <span className="text-sm text-blue-600 dark:text-blue-400"> / {form.maxResponses}</span>
                            )}
                          </span>
                          {hasResponses && (
                            <Icon path={mdiTrendingUp} size={16} className="text-green-500" />
                          )}
                        </div>
                      </div>

                      {/* Expired Badge */}
                      {expired && (
                        <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg border border-red-200 dark:border-red-800">
                          <Icon path={mdiClockAlertOutline} size={16} />
                          <span className="font-bold">Expired</span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="px-6 pb-6 space-y-2">
                      {/* Primary Actions Row */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handlePreview(form)}
                          className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-300 shadow-sm hover:shadow-md transform hover:scale-105 active:scale-95"
                          title="preview"
                        >
                          <Icon path={mdiEyeOutline} size={16} />
                          <span>Preview</span>
                        </button>
                        <button
                          onClick={() => handleEdit(form.id)}
                          className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg transition-all duration-300 hover:scale-110 active:scale-95"
                          title="Edit form"
                        >
                          <Icon path={mdiPencil} size={16} />
                          <span className="text-sm font-semibold">Edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(form)}
                          className="flex items-center justify-center bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-800/40 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg transition-all duration-300 hover:scale-110 active:scale-95"
                          title="Delete form"
                        >
                          <Icon path={mdiDelete} size={16} />
                        </button>
                      </div>
                      
                      {/* Secondary Actions Row */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewResponses(form.id)}
                          className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-300 shadow-sm hover:shadow-md transform hover:scale-105 active:scale-95"
                        >
                          <Icon path={mdiChartBox} size={16} />
                          <span>Responses</span>
                        </button>
                        <button
                          onClick={() => handleDuplicate(form)}
                          className="flex items-center justify-center bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 shadow-sm hover:shadow-md transform hover:scale-105 active:scale-95"
                        >
                          <Icon path={mdiContentCopy} size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {forms.length > itemsPerPage && (
          <div className="mt-6 flex justify-center">
            <div className="flex items-center gap-4">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>

              <span className="text-sm text-gray-600 dark:text-gray-400">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewForm && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={closePreview}
        >
          <div 
            className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-blue-600 p-6 rounded-t-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-white/80 text-sm mb-2">
                    <Icon path={mdiEyeOutline} size={16} />
                    <span className="font-semibold">Form Preview</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">{previewForm.title}</h2>
                  {previewForm.description && (
                    <p className="text-blue-100">{previewForm.description}</p>
                  )}
                </div>
                <button
                  onClick={closePreview}
                  className="flex-shrink-0 ml-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <Icon path={mdiClose} size={16} className="text-white" />
                </button>
              </div>
            </div>

            {/* Modal Content - Questions Preview */}
            <div className="p-6 space-y-6">
              {/* Support both sections (new) and questions (old) format */}
              {(previewForm.sections && previewForm.sections.length > 0 ? (
                // New format with sections
                previewForm.sections.flatMap(section => section.questions)
              ) : (
                // Old format with direct questions
                previewForm.questions || []
              )).map((question, index) => (
                <div
                  key={question.id}
                  className="bg-gray-50 dark:bg-gray-700 rounded-lg p-5 border border-gray-200 dark:border-gray-600"
                >
                  <div className="flex items-start gap-3 mb-4">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-lg flex-shrink-0">
                      <span className="text-sm font-bold text-white">{index + 1}</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                        {question.text}
                        {question.required && <span className="text-red-500 ml-1">*</span>}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {question.type === 'short_answer' && 'Short answer'}
                        {question.type === 'paragraph' && 'Paragraph'}
                        {question.type === 'multiple_choice' && 'Multiple choice'}
                        {question.type === 'checkboxes' && 'Checkboxes'}
                        {question.type === 'dropdown' && 'Dropdown'}
                        {question.type === 'linear_scale' && 'Linear scale'}
                        {question.type === 'file_upload' && 'File upload'}
                        {question.type === 'score_input' && 'Score input'}
                      </p>
                    </div>
                  </div>

                  {/* Question Preview */}
                  <div className="ml-11">
                    {question.type === 'short_answer' && (
                      <div className="h-10 bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-500 rounded-lg px-3 flex items-center text-gray-400">
                        Your answer...
                      </div>
                    )}

                    {question.type === 'paragraph' && (
                      <div className="h-24 bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-500 rounded-lg p-3 text-gray-400">
                        Your answer...
                      </div>
                    )}

                    {(question.type === 'multiple_choice' || question.type === 'checkboxes') && (
                      <div className="space-y-2">
                        {question.options?.map((option) => (
                          <div
                            key={option.id}
                            className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-500 rounded-lg"
                          >
                            {question.type === 'multiple_choice' ? (
                              <div className="w-4 h-4 rounded-full border-2 border-gray-400" />
                            ) : (
                              <div className="w-4 h-4 rounded border-2 border-gray-400" />
                            )}
                            <span className="text-gray-700 dark:text-gray-300">{option.text}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {question.type === 'dropdown' && (
                      <div className="relative">
                        <select
                          disabled
                          className="w-full h-10 bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-500 rounded-lg px-3 text-gray-400 cursor-not-allowed"
                        >
                          <option>Choose...</option>
                          {question.options?.map((option) => (
                            <option key={option.id}>{option.text}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {question.type === 'linear_scale' && (
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                          <span>{question.minLabel || question.minScale || 0}</span>
                          <span>{question.maxLabel || question.maxScale || 10}</span>
                        </div>
                        <div className="flex gap-2">
                          {Array.from(
                            { length: (question.maxScale || 10) - (question.minScale || 0) + 1 },
                            (_, i) => i + (question.minScale || 0)
                          ).map((value) => (
                            <div
                              key={value}
                              className="flex-1 text-center p-2 bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-500 rounded-lg"
                            >
                              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                {value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {question.type === 'file_upload' && (
                      <div className="border-2 border-dashed border-gray-300 dark:border-slate-500 rounded-lg p-6 text-center bg-white dark:bg-slate-800">
                        <div className="text-gray-400">
                          <svg className="mx-auto h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <p className="text-sm">Click to upload file</p>
                          <p className="text-xs mt-1">Max {question.maxFiles || 1} file(s), {question.maxFileSize || 5}MB each</p>
                        </div>
                      </div>
                    )}

                    {question.type === 'score_input' && (
                      <div className="space-y-3">
                        <div className="h-10 bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-500 rounded-lg px-3 flex items-center justify-between">
                          <span className="text-gray-400">Enter score...</span>
                          <span className="text-gray-500">/ {question.maxScore || 100}</span>
                        </div>
                        <div className="h-12 bg-gray-200 dark:bg-slate-700 rounded-lg overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600 w-0"></div>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                          Draggable score input (0 - {question.maxScore || 100})
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Preview Footer */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    This is a preview. Students will see this form when they access it.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.show && deleteModal.form && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={cancelDelete}
        >
          <div 
            className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-red-600 p-6 rounded-t-lg">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                  <Icon path={mdiDelete} size={24} className="text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Delete Form</h2>
                  <p className="text-red-100 text-sm">This action cannot be undone</p>
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center">
                  <Icon path={mdiDelete} size={32} className="text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Are you sure?
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  You are about to delete <span className="font-semibold text-gray-900 dark:text-white">"{deleteModal.form.title}"</span>. 
                  This will permanently remove the form and all its responses.
                </p>
                
                {/* Form Details */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {deleteModal.form.questions?.length || 0}
                      </div>
                      <div className="text-gray-600 dark:text-gray-400">Questions</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {deleteModal.form.responseCount || 0}
                      </div>
                      <div className="text-gray-600 dark:text-gray-400">Responses</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={cancelDelete}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-3 rounded-lg font-semibold transition-all duration-300"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg font-semibold transition-all duration-300 shadow-sm hover:shadow-md transform hover:scale-105 active:scale-95"
                >
                  Delete Form
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormsListPage;
