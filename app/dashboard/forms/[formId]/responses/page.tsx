"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { 
  doc, 
  getDoc, 
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
import { Form, FormResponse, ApprovalStatus } from "@/app/_interfaces/forms";
import Icon from "@/app/_components/Icon";
import { 
  mdiArrowLeft, 
  mdiDownload, 
  mdiAccountGroup,
  mdiCheckCircle,
  mdiChartBox,
  mdiClockOutline,
  mdiClose,
  mdiShieldCheck,
  mdiShieldOff,
  mdiDelete,
  mdiTrashCanOutline
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [responseToDelete, setResponseToDelete] = useState<FormResponse | null>(null);

  useEffect(() => {
    loadForm();
    loadResponses();
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

  const handleApproval = async (responseId: string, status: ApprovalStatus, note?: string) => {
    setApprovingId(responseId);
    try {
      const updateData: any = {
        approvalStatus: status,
        approvedBy: adminUid,
        approvedAt: Timestamp.now()
      };
      
      // Only include approvalNote if it has a value
      if (note && note.trim()) {
        updateData.approvalNote = note.trim();
      }
      
      await updateDoc(doc(db, "form_responses", responseId), updateData);
      toast.success(`Response ${status === 'approved' ? 'approved' : 'rejected'} successfully`);
    } catch (error) {
      console.error("Error updating approval status:", error);
      toast.error("Failed to update approval status");
    } finally {
      setApprovingId(null);
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
    if (approvalFilter === 'all') return responses;
    return responses.filter(r => (r.approvalStatus || 'pending') === approvalFilter);
  };

  const getApprovalStats = () => {
    const filtered = getFilteredResponses();
    const approved = filtered.filter(r => r.approvalStatus === 'approved').length;
    const rejected = filtered.filter(r => r.approvalStatus === 'rejected').length;
    const pending = filtered.filter(r => !r.approvalStatus || r.approvalStatus === 'pending').length;
    
    return { approved, rejected, pending, total: filtered.length };
  };

  const exportToCSV = () => {
    if (!form || responses.length === 0) {
      toast.error("No data to export");
      return;
    }

    // Create CSV header
    const headers = [
      "Student Name",
      "Student ID",
      "Class",
      "Shift",
      "Submitted At",
      ...form.questions.map(q => q.text)
    ];

    // Create CSV rows
    const rows = responses.map(response => {
      const submittedAt = response.submittedAt instanceof Timestamp 
        ? response.submittedAt.toDate().toLocaleString()
        : new Date(response.submittedAt).toLocaleString();

      const answerValues = form.questions.map(q => {
        const answer = response.answers.find(a => a.questionId === q.id);
        if (!answer) return '';
        if (Array.isArray(answer.answer)) {
          return answer.answer.join('; ');
        }
        return answer.answer;
      });

      return [
        response.studentName,
        response.studentId,
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
    const question = form?.questions.find(q => q.id === questionId);
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
      <div className="flex items-center justify-center min-h-screen nokora-font">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Responses List */}
        <div className="lg:col-span-1 space-y-3">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Responses
          </h2>
          {getFilteredResponses().length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-8 text-center">
              <Icon path={mdiAccountGroup} size={16} className="mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 dark:text-gray-400">
                {approvalFilter === 'all' ? 'No responses yet' : `No ${approvalFilter} responses`}
              </p>
            </div>
          ) : (
            getFilteredResponses().map((response) => {
              const approvalStatus = response.approvalStatus || 'pending';
              const statusColors = {
                approved: 'border-green-500 bg-green-50 dark:bg-green-900/20',
                rejected: 'border-red-500 bg-red-50 dark:bg-red-900/20',
                pending: 'border-transparent'
              };
              
              return (
              <div
                key={response.id}
                onClick={() => setSelectedResponse(response)}
                className={`bg-white dark:bg-slate-800 rounded-xl shadow-lg p-4 cursor-pointer transition-all hover:shadow-xl border-2 ${
                  selectedResponse?.id === response.id
                    ? 'border-blue-500'
                    : form.requiresApproval ? statusColors[approvalStatus] : 'border-transparent'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                        {response.studentName}
                      </h3>
                      {form.requiresApproval && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          approvalStatus === 'approved' 
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                            : approvalStatus === 'rejected'
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                              : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                        }`}>
                          {approvalStatus === 'approved' ? '✓ Approved' : approvalStatus === 'rejected' ? '✗ Rejected' : '⏳ Pending'}
                        </span>
                      )}
                    </div>
                    {response.class && (
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        {response.class} {response.shift && `• ${response.shift}`}
                        {response.classType && ` • ${response.classType}`}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Icon 
                      path={approvalStatus === 'approved' ? mdiCheckCircle : approvalStatus === 'rejected' ? mdiClose : mdiClockOutline} 
                      size={16} 
                      className={`flex-shrink-0 ${
                        approvalStatus === 'approved' 
                          ? 'text-green-600' 
                          : approvalStatus === 'rejected'
                            ? 'text-red-600'
                            : 'text-orange-600'
                      }`}
                    />
                    <button
                      onClick={(e) => handleDeleteClick(response, e)}
                      disabled={deletingId === response.id}
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors disabled:opacity-50"
                      title="Delete response"
                    >
                      <Icon path={mdiTrashCanOutline} size={18} />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                  {formatDate(response.submittedAt)}
                </p>
              </div>
            )})
          )}
        </div>

        {/* Response Details or Statistics */}
        <div className="lg:col-span-2 space-y-6">
          {selectedResponse ? (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Response from {selectedResponse.studentName}
                </h2>
                {form.requiresApproval && (
                  <div className="flex items-center gap-2">
                    {(!selectedResponse.approvalStatus || selectedResponse.approvalStatus === 'pending') && (
                      <>
                        <button
                          onClick={() => handleApproval(selectedResponse.id, 'approved')}
                          disabled={approvingId === selectedResponse.id}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-lg transition-all disabled:opacity-50"
                        >
                          <Icon path={mdiCheckCircle} size={16} />
                          <span className="font-semibold">Approve</span>
                        </button>
                        <button
                          onClick={() => handleApproval(selectedResponse.id, 'rejected')}
                          disabled={approvingId === selectedResponse.id}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-lg transition-all disabled:opacity-50"
                        >
                          <Icon path={mdiClose} size={16} />
                          <span className="font-semibold">Reject</span>
                        </button>
                      </>
                    )}
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
                  </div>
                )}
              </div>
              {form.questions.map((question, index) => {
                const answer = selectedResponse.answers.find(a => a.questionId === question.id);
                return (
                  <div
                    key={question.id}
                    className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6"
                  >
                    <div className="flex items-start space-x-3 mb-4">
                      <div className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex-shrink-0">
                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                          {index + 1}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {question.text}
                      </h3>
                    </div>
                    <div className="pl-11">
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                        <p className="text-gray-900 dark:text-white font-medium">
                          {answer ? (
                            Array.isArray(answer.answer) ? 
                              answer.answer.join(', ') : 
                              answer.answer
                          ) : (
                            <span className="text-gray-500 italic">No answer</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center space-x-2">
                <Icon path={mdiChartBox} size={16} />
                <span>Summary Statistics</span>
              </h2>
              {form.questions.map((question, index) => {
                const stats = getQuestionStats(question.id);
                return (
                  <div
                    key={question.id}
                    className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6"
                  >
                    <div className="flex items-start space-x-3 mb-4">
                      <div className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex-shrink-0">
                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                          {index + 1}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {question.text}
                      </h3>
                    </div>
                    
                    {stats && (
                      <div className="pl-11 space-y-2">
                        {question.type === 'linear_scale' ? (
                          <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4">
                            <p className="text-gray-600 dark:text-gray-400 text-sm">Average Rating:</p>
                            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                              {(stats as any).average} / {question.maxScale || 10}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">{(stats as any).total} responses</p>
                          </div>
                        ) : (
                          Object.entries(stats as { [key: string]: number }).map(([option, count]) => (
                            <div key={option} className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-gray-900 dark:text-white font-medium">
                                  {option}
                                </span>
                                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                  {count} ({((count / getFilteredResponses().length) * 100).toFixed(0)}%)
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full transition-all"
                                  style={{ width: `${(count / getFilteredResponses().length) * 100}%` }}
                                />
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                    
                    {!stats && (
                      <div className="pl-11">
                        <p className="text-gray-500 dark:text-gray-400 text-sm italic">
                          {question.type === 'short_answer' || question.type === 'paragraph' 
                            ? 'Text responses - view individual responses'
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
              {responseToDelete?.studentName} (ID: {responseToDelete?.studentId})
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
    </div>
  );
};

export default FormResponsesPage;
