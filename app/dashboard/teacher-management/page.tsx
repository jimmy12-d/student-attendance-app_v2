"use client";

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import React, { useState, useEffect } from "react";
import {
  mdiAccountTie,
  mdiPhone,
  mdiBookOpenVariant,
  mdiClockOutline,
  mdiAlertCircle,
  mdiInformation,
  mdiPencil,
  mdiDelete,
  mdiPlus,
  mdiCheck,
  mdiClose,
  mdiSchool
} from "@mdi/js";
import CardBox from "../../_components/CardBox";
import SectionMain from "../../_components/Section/Main";
import SectionTitleLineWithButton from "../../_components/Section/TitleLineWithButton";
import Icon from "../../_components/Icon";
import { toast } from 'sonner';

// Firebase
import { db } from "../../../firebase-config";
import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";

// Components
import CustomCombobox, { ComboboxOption } from "../../_components/CustomCombobox";

// Types
interface TeacherInfo {
  id: string;
  fullName: string;
  phone: string;
  subject: string[];
  classTypes: string[];
  role: string;
  lastLoginAt: any; // Firebase timestamp
  updatedAt: any; // Firebase timestamp
}

const TeacherManagementPage = () => {
  const [teachers, setTeachers] = useState<TeacherInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<TeacherInfo | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    subject: [] as string[],
    classTypes: [] as string[]
  });
  const [subjectInput, setSubjectInput] = useState('');
  const [selectedClassType, setSelectedClassType] = useState('');
  
  // Class types options for dropdown
  const [classTypeOptions, setClassTypeOptions] = useState<ComboboxOption[]>([]);
  const [classTypesData, setClassTypesData] = useState<{ [key: string]: { khmerName: string } }>({});

  // View state
  const [currentView, setCurrentView] = useState<'grade' | 'teacher'>('grade');

  // Fetch class types for dropdown
  const fetchClassTypes = async () => {
    try {
      const classTypesCollection = collection(db, 'classes');
      const classTypesSnapshot = await getDocs(classTypesCollection);
      const classTypesData = classTypesSnapshot.docs.map(doc => ({
        value: doc.id,
        label: doc.id, // Use document ID as the label
        icon: mdiSchool
      }));
      setClassTypeOptions(classTypesData);
    } catch (error) {
      console.error("Error fetching class types:", error);
    }
  };

  // Fetch teachers and class types
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch class types
        await fetchClassTypes();

        // Fetch teachers
        const teachersCollection = collection(db, 'teachers');
        const teachersSnapshot = await getDocs(teachersCollection);
        const teachersData: TeacherInfo[] = teachersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as TeacherInfo));

        setTeachers(teachersData);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load data. Please check console for details.");
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  // Fetch class types for dropdown
  useEffect(() => {
    const fetchClassTypes = async () => {
      try {
        const classTypesCollection = collection(db, 'classTypes');
        const classTypesSnapshot = await getDocs(classTypesCollection);
        const classTypesData: ComboboxOption[] = [];
        const classTypesMap: { [key: string]: { khmerName: string } } = {};
        
        classTypesSnapshot.forEach((doc) => {
          const data = doc.data();
          classTypesData.push({
            value: doc.id,
            label: data.khmerName || doc.id, // Use khmerName field or doc ID as fallback
            icon: mdiSchool
          });
          classTypesMap[doc.id] = {
            khmerName: data.khmerName || doc.id
          };
        });
        
        setClassTypeOptions(classTypesData);
        setClassTypesData(classTypesMap);
      } catch (error) {
        console.error("Error fetching class types:", error);
        // Set default options if fetch fails
        setClassTypeOptions([
          { value: 'Grade 7', label: 'Grade 7', icon: mdiSchool },
          { value: 'Grade 8', label: 'Grade 8', icon: mdiSchool },
          { value: 'Grade 9', label: 'Grade 9', icon: mdiSchool },
          { value: 'Grade 10', label: 'Grade 10', icon: mdiSchool },
          { value: 'Grade 11', label: 'Grade 11', icon: mdiSchool },
          { value: 'Grade 12', label: 'Grade 12', icon: mdiSchool }
        ]);
      }
    };

    fetchClassTypes();
  }, []);

  // CRUD Functions
  const handleCreateTeacher = async () => {
    if (!formData.fullName.trim()) {
      toast.error("Please enter a teacher name");
      return;
    }

    try {
      const teacherData = {
        ...formData,
        role: 'teacher',
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'teachers'), teacherData);
      toast.success("Teacher created successfully");
      setShowCreateModal(false);
      resetForm();
      
      // Refresh data
      const teachersCollection = collection(db, 'teachers');
      const teachersSnapshot = await getDocs(teachersCollection);
      const teachersData: TeacherInfo[] = teachersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as TeacherInfo));
      setTeachers(teachersData);
    } catch (error) {
      console.error("Error creating teacher:", error);
      toast.error("Failed to create teacher");
    }
  };

  const handleEditTeacher = async () => {
    if (!editingTeacher || !formData.fullName.trim()) {
      toast.error("Please enter a teacher name");
      return;
    }

    try {
      const teacherDoc = doc(db, 'teachers', editingTeacher.id);
      const updateData = {
        ...formData,
        updatedAt: serverTimestamp()
      };

      await updateDoc(teacherDoc, updateData);
      toast.success("Teacher updated successfully");
      setShowEditModal(false);
      setEditingTeacher(null);
      resetForm();
      
      // Refresh data
      const teachersCollection = collection(db, 'teachers');
      const teachersSnapshot = await getDocs(teachersCollection);
      const teachersData: TeacherInfo[] = teachersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as TeacherInfo));
      setTeachers(teachersData);
    } catch (error) {
      console.error("Error updating teacher:", error);
      toast.error("Failed to update teacher");
    }
  };

  const handleDeleteTeacher = async (teacherId: string) => {
    if (!confirm("Are you sure you want to delete this teacher? This action cannot be undone.")) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'teachers', teacherId));
      toast.success("Teacher deleted successfully");
      
      // Refresh data
      const teachersCollection = collection(db, 'teachers');
      const teachersSnapshot = await getDocs(teachersCollection);
      const teachersData: TeacherInfo[] = teachersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as TeacherInfo));
      setTeachers(teachersData);
    } catch (error) {
      console.error("Error deleting teacher:", error);
      toast.error("Failed to delete teacher");
    }
  };

  const openEditModal = (teacher: TeacherInfo) => {
    setEditingTeacher(teacher);
    const teacherClassTypes = Array.isArray(teacher.classTypes) 
      ? teacher.classTypes 
      : (teacher.classTypes ? [teacher.classTypes] : []);
    setFormData({
      fullName: teacher.fullName,
      phone: teacher.phone || '',
      subject: Array.isArray(teacher.subject) 
        ? teacher.subject 
        : (teacher.subject ? [teacher.subject] : []),
      classTypes: teacherClassTypes
    });
    setSelectedClassType(teacherClassTypes.length > 0 ? teacherClassTypes[0] : '');
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      fullName: '',
      phone: '',
      subject: [],
      classTypes: []
    });
    setSubjectInput('');
    setSelectedClassType('');
  };

  const addSubject = () => {
    if (subjectInput.trim() && !formData.subject.includes(subjectInput.trim())) {
      setFormData(prev => ({
        ...prev,
        subject: [...prev.subject, subjectInput.trim()]
      }));
      setSubjectInput('');
    }
  };

  const removeSubject = (subjectToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      subject: prev.subject.filter(s => s !== subjectToRemove)
    }));
  };

  const addClassType = () => {
    if (selectedClassType && !formData.classTypes.includes(selectedClassType)) {
      setFormData(prev => ({
        ...prev,
        classTypes: [...prev.classTypes, selectedClassType]
      }));
      setSelectedClassType('');
    }
  };

  const removeClassType = (classTypeToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      classTypes: prev.classTypes.filter(c => c !== classTypeToRemove)
    }));
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return 'Never';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Sort teachers by name
  const sortedTeachers = React.useMemo(() => {
    return [...teachers].sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [teachers]);

  // Group teachers by class type
  const teachersByClassType = React.useMemo(() => {
    const grouped: { [key: string]: TeacherInfo[] } = {};
    
    sortedTeachers.forEach(teacher => {
      const classTypes = Array.isArray(teacher.classTypes) 
        ? teacher.classTypes 
        : (teacher.classTypes ? [teacher.classTypes] : []);
      
      if (classTypes.length === 0) {
        // Teachers with no class types assigned
        if (!grouped['Unassigned']) {
          grouped['Unassigned'] = [];
        }
        grouped['Unassigned'].push(teacher);
      } else {
        // Add teacher to each class type they belong to
        classTypes.forEach(classType => {
          if (!grouped[classType]) {
            grouped[classType] = [];
          }
          grouped[classType].push(teacher);
        });
      }
    });
    
    return grouped;
  }, [sortedTeachers]);

  // Get all class types for display order
  const classTypeOrder = React.useMemo(() => {
    const types = Object.keys(teachersByClassType).filter(type => type !== 'Unassigned');
    types.sort();
    if (teachersByClassType['Unassigned']) {
      types.push('Unassigned');
    }
    return types;
  }, [teachersByClassType]);

  // Calculate summary statistics
  const summaryStats = React.useMemo(() => {
    const totalTeachers = teachers.length;
    const allSubjects = new Set<string>();
    teachers.forEach(teacher => {
      const subjects = Array.isArray(teacher.subject) 
        ? teacher.subject 
        : (teacher.subject ? [teacher.subject] : []);
      subjects.forEach(sub => allSubjects.add(sub));
    });
    const subjects = allSubjects.size;
    const activeTeachers = teachers.filter(teacher =>
      teacher.lastLoginAt && teacher.lastLoginAt.toDate
    ).length;

    return {
      totalTeachers,
      subjects,
      activeTeachers
    };
  }, [teachers]);

  if (loading) {
    return (
      <SectionMain>
        <SectionTitleLineWithButton icon={mdiAccountTie} title="Teacher Management" main />
        <CardBox>
          <div className="text-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading teacher data...</p>
          </div>
        </CardBox>
      </SectionMain>
    );
  }

  return (
    <SectionMain>
      <SectionTitleLineWithButton icon={mdiAccountTie} title="Teacher Management" main />
      
      <div className="mb-6 flex justify-between items-center">
        {/* View Toggle Buttons */}
        <div className="flex space-x-2">
          <button
            onClick={() => setCurrentView('grade')}
            className={`inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              currentView === 'grade'
                ? 'border-blue-600 text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-400'
                : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:bg-slate-800 dark:hover:bg-slate-700'
            }`}
          >
            <Icon path={mdiSchool} size={16} className="mr-2" />
            Grade View
          </button>
          <button
            onClick={() => setCurrentView('teacher')}
            className={`inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              currentView === 'teacher'
                ? 'border-blue-600 text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-400'
                : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:bg-slate-800 dark:hover:bg-slate-700'
            }`}
          >
            <Icon path={mdiAccountTie} size={16} className="mr-2" />
            Teacher View
          </button>
        </div>

        <button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Icon path={mdiPlus} size={16} className="mr-2" />
          Add Teacher
        </button>
      </div>

      {error && (
        <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded relative mb-6">
          <Icon path={mdiAlertCircle} size={20} className="inline mr-2" />
          {error}
        </div>
      )}

      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="flex items-start">
          <Icon path={mdiInformation} size={20} className="text-blue-600 dark:text-blue-400 mr-3 mt-1 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">Teacher Management Overview</h3>
            <p className="text-blue-700 dark:text-blue-400 text-sm">
              View and manage teacher information including contact details, subjects, and login activity.
            </p>
          </div>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <CardBox className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Icon path={mdiAccountTie} size={24} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Teachers</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{summaryStats.totalTeachers}</div>
            </div>
          </div>
        </CardBox>

        <CardBox className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Icon path={mdiBookOpenVariant} size={24} className="text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Subjects</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{summaryStats.subjects}</div>
            </div>
          </div>
        </CardBox>

        <CardBox className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Icon path={mdiClockOutline} size={24} className="text-orange-600 dark:text-orange-400" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Teachers</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{summaryStats.activeTeachers}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">have logged in</div>
            </div>
          </div>
        </CardBox>
      </div>

      {/* Grade View - Teachers Tables by Class Type */}
      {currentView === 'grade' && classTypeOrder.map(classType => {
        const teachersInClass = teachersByClassType[classType];
        return (
          <CardBox key={classType} className="mb-6" hasTable>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-700">
              <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center">
                <Icon path={mdiSchool} size={20} className="mr-2 text-blue-600 dark:text-blue-400" />
                {classType === 'Unassigned' ? 'Unassigned Teachers' : `${classType} Class`}
                <span className="ml-2 text-sm font-normal text-gray-600 dark:text-gray-300">
                  ({teachersInClass.length} teacher{teachersInClass.length !== 1 ? 's' : ''})
                </span>
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 table-fixed">
                <thead className="bg-gray-50 dark:bg-slate-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider" style={{width: '25%'}}>
                      Teacher
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider" style={{width: '16.67%'}}>
                      Subjects
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider" style={{width: '16.67%'}}>
                      All Class Types
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider" style={{width: '16.67%'}}>
                      Contact
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider" style={{width: '16.67%'}}>
                      Last Login
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider" style={{width: '8.33%'}}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-gray-800">
                  {teachersInClass.map(teacher => (
                    <tr key={`${classType}-${teacher.id}`} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3 whitespace-nowrap" style={{width: '25%'}}>
                        <div className="flex items-center">
                          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mr-3">
                            <Icon path={mdiAccountTie} size={20} className="text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900 dark:text-white">
                              {teacher.fullName}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              ID: {teacher.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap" style={{width: '16.67%'}}>
                        <div className="flex flex-wrap gap-1">
                          {(() => {
                            const subjects = Array.isArray(teacher.subject) 
                              ? teacher.subject 
                              : (teacher.subject ? [teacher.subject] : []);
                            return subjects.length > 0 ? (
                              subjects.map((subj, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                                >
                                  {subj}
                                </span>
                              ))
                            ) : (
                              <span className="text-sm text-gray-500 dark:text-gray-400">No subjects assigned</span>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap" style={{width: '16.67%'}}>
                        <div className="flex flex-wrap gap-1">
                          {(() => {
                            const classTypes = Array.isArray(teacher.classTypes) 
                              ? teacher.classTypes 
                              : (teacher.classTypes ? [teacher.classTypes] : []);
                            return classTypes.length > 0 ? (
                              classTypes.map((type, index) => (
                                <span
                                  key={index}
                                  className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                                    type === classType 
                                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' 
                                      : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                                  }`}
                                >
                                  <Icon path={mdiSchool} size={12} className="mr-1" />
                                  {classTypesData[type]?.khmerName || type}
                                </span>
                              ))
                            ) : (
                              <span className="text-sm text-gray-500 dark:text-gray-400">No classes assigned</span>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap" style={{width: '16.67%'}}>
                        <div className="flex items-center">
                          <Icon path={mdiPhone} size={16} className="text-gray-400 dark:text-gray-500 mr-2" />
                          <span className="text-sm text-gray-900 dark:text-white">
                            {teacher.phone || 'Not provided'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap" style={{width: '16.67%'}}>
                        <span className="text-sm text-gray-900 dark:text-white">
                          {formatTimestamp(teacher.lastLoginAt)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm" style={{width: '8.33%'}}>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openEditModal(teacher)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            title="Edit teacher"
                          >
                            <Icon path={mdiPencil} size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteTeacher(teacher.id)}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                            title="Delete teacher"
                          >
                            <Icon path={mdiDelete} size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBox>
        );
      })}

      {/* Teacher View - All Teachers in Single Table */}
      {currentView === 'teacher' && (
        <CardBox className="mb-6" hasTable>
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-700">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center">
              <Icon path={mdiAccountTie} size={20} className="mr-2 text-blue-600 dark:text-blue-400" />
              All Teachers
              <span className="ml-2 text-sm font-normal text-gray-600 dark:text-gray-300">
                ({sortedTeachers.length} teacher{sortedTeachers.length !== 1 ? 's' : ''})
              </span>
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 table-fixed">
              <thead className="bg-gray-50 dark:bg-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider" style={{width: '25%'}}>
                    Teacher
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider" style={{width: '16.67%'}}>
                    Subjects
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider" style={{width: '16.67%'}}>
                    Class Types
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider" style={{width: '16.67%'}}>
                    Contact
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider" style={{width: '16.67%'}}>
                    Last Login
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider" style={{width: '8.33%'}}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-gray-800">
                {sortedTeachers.map(teacher => (
                  <tr key={teacher.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3 whitespace-nowrap" style={{width: '25%'}}>
                      <div className="flex items-center">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mr-3">
                          <Icon path={mdiAccountTie} size={20} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">
                            {teacher.fullName}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            ID: {teacher.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap" style={{width: '16.67%'}}>
                      <div className="flex flex-wrap gap-1">
                        {(() => {
                          const subjects = Array.isArray(teacher.subject)
                            ? teacher.subject
                            : (teacher.subject ? [teacher.subject] : []);
                          return subjects.length > 0 ? (
                            subjects.map((subj, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                              >
                                {subj}
                              </span>
                            ))
                          ) : (
                            <span className="text-sm text-gray-500 dark:text-gray-400">No subjects assigned</span>
                          );
                        })()}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap" style={{width: '16.67%'}}>
                      <div className="flex flex-wrap gap-1">
                        {(() => {
                          const classTypes = Array.isArray(teacher.classTypes)
                            ? teacher.classTypes
                            : (teacher.classTypes ? [teacher.classTypes] : []);
                          return classTypes.length > 0 ? (
                            classTypes.map((type, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
                              >
                                <Icon path={mdiSchool} size={12} className="mr-1" />
                                {classTypesData[type]?.khmerName || type}
                              </span>
                            ))
                          ) : (
                            <span className="text-sm text-gray-500 dark:text-gray-400">No classes assigned</span>
                          );
                        })()}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap" style={{width: '16.67%'}}>
                      <div className="flex items-center">
                        <Icon path={mdiPhone} size={16} className="text-gray-400 dark:text-gray-500 mr-2" />
                        <span className="text-sm text-gray-900 dark:text-white">
                          {teacher.phone || 'Not provided'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap" style={{width: '16.67%'}}>
                      <span className="text-sm text-gray-900 dark:text-white">
                        {formatTimestamp(teacher.lastLoginAt)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm" style={{width: '8.33%'}}>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openEditModal(teacher)}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          title="Edit teacher"
                        >
                          <Icon path={mdiPencil} size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteTeacher(teacher.id)}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                          title="Delete teacher"
                        >
                          <Icon path={mdiDelete} size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBox>
      )}

      {teachers.length === 0 && !loading && (
        <CardBox>
          <div className="text-center p-8">
            <Icon path={mdiAccountTie} size={48} className="text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">No teachers found</p>
            <p className="text-gray-500 dark:text-gray-500 text-sm">
              Teachers will appear here once they are added to the system.
            </p>
          </div>
        </CardBox>
      )}
      
      {/* Create Teacher Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 flex items-center justify-center overflow-y-auto w-full z-300" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}>
          <div className="p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-xl rounded-lg bg-white dark:bg-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Add New Teacher</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <Icon path={mdiClose} size={24} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white"
                    placeholder="Enter teacher name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white"
                    placeholder="Enter phone number"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Subjects</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={subjectInput}
                      onChange={(e) => setSubjectInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addSubject()}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white"
                      placeholder="Add subject"
                    />
                    <button
                      onClick={addSubject}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.subject.map((subject, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                      >
                        {subject}
                        <button
                          onClick={() => removeSubject(subject)}
                          className="ml-1 text-green-600 hover:text-green-800 dark:text-green-400"
                        >
                          <Icon path={mdiClose} size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Class Types</label>
                  <div className="flex gap-2 mb-2">
                    <div className="flex-1">
                      <CustomCombobox
                        options={classTypeOptions}
                        selectedValue={selectedClassType}
                        onChange={setSelectedClassType}
                        placeholder="Select a class type..."
                        editable={false}
                      />
                    </div>
                    <button
                      onClick={addClassType}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      disabled={!selectedClassType}
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.classTypes.map((classType, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
                      >
                        <Icon path={mdiSchool} size={12} className="mr-1" />
                        {classTypesData[classType]?.khmerName || classType}
                        <button
                          onClick={() => removeClassType(classType)}
                          className="ml-1 text-blue-600 hover:text-blue-800 dark:text-blue-400"
                        >
                          <Icon path={mdiClose} size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTeacher}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                >
                  Create Teacher
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit Teacher Modal */}
      {showEditModal && (
        <div className="fixed inset-0 flex items-center justify-center overflow-y-auto w-full z-[120]" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}>
          <div className="p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-xl rounded-lg bg-white dark:bg-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Edit Teacher</h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <Icon path={mdiClose} size={24} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white"
                    placeholder="Enter teacher name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white"
                    placeholder="Enter phone number"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Subjects</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={subjectInput}
                      onChange={(e) => setSubjectInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addSubject()}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white"
                      placeholder="Add subject"
                    />
                    <button
                      onClick={addSubject}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.subject.map((subject, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                      >
                        {subject}
                        <button
                          onClick={() => removeSubject(subject)}
                          className="ml-1 text-green-600 hover:text-green-800 dark:text-green-400"
                        >
                          <Icon path={mdiClose} size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Class Types</label>
                  <div className="flex gap-2 mb-2">
                    <div className="flex-1">
                      <CustomCombobox
                        options={classTypeOptions}
                        selectedValue={selectedClassType}
                        onChange={(value) => {
                          setSelectedClassType(value);
                          if (showEditModal && value && !formData.classTypes.includes(value)) {
                            setFormData(prev => ({
                              ...prev,
                              classTypes: [...prev.classTypes, value]
                            }));
                          }
                        }}
                        placeholder="Select a class type"
                        editable={false}
                      />
                    </div>
                    <button
                      onClick={addClassType}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      disabled={!selectedClassType}
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.classTypes.map((classType, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
                      >
                        <Icon path={mdiSchool} size={12} className="mr-1" />
                        {classTypesData[classType]?.khmerName || classType}
                        <button
                          onClick={() => removeClassType(classType)}
                          className="ml-1 text-blue-600 hover:text-blue-800 dark:text-blue-400"
                        >
                          <Icon path={mdiClose} size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditTeacher}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                >
                  Update Teacher
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </SectionMain>
  );
};

export default TeacherManagementPage;