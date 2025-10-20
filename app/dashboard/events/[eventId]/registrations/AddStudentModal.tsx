"use client";

import { useState, useEffect, useMemo } from "react";
import { db } from "@/firebase-config";
import { 
  collection, 
  query, 
  where,
  getDocs, 
  addDoc,
  Timestamp,
  doc,
  getDoc
} from "firebase/firestore";
import { toast } from "sonner";
import Icon from "@/app/_components/Icon";
import { 
  mdiClose,
  mdiMagnify,
  mdiAccount,
  mdiPlus,
  mdiLoading,
  mdiCheckboxMarked,
  mdiCheckboxBlankOutline
} from "@mdi/js";

interface Student {
  id: string;
  studentId: string;
  fullName: string;
  class: string;
  shift: string;
  authUid?: string;
  phone?: string;
  photoUrl?: string;
}

interface FormResponse {
  id: string;
  studentId: string;
}

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  formId: string;
  eventDate: Date | Timestamp;
  existingRegistrations: FormResponse[];
}

// Default answers for auto-registration
const DEFAULT_ANSWERS = [
  {
    answer: "ខ្ញុំយល់ Yes, I do",
    questionId: "q_1760340029398"
  },
  {
    answer: "ខ្ញុំយល់ Yes, I do",
    questionId: "q_1760340181368rzy3zc"
  },
  {
    answer: "ខ្ញុំយល់ Yes, I do",
    questionId: "q_1760340255314eiz647"
  },
  {
    answer: "ខ្ញុំយល់ Yes, I do",
    questionId: "q_1760340636074dn3fpr"
  },
  {
    answer: "ខ្ញុំយល់ Yes, I do",
    questionId: "q_1760341048096pxp42"
  },
  {
    answer: "ខ្ញុំយល់ Yes, I do",
    questionId: "q_1760341123234guq9t"
  },
  {
    answer: "ខ្ញុំយល់ Yes, I do",
    questionId: "q_1760341241657mr6shj"
  }
];

const AddStudentModal: React.FC<AddStudentModalProps> = ({
  isOpen,
  onClose,
  eventId,
  formId,
  eventDate,
  existingRegistrations
}) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [addingStudent, setAddingStudent] = useState<string | null>(null);

  // Load students when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      setLoading(true);
      try {
        // Fetch all students
        const studentsQuery = query(collection(db, "students"));
        const studentsSnapshot = await getDocs(studentsQuery);
        const allStudents = studentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Student));

        // Filter out students who have already registered
        const registeredStudentIds = new Set(
          existingRegistrations.map(reg => reg.studentId)
        );
        const unregisteredStudents = allStudents.filter(
          student => !registeredStudentIds.has(student.id) && 
                    student.fullName && 
                    student.fullName.trim() !== ''
        );

        setStudents(unregisteredStudents);
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Failed to load students");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isOpen, existingRegistrations]);

  // Filter and sort students based on search query
  const filteredStudents = useMemo(() => {
    let result = students;
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(student => 
        (student.fullName && student.fullName.toLowerCase().includes(query)) ||
        (student.studentId && student.studentId.toLowerCase().includes(query)) ||
        (student.class && student.class.toLowerCase().includes(query))
      );
    }
    
    // Sort by name in ascending order
    result = result.sort((a, b) => {
      const nameA = a.fullName || '';
      const nameB = b.fullName || '';
      return nameA.localeCompare(nameB);
    });
    
    return result;
  }, [students, searchQuery]);

  // Handle manual registration
  const handleAddStudent = async (student: Student) => {
    if (!student.fullName || student.fullName.trim() === '') {
      toast.error("Student name is missing");
      return;
    }

    setAddingStudent(student.id);
    try {
      // Create form response with default answers
      // Note: authUid can be empty string for students without auth accounts
      await addDoc(collection(db, "form_responses"), {
        formId: formId,
        studentId: student.id,
        studentName: student.fullName,
        studentEmail: "", // Optional
        studentPhone: student.phone || "",
        class: student.class || "",
        shift: student.shift || "",
        authUid: student.authUid || "", // Use empty string if no authUid
        responses: {}, // Empty responses object
        answers: DEFAULT_ANSWERS, // Use the answers array format
        submittedAt: Timestamp.now(),
        registrationStatus: 'approved', // Auto-approve
        approvalStatus: 'approved',
        approvedAt: Timestamp.now(),
        manuallyAdded: true, // Flag to indicate manual addition
        addedBy: "admin", // Could be enhanced to track which admin added
        noAuthAccount: !student.authUid // Flag to indicate student has no auth account
      });

      toast.success(`${student.fullName} has been registered and approved`);
      
      // Remove the student from the list
      setStudents(prev => prev.filter(s => s.id !== student.id));
      
    } catch (error) {
      console.error("Error adding student:", error);
      toast.error("Failed to register student");
    } finally {
      setAddingStudent(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="pt-25 fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                <Icon path={mdiPlus} size={20} className="text-white" />
              </div>
              Add Student Manually
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Select students to register for this event
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Icon path={mdiClose} size={24} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Icon 
              path={mdiMagnify} 
              size={20} 
              className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" 
            />
            <input
              type="text"
              placeholder="Search by name, student ID, or class..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white placeholder-gray-500"
              autoFocus
            />
          </div>
          
          {/* Selection Controls and Statistics */}
          <div className="mt-3 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
            </div>
            
            <div className="flex items-center gap-3 text-sm">
            </div>
          </div>
          
          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Showing {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Students List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Icon path={mdiLoading} size={32} className="text-purple-600 animate-spin" />
              <p className="text-gray-600 dark:text-gray-400 mt-4">Loading students...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                <Icon path={mdiAccount} size={32} className="text-gray-400" />
              </div>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">No students found</p>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {searchQuery ? "Try a different search query" : "All students have already registered"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredStudents.map((student) => {
                const isAdding = addingStudent === student.id;
                const hasAuthAccount = !!student.authUid;

                return (
                  <div
                    key={student.id}
                    className="group bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all border border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-md"
                  >
                    <div className="flex items-center justify-between gap-4">
                      {/* Student Info */}
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                            {student.fullName || 'Unknown Student'}
                          </h3>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {student.class && (
                              <span className="text-sm px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
                                {student.class}
                              </span>
                            )}
                            {student.shift && (
                              <span className="text-sm px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                                {student.shift}
                              </span>
                            )}
                            {student.studentId && (
                              <span className="text-xs text-gray-600 dark:text-gray-400">
                                ID: {student.studentId}
                              </span>
                            )}
                            {/* Auth status badge */}
                            {!hasAuthAccount && (
                              <span className="text-xs px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded">
                                No Auth Account
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Add Button */}
                      <div className="flex-shrink-0">
                        <button
                          onClick={() => handleAddStudent(student)}
                          disabled={isAdding}
                          className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                            isAdding
                              ? "bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed"
                              : "bg-purple-600 hover:bg-purple-700 text-white shadow-md hover:shadow-lg transform hover:scale-105"
                          }`}
                          title={hasAuthAccount ? "Add student to event" : "Add student to event (no auth account - will be registered manually)"}
                        >
                          {isAdding ? (
                            <>
                              <Icon path={mdiLoading} size={18} className="animate-spin" />
                              Adding...
                            </>
                          ) : (
                            <>
                              <Icon path={mdiPlus} size={18} />
                              Add
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">Note:</span> All students will be automatically approved. Students without auth accounts can still be registered manually.
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddStudentModal;
