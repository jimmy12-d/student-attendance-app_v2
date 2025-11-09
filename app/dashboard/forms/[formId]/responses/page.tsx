"use client";

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { 
  doc, 
  getDoc,
  setDoc,
  collection, 
  query, 
  where, 
  onSnapshot,
  orderBy,
  Timestamp,
  updateDoc,
  deleteDoc,
  arrayRemove
} from "firebase/firestore";
import { db } from "@/firebase-config";
import { Form, FormResponse, ApprovalStatus, Question } from "@/app/_interfaces/forms";
import Icon from "@/app/_components/Icon";
import ApprovalActionsConfig from "../../_components/ApprovalActionsConfig";
import CardBoxModal from "@/app/_components/CardBox/Modal";

interface ApprovalAction {
  type: 'updateField';
  collection: string;
  field: string;
  value: boolean | string | number;
}
import { 
  mdiArrowLeft, 
  mdiCog,
  mdiDownload, 
  mdiAccountGroup,
  mdiCheckCircle,
  mdiChartBox,
  mdiClockOutline,
  mdiClose,
  mdiDelete,
  mdiTrashCanOutline,
  mdiMagnify,
  mdiCheckboxBlankOutline,
  mdiCheckboxMarked,
  mdiFile
} from "@mdi/js";
import { toast } from "sonner";
import { useAppSelector } from "@/app/_stores/hooks";

const FormResponsesPage = () => {
  const router = useRouter();
  const params = useParams();
  const formId = params?.formId as string;
  const adminUid = useAppSelector((state) => state.main.userUid);

  const [form, setForm] = useState<Form | null>(null);
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResponse, setSelectedResponse] = useState<FormResponse | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [approvalFilter, setApprovalFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResponses, setSelectedResponses] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [responseToDelete, setResponseToDelete] = useState<FormResponse | null>(null);
  const [approvalActions, setApprovalActions] = useState<ApprovalAction[]>([]);
  const [showApprovalActionsModal, setShowApprovalActionsModal] = useState(false);

  const handleApprovalActionsChange = async (actions: ApprovalAction[]) => {
    setApprovalActions(actions);
    await saveApprovalActions(actions);
  };

  const executeApprovalActions = async (response: FormResponse) => {
    for (const action of approvalActions) {
      if (action.type === 'updateField') {
        try {
          // Use setDoc with merge: true to create document if it doesn't exist, or update if it does
          await setDoc(doc(db, action.collection, response.studentId), {
            [action.field]: action.value
          }, { merge: true });
        } catch (error) {
          console.error(`Error executing action: update ${action.collection}.${action.field} to ${action.value}`, error);
          toast.error(`Failed to execute action: update ${action.field}`);
        }
      }
    }
  };

  useEffect(() => {
    loadForm();
    loadResponses();
    loadApprovalActions();
  }, [formId]);

  const loadForm = async () => {
    try {
      const formDoc = await getDoc(doc(db, "forms", formId));
      if (!formDoc.exists()) {
        toast.error("Form not found");
        router.push("/dashboard/forms");
        return;
      }
      setForm({ ...(formDoc.data() as Form), id: formDoc.id });
    } catch (error) {
      console.error("Error loading form:", error);
      toast.error("Failed to load form");
    }
  };

  const loadResponses = () => {
    const responsesQuery = query(
      collection(db, "form_responses"),
      where("formId", "==", formId),
      orderBy("submittedAt", "desc")
    );

    const unsubscribe = onSnapshot(responsesQuery, (snapshot) => {
      const fetchedResponses = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as FormResponse));
      setResponses(fetchedResponses);
      setLoading(false);
    }, (error) => {
      console.error("Error loading responses:", error);
      toast.error("Failed to load responses");
      setLoading(false);
    });

    return unsubscribe;
  };

  const loadApprovalActions = async () => {
    try {
      const approvalActionsDoc = await getDoc(doc(db, "formApprovalActions", formId));
      if (approvalActionsDoc.exists()) {
        setApprovalActions(approvalActionsDoc.data().actions || []);
      }
    } catch (error) {
      console.error("Error loading approval actions:", error);
    }
  };

  const saveApprovalActions = async (actions: ApprovalAction[]) => {
    try {
      await setDoc(doc(db, "formApprovalActions", formId), {
        actions,
        updatedAt: Timestamp.now(),
        updatedBy: adminUid
      });
    } catch (error) {
      console.error("Error saving approval actions:", error);
      toast.error("Failed to save approval actions");
    }
  };

  const handleApproval = async (responseId: string, status: ApprovalStatus, note?: string) => {
    setApprovingId(responseId);
    try {
      const updateData: any = {
        approvalStatus: status,
        registrationStatus: status,
        approvedBy: adminUid,
        approvedAt: Timestamp.now()
      };
      
      // Only include approvalNote if it has a value
      if (note && note.trim()) {
        updateData.approvalNote = note.trim();
      }
      
      await updateDoc(doc(db, "form_responses", responseId), updateData);

      // Execute configured actions if approved
      if (status === 'approved') {
        const response = responses.find(r => r.id === responseId);
        if (response) {
          await executeApprovalActions(response);
        }
      }

      toast.success(`Response ${status === 'approved' ? 'approved' : 'rejected'} successfully`);
    } catch (error) {
      console.error("Error updating approval status:", error);
      toast.error("Failed to update approval status");
    } finally {
      setApprovingId(null);
    }
  };

  const handleBulkApproval = async (status: ApprovalStatus) => {
    const selectedIds = Array.from(selectedResponses);
    if (selectedIds.length === 0) return;

    try {
      const promises = selectedIds.map(id => 
        updateDoc(doc(db, "form_responses", id), {
          approvalStatus: status,
          approvedBy: adminUid,
          approvedAt: Timestamp.now()
        })
      );
      
      await Promise.all(promises);

      // Execute configured actions if approved
      if (status === 'approved') {
        const selectedResponsesData = responses.filter(r => selectedIds.includes(r.id));
        for (const response of selectedResponsesData) {
          await executeApprovalActions(response);
        }
      }

      toast.success(`${selectedIds.length} responses ${status === 'approved' ? 'approved' : 'rejected'} successfully`);
      setSelectedResponses(new Set());
      setShowBulkActions(false);
    } catch (error) {
      console.error("Error updating bulk approval status:", error);
      toast.error("Failed to update approval status");
    }
  };

  const handleSelectResponse = (responseId: string, checked: boolean) => {
    const newSelected = new Set(selectedResponses);
    if (checked) {
      newSelected.add(responseId);
    } else {
      newSelected.delete(responseId);
    }
    setSelectedResponses(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(getFilteredResponses().map(r => r.id));
      setSelectedResponses(allIds);
      setShowBulkActions(true);
    } else {
      setSelectedResponses(new Set());
      setShowBulkActions(false);
    }
  };

  const handleDeleteClick = (response: FormResponse, e: React.MouseEvent) => {
    e.stopPropagation();
    setResponseToDelete(response);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!responseToDelete) return;
    
    setDeletingId(responseToDelete.id);
    try {
      // Delete the response document
      await deleteDoc(doc(db, "form_responses", responseToDelete.id));
      
      // Remove student from form's submittedBy array so form reappears in their list
      try {
        await updateDoc(doc(db, "forms", formId), {
          submittedBy: arrayRemove(responseToDelete.studentUid)
        });
      } catch (updateError) {
        // Log but don't fail deletion if tracking update fails
        console.warn("Could not update form submission tracking:", updateError);
      }
      
      toast.success("Response deleted successfully");
      
      // Clear selected response if it was the deleted one
      if (selectedResponse?.id === responseToDelete.id) {
        setSelectedResponse(null);
      }
    } catch (error) {
      console.error("Error deleting response:", error);
      toast.error("Failed to delete response");
    } finally {
      setDeletingId(null);
      setShowDeleteConfirm(false);
      setResponseToDelete(null);
    }
  };

  const getFilteredResponses = () => {
    let filtered = responses;
    
    // Apply approval filter
    if (approvalFilter === 'all') {
      filtered = responses;
    } else {
      filtered = responses.filter(r => (r.approvalStatus || 'pending') === approvalFilter);
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(r => 
        r.studentName.toLowerCase().includes(query) ||
        (r.class && r.class.toLowerCase().includes(query))
      );
    }
    
    return filtered;
  };

  const getApprovalStats = () => {
    const approved = responses.filter(r => r.approvalStatus === 'approved').length;
    const rejected = responses.filter(r => r.approvalStatus === 'rejected').length;
    const pending = responses.filter(r => !r.approvalStatus || r.approvalStatus === 'pending').length;
    
    return { approved, rejected, pending, total: responses.length };
  };

  const exportToCSV = () => {
    if (!form || responses.length === 0) {
      toast.error("No data to export");
      return;
    }

    const allQuestions = getAllQuestions();

    // Create CSV header
    const headers = [
      "Student Name",
      "Class",
      "Shift",
      "Submitted At",
      ...allQuestions.map(q => q.text)
    ];

    // Create CSV rows
    const rows = responses.map(response => {
      const submittedAt = response.submittedAt instanceof Timestamp 
        ? response.submittedAt.toDate().toLocaleString()
        : new Date(response.submittedAt).toLocaleString();

      const answerValues = allQuestions.map(q => {
        const answer = response.answers.find(a => a.questionId === q.id);
        if (!answer) return '';
        if (Array.isArray(answer.answer)) {
          return answer.answer.join('; ');
        }
        return answer.answer;
      });

      return [
        response.studentName,
        response.class || '',
        response.shift || '',
        submittedAt,
        ...answerValues
      ];
    });

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${form.title}_responses_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast.success("Responses exported successfully");
  };

  const getQuestionStats = (questionId: string) => {
    const allQuestions = getAllQuestions();
    const question = allQuestions.find(q => q.id === questionId);
    if (!question) return null;

    const answers = getFilteredResponses().map(r => r.answers.find(a => a.questionId === questionId)?.answer).filter(Boolean);

    if (question.type === 'multiple_choice' || question.type === 'dropdown') {
      const counts: { [key: string]: number } = {};
      answers.forEach(answer => {
        const ans = answer as string;
        counts[ans] = (counts[ans] || 0) + 1;
      });
      return counts;
    }

    if (question.type === 'checkboxes') {
      const counts: { [key: string]: number } = {};
      answers.forEach(answer => {
        // Ensure answer is an array before iterating
        if (Array.isArray(answer)) {
          answer.forEach(opt => {
            counts[opt] = (counts[opt] || 0) + 1;
          });
        }
      });
      return counts;
    }

    if (question.type === 'linear_scale') {
      const values = answers.map(a => parseInt(a as string));
      const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
      return { average: avg.toFixed(1), total: values.length };
    }

    return null;
  };

  // Helper function to get all questions from form (supports both old and new format)
  const getAllQuestions = (): Question[] => {
    if (!form) return [];
    
    // New format: questions in sections
    if (form.sections && form.sections.length > 0) {
      return form.sections.flatMap(section => section.questions || []);
    }
    
    // Legacy format: direct questions array
    return form.questions || [];
  };

  const formatDate = (timestamp: Timestamp | Date) => {
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-800 p-6 nokora-font">
        {/* Header Skeleton */}
        <div className="max-w-7xl mx-auto mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="h-10 w-32 bg-gray-200 dark:bg-slate-700 rounded-lg animate-pulse"></div>
            <div className="h-10 w-32 bg-gray-200 dark:bg-slate-700 rounded-lg animate-pulse"></div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6">
            <div className="h-8 w-3/4 bg-gray-200 dark:bg-slate-700 rounded-lg animate-pulse mb-4"></div>
            <div className="h-4 w-1/2 bg-gray-200 dark:bg-slate-700 rounded-lg animate-pulse mb-6"></div>
            <div className="flex gap-4">
              <div className="h-8 w-24 bg-gray-200 dark:bg-slate-700 rounded-full animate-pulse"></div>
              <div className="h-8 w-20 bg-gray-200 dark:bg-slate-700 rounded-full animate-pulse"></div>
              <div className="h-8 w-20 bg-gray-200 dark:bg-slate-700 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Responses List Skeleton */}
          <div className="lg:col-span-1 space-y-4">
            <div className="h-6 w-24 bg-gray-200 dark:bg-slate-700 rounded-lg animate-pulse mb-4"></div>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-4 h-4 bg-gray-200 dark:bg-slate-700 rounded animate-pulse"></div>
                  <div className="flex-1">
                    <div className="h-5 w-3/4 bg-gray-200 dark:bg-slate-700 rounded-lg animate-pulse mb-2"></div>
                    <div className="h-4 w-1/2 bg-gray-200 dark:bg-slate-700 rounded-lg animate-pulse"></div>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-8 h-8 bg-gray-200 dark:bg-slate-700 rounded-lg animate-pulse"></div>
                    <div className="w-8 h-8 bg-gray-200 dark:bg-slate-700 rounded-lg animate-pulse"></div>
                  </div>
                </div>
                <div className="h-4 w-1/3 bg-gray-200 dark:bg-slate-700 rounded-lg animate-pulse"></div>
              </div>
            ))}
          </div>

          {/* Statistics Skeleton */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6">
              <div className="h-8 w-48 bg-gray-200 dark:bg-slate-700 rounded-lg animate-pulse mb-6"></div>
              <div className="grid grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-gray-50 dark:bg-slate-700 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 dark:bg-slate-600 rounded-lg animate-pulse"></div>
                      <div>
                        <div className="h-6 w-12 bg-gray-200 dark:bg-slate-600 rounded-lg animate-pulse mb-1"></div>
                        <div className="h-4 w-16 bg-gray-200 dark:bg-slate-600 rounded-lg animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!form) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-800 p-6 nokora-font">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => router.push("/dashboard/forms")}
            className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <Icon path={mdiArrowLeft} size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
          <button
            onClick={exportToCSV}
            disabled={responses.length === 0}
            className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icon path={mdiDownload} size={16} />
            <span className="font-semibold">Export CSV</span>
          </button>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {form.title}
          </h1>
          {form.description && (
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {form.description}
            </p>
          )}

          {form.requiresApproval && (
            <div className="mb-6">
              <button
                onClick={() => setShowApprovalActionsModal(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg transition-all duration-200 group"
              >
                <Icon path={mdiCog} size={16} className="mr-2 group-hover:rotate-12 transition-transform duration-200" />
                <span className="font-medium">Configure Approval Actions</span>
                {approvalActions.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 text-xs rounded-full">
                    {approvalActions.length}
                  </span>
                )}
              </button>
            </div>
          )}

          {/* Search and Filters */}
          <div className="mb-6 space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Icon path={mdiMagnify} size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by student name, ID, or class..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Statistics and Filters */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center flex-wrap gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <Icon path={mdiAccountGroup} size={16} className="text-gray-500" />
                  <span className="text-gray-600 dark:text-gray-400">
                    <span className="font-bold text-gray-900 dark:text-white">{getFilteredResponses().length}</span> responses
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Icon path={mdiClockOutline} size={16} className="text-gray-500" />
                  <span className="text-gray-600 dark:text-gray-400">
                    Deadline: {formatDate(form.deadline)}
                  </span>
                </div>
                {form.requiresApproval && (
                  <>
                    <button
                      onClick={() => setApprovalFilter(approvalFilter === 'approved' ? 'all' : 'approved')}
                      className={`flex items-center space-x-2 px-3 py-1 rounded-full transition-all duration-300 hover:scale-110 active:scale-95 ${
                        approvalFilter === 'approved'
                          ? 'bg-green-500 text-white shadow-lg'
                          : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800/40'
                      }`}
                    >
                      <Icon path={mdiCheckCircle} size={16} />
                      <span className="font-semibold">
                        {getApprovalStats().approved} Approved
                      </span>
                    </button>
                    <button
                      onClick={() => setApprovalFilter(approvalFilter === 'pending' ? 'all' : 'pending')}
                      className={`flex items-center space-x-2 px-3 py-1 rounded-full transition-all duration-300 hover:scale-110 active:scale-95 ${
                        approvalFilter === 'pending'
                          ? 'bg-orange-500 text-white shadow-lg'
                          : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-800/40'
                      }`}
                    >
                      <Icon path={mdiClockOutline} size={16} />
                      <span className="font-semibold">
                        {getApprovalStats().pending} Pending
                      </span>
                    </button>
                    <button
                      onClick={() => setApprovalFilter(approvalFilter === 'rejected' ? 'all' : 'rejected')}
                      className={`flex items-center space-x-2 px-3 py-1 rounded-full transition-all duration-300 hover:scale-110 active:scale-95 ${
                        approvalFilter === 'rejected'
                          ? 'bg-red-500 text-white shadow-lg'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800/40'
                      }`}
                    >
                      <Icon path={mdiClose} size={16} />
                      <span className="font-semibold">
                        {getApprovalStats().rejected} Rejected
                      </span>
                    </button>
                  </>
                )}
              </div>

              {/* Bulk Actions */}
              {showBulkActions && form.requiresApproval && (
                <div className="w-full sm:w-auto">
                  <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-3 rounded-xl border border-blue-200 dark:border-blue-800 sm:inline-block">
                    <div className="flex flex-col sm:flex-row items-center justify-between sm:justify-center gap-3">
                      <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                        {selectedResponses.size} selected
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleBulkApproval('approved')}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
                        >
                          <Icon path={mdiCheckCircle} size={14} />
                          Approve All
                        </button>
                        <button
                          onClick={() => handleBulkApproval('rejected')}
                          className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
                        >
                          <Icon path={mdiClose} size={14} />
                          Reject All
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Responses List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Responses
            </h2>
            {getFilteredResponses().length > 0 && (
              <button
                onClick={() => handleSelectAll(selectedResponses.size !== getFilteredResponses().length)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
              >
                <Icon 
                  path={selectedResponses.size === getFilteredResponses().length && getFilteredResponses().length > 0 ? mdiCheckboxMarked : mdiCheckboxBlankOutline} 
                  size={16} 
                />
                {selectedResponses.size === getFilteredResponses().length && getFilteredResponses().length > 0 ? 'Deselect All' : 'Select All'}
              </button>
            )}
          </div>
          
          {getFilteredResponses().length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon path={mdiAccountGroup} size={24} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {searchQuery ? 'No matching responses' : approvalFilter === 'all' ? 'No responses yet' : `No ${approvalFilter} responses`}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {searchQuery 
                  ? 'Try adjusting your search terms or filters' 
                  : approvalFilter === 'all' 
                    ? 'Responses will appear here once students submit the form' 
                    : `No responses match the ${approvalFilter} filter`
                }
              </p>
            </div>
          ) : (
            getFilteredResponses().map((response) => {
              const approvalStatus = response.approvalStatus || 'pending';
              const statusColors = {
                approved: 'border-green-500 bg-green-50/50 dark:bg-green-900/10',
                rejected: 'border-red-500 bg-red-50/50 dark:bg-red-900/10',
                pending: 'border-transparent bg-gray-50/30 dark:bg-slate-700/30'
              };
              const isSelected = selectedResponses.has(response.id);
              
              return (
              <div
                key={response.id}
                className={`bg-white dark:bg-slate-800 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer border-2 relative ${
                  selectedResponse?.id === response.id
                    ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800'
                    : isSelected
                      ? 'border-blue-300 bg-blue-50/30 dark:bg-blue-900/10'
                      : form.requiresApproval ? statusColors[approvalStatus] : 'border-transparent hover:border-gray-200 dark:hover:border-slate-600'
                }`}
              >
                {/* Status Badge - Top Right */}
                {form.requiresApproval && (
                  <div className="absolute top-3 right-3 z-10">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1 ${
                      approvalStatus === 'approved' 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        : approvalStatus === 'rejected'
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                          : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                    }`}>
                      <Icon 
                        path={approvalStatus === 'approved' ? mdiCheckCircle : approvalStatus === 'rejected' ? mdiClose : mdiClockOutline} 
                        size={12} 
                      />
                      {approvalStatus === 'approved' ? 'Approved' : approvalStatus === 'rejected' ? 'Rejected' : 'Pending'}
                    </span>
                  </div>
                )}

                {/* Card Header with Checkbox and Actions */}
                <div className="p-4 sm:p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {form.requiresApproval && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleSelectResponse(response.id, e.target.checked);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                      )}
                      <div className="flex-1 min-w-0" onClick={() => setSelectedResponse(response)}>
                        <div className="flex flex-col gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white truncate text-lg">
                            {response.studentName}
                          </h3>
                        </div>
                        <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                          {response.class && (
                            <p><span className="font-medium">{response.class}</span> {response.shift && `• ${response.shift}`}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Submission Time and View Details */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-slate-700">
                    <p className="text-xs text-gray-500 dark:text-gray-500 flex items-center gap-1">
                      <Icon path={mdiClockOutline} size={12} />
                      Submitted {formatDate(response.submittedAt)}
                    </p>
                    <button
                      onClick={() => setSelectedResponse(response)}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors sm:hidden"
                    >
                      View Details →
                    </button>
                  </div>
                </div>
              </div>
            )})
          )}
        </div>

        {/* Response Details or Statistics */}
        <div className="lg:col-span-2 space-y-6">
          {selectedResponse ? (
            <>
              {/* Response Header */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-4 sm:p-6">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-6">
                  <div className="flex-1">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      Response from {selectedResponse.studentName}
                    </h2>
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm text-gray-600 dark:text-gray-400">
                      {selectedResponse.class && (
                        <span>{selectedResponse.class} {selectedResponse.shift && `• ${selectedResponse.shift}`}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Icon path={mdiClockOutline} size={14} />
                        Submitted {formatDate(selectedResponse.submittedAt)}
                      </span>
                    </div>
                  </div>
                  
                  {/* Status and Actions */}
                  {form.requiresApproval && (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 lg:ml-4">
                      {selectedResponse.approvalStatus === 'approved' && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-xl">
                          <Icon path={mdiCheckCircle} size={16} />
                          <span className="font-semibold">Approved</span>
                        </div>
                      )}
                      {selectedResponse.approvalStatus === 'rejected' && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-xl">
                          <Icon path={mdiClose} size={16} />
                          <span className="font-semibold">Rejected</span>
                        </div>
                      )}
                      {(!selectedResponse.approvalStatus || selectedResponse.approvalStatus === 'pending') && (
                        <div className="flex flex-col sm:flex-row gap-2">
                          <button
                            onClick={() => handleApproval(selectedResponse.id, 'approved')}
                            disabled={approvingId === selectedResponse.id}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-lg transition-all disabled:opacity-50 hover:scale-105"
                          >
                            <Icon path={mdiCheckCircle} size={16} />
                            <span className="font-semibold">Approve</span>
                          </button>
                          <button
                            onClick={() => handleApproval(selectedResponse.id, 'rejected')}
                            disabled={approvingId === selectedResponse.id}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-lg transition-all disabled:opacity-50 hover:scale-105"
                          >
                            <Icon path={mdiClose} size={16} />
                            <span className="font-semibold">Reject</span>
                          </button>
                          <button
                            onClick={(e) => handleDeleteClick(selectedResponse, e)}
                            disabled={deletingId === selectedResponse.id}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-xl shadow-lg transition-all disabled:opacity-50 hover:scale-105"
                          >
                            <Icon path={mdiTrashCanOutline} size={16} />
                            <span className="font-semibold">Delete</span>
                          </button>
                        </div>
                      )}
                      {(selectedResponse.approvalStatus === 'approved' || selectedResponse.approvalStatus === 'rejected') && (
                        <button
                          onClick={(e) => handleDeleteClick(selectedResponse, e)}
                          disabled={deletingId === selectedResponse.id}
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-xl shadow-lg transition-all disabled:opacity-50 hover:scale-105"
                        >
                          <Icon path={mdiTrashCanOutline} size={16} />
                          <span className="font-semibold">Delete</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Response Answers */}
              <div className="space-y-4 sm:space-y-6">
                {getAllQuestions().map((question, index) => {
                  const answer = selectedResponse.answers.find(a => a.questionId === question.id);
                  return (
                    <div
                      key={question.id}
                      className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-4 sm:p-6 hover:shadow-xl transition-shadow"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 mb-4">
                        <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex-shrink-0">
                          <span className="text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400">
                            {index + 1}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            {question.text}
                          </h3>
                          {question.type === 'short_answer' || question.type === 'paragraph' ? (
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 sm:p-4 border-l-4 border-blue-500">
                              <p className="text-gray-900 dark:text-white font-medium leading-relaxed text-sm sm:text-base">
                                {answer ? (Array.isArray(answer.answer) ? answer.answer.join(', ') : answer.answer) : (
                                  <span className="text-gray-500 italic">No answer provided</span>
                                )}
                              </p>
                            </div>
                          ) : question.type === 'file_upload' ? (
                            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 sm:p-4 border-l-4 border-green-500">
                              {answer?.fileUrls && answer.fileUrls.length > 0 ? (
                                <div className="space-y-2">
                                  {answer.fileUrls.map((url, idx) => (
                                    <a
                                      key={idx}
                                      href={url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-3 p-2 bg-white dark:bg-slate-800 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors group"
                                    >
                                      <Icon path={mdiFile} size={20} className="text-blue-600 dark:text-blue-400" />
                                      <span className="flex-1 text-sm text-gray-900 dark:text-white font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                        {answer.fileNames?.[idx] || `File ${idx + 1}`}
                                      </span>
                                      <Icon path={mdiDownload} size={16} className="text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                                    </a>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-gray-500 italic text-sm sm:text-base">No files uploaded</p>
                              )}
                            </div>
                          ) : (
                            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-3 sm:p-4">
                              <div className="flex items-center gap-2">
                                <Icon path={mdiCheckCircle} size={16} className="text-green-600" />
                                <p className="text-gray-900 dark:text-white font-medium text-sm sm:text-base">
                                  {answer ? (
                                    Array.isArray(answer.answer) ? 
                                      answer.answer.join(', ') : 
                                      answer.answer
                                  ) : (
                                    <span className="text-gray-500 italic">No answer provided</span>
                                  )}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              {/* Statistics Overview */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                    <Icon path={mdiChartBox} size={20} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <span>Response Statistics</span>
                </h2>
                
                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                        <Icon path={mdiAccountGroup} size={20} className="text-white" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{getFilteredResponses().length}</p>
                        <p className="text-sm text-blue-600 dark:text-blue-400">Total Responses</p>
                      </div>
                    </div>
                  </div>
                  
                  {form.requiresApproval && (
                    <>
                      <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                            <Icon path={mdiCheckCircle} size={20} className="text-white" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-green-700 dark:text-green-300">{getApprovalStats().approved}</p>
                            <p className="text-sm text-green-600 dark:text-green-400">Approved</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl p-4 border border-orange-200 dark:border-orange-800">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                            <Icon path={mdiClockOutline} size={20} className="text-white" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">{getApprovalStats().pending}</p>
                            <p className="text-sm text-orange-600 dark:text-orange-400">Pending</p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Question Statistics */}
              {getAllQuestions().map((question, index) => {
                const stats = getQuestionStats(question.id);
                return (
                  <div
                    key={question.id}
                    className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6"
                  >
                    <div className="flex items-start space-x-4 mb-6">
                      <div className="flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex-shrink-0">
                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                          {index + 1}
                        </span>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                          {question.text}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {question.type === 'multiple_choice' ? 'Multiple Choice' : 
                           question.type === 'dropdown' ? 'Dropdown' : 
                           question.type === 'checkboxes' ? 'Checkboxes' : 
                           question.type === 'linear_scale' ? 'Rating Scale' : 
                           question.type === 'short_answer' ? 'Short Answer' : 'Paragraph'}
                        </p>
                      </div>
                    </div>
                    
                    {stats && (
                      <div className="space-y-3">
                        {question.type === 'linear_scale' ? (
                          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-gray-700 dark:text-gray-300 font-medium">Average Rating</p>
                              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                                {(stats as any).average} / {question.maxScale || 10}
                              </p>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-3">
                              <div
                                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-3 rounded-full transition-all"
                                style={{ width: `${((stats as any).average / (question.maxScale || 10)) * 100}%` }}
                              />
                            </div>
                            <p className="text-xs text-gray-500 mt-2">{(stats as any).total} responses</p>
                          </div>
                        ) : (
                          Object.entries(stats as { [key: string]: number }).map(([option, count]) => {
                            const percentage = ((count / getFilteredResponses().length) * 100);
                            return (
                              <div key={option} className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4 hover:bg-gray-100 dark:hover:bg-slate-700/70 transition-colors">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm text-gray-900 dark:text-white font-medium">
                                    {option}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                      {count}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      ({percentage.toFixed(0)}%)
                                    </span>
                                  </div>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-2">
                                  <div
                                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                    
                    {!stats && (
                      <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-6 text-center">
                        <Icon path={mdiChartBox} size={24} className="mx-auto mb-2 text-gray-400" />
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                          {question.type === 'short_answer' || question.type === 'paragraph' 
                            ? 'Text responses - view individual responses for details'
                            : 'No statistics available'}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <Icon path={mdiDelete} size={24} className="text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Delete Response
              </h3>
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              Are you sure you want to delete the response from:
            </p>
            <p className="font-semibold text-gray-900 dark:text-white mb-4">
              Are you sure you want to delete the response from <strong>{responseToDelete?.studentName}</strong>?
            </p>
            <p className="text-sm text-red-600 dark:text-red-400 mb-6">
              This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setResponseToDelete(null);
                }}
                className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deletingId !== null}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingId ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approval Actions Modal */}
      <CardBoxModal
        title="Approval Actions Configuration"
        isActive={showApprovalActionsModal}
        onCancel={() => setShowApprovalActionsModal(false)}
        modalClassName="w-11/12 md:w-4/5 lg:w-3/5 xl:w-2/5"
      >
        <ApprovalActionsConfig
          actions={approvalActions}
          onActionsChange={handleApprovalActionsChange}
        />
      </CardBoxModal>
    </div>
  );
};

export default FormResponsesPage;
