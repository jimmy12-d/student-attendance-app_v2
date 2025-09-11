"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  mdiSchoolOutline,
  mdiAccountGroup,
  mdiPencil,
  mdiCheck,
  mdiClose,
  mdiAlertCircle,
  mdiInformation
} from "@mdi/js";
import CardBox from "../../_components/CardBox";
import SectionMain from "../../_components/Section/Main";
import SectionTitleLineWithButton from "../../_components/Section/TitleLineWithButton";
import Icon from "../../_components/Icon";
import { toast } from 'sonner';

// Firebase
import { db } from "../../../firebase-config";
import { collection, doc, getDocs, updateDoc, query, where } from "firebase/firestore";

// Types
interface ShiftInfo {
  startTime: string;
  cutoffTime: string;
  maxStudents: number; // Only maxStudents field for capacity
}

interface ClassInfo {
  id: string;
  name: string; // This is the class name from Firebase
  type: string; // This is the class type from Firebase
  shifts: Record<string, ShiftInfo>;
  stats: Record<string, { current: number; max: number; waitlist: number }>;
}

type ClassWithStats = ClassInfo;

const ClassManagementPage = () => {
  const [classes, setClasses] = useState<ClassWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingClass, setEditingClass] = useState<string | null>(null);
  const [editingShift, setEditingShift] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Fetch classes and calculate statistics
  useEffect(() => {
    const fetchClassesAndStats = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch class configurations
        const classesCollection = collection(db, 'classes');
        const classesSnapshot = await getDocs(classesCollection);
        const classConfigs: ClassInfo[] = classesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as ClassInfo));

        // Fetch student statistics for each class/shift combination
        const classesWithStats = await Promise.all(
          classConfigs.map(async (classConfig) => {
            const stats: { [shift: string]: { current: number; max: number; waitlist: number } } = {};
            
            for (const [shiftName, shiftConfig] of Object.entries(classConfig.shifts)) {
              // Count active students
              const activeStudentsQuery = query(
                collection(db, "students"),
                where("class", "==", classConfig.name),
                where("shift", "==", shiftName),
                where("ay", "==", "2026")
              );
              const activeSnapshot = await getDocs(activeStudentsQuery);
              const activeStudents = activeSnapshot.docs.filter(doc => {
                const data = doc.data();
                return !data.dropped && !data.onBreak && !data.onWaitlist;
              });

              // Count waitlisted students
              const waitlistStudents = activeSnapshot.docs.filter(doc => {
                const data = doc.data();
                return !data.dropped && !data.onBreak && data.onWaitlist;
              });

              // Use shift-level maxStudents, default to 25 if not set
              const maxCapacity = shiftConfig.maxStudents || 25;

              stats[shiftName] = {
                current: activeStudents.length,
                max: maxCapacity,
                waitlist: waitlistStudents.length
              };
            }
            
            return {
              ...classConfig,
              stats
            };
          })
        );

        setClasses(classesWithStats);
        console.log('Classes loaded with stats:', classesWithStats); // Debug log
      } catch (err) {
        console.error("Error fetching class data:", err);
        setError("Failed to load class data. Please check console for details.");
      }
      setLoading(false);
    };

    fetchClassesAndStats();
  }, []);

  // Handle editing capacity
  const startEdit = (classId: string, shiftName: string, currentMax: number) => {
    setEditingClass(classId);
    setEditingShift(shiftName);
    setEditValue(currentMax.toString());
  };

  const cancelEdit = () => {
    setEditingClass(null);
    setEditingShift(null);
    setEditValue("");
  };

  const saveEdit = async () => {
    if (!editingClass || !editingShift) return;
    
    const newCapacity = parseInt(editValue);
    if (isNaN(newCapacity) || newCapacity < 1) {
      toast.error("Please enter a valid capacity number");
      return;
    }

    try {
      const classDoc = doc(db, 'classes', editingClass);
      const classToUpdate = classes.find(c => c.id === editingClass);
      
      if (classToUpdate) {
        // Update shift-specific maxStudents field
        const updatedShifts = {
          ...classToUpdate.shifts,
          [editingShift]: {
            ...classToUpdate.shifts[editingShift],
            maxStudents: newCapacity
          }
        };

        await updateDoc(classDoc, {
          shifts: updatedShifts
        });

        // Update local state
        setClasses(prev => prev.map(c => 
          c.id === editingClass 
            ? {
                ...c,
                shifts: updatedShifts,
                stats: {
                  ...c.stats,
                  [editingShift]: {
                    ...c.stats[editingShift],
                    max: newCapacity
                  }
                }
              }
            : c
        ));

        toast.success("Class capacity updated successfully");
        cancelEdit();
      }
    } catch (error) {
      console.error("Error updating capacity:", error);
      toast.error("Failed to update capacity");
    }
  };

  // Group classes by grade (7, 8, 9, 10, 11, 12) and sort within each grade
  const groupedClasses = useMemo(() => {
    const groups: { [grade: string]: ClassWithStats[] } = {};

    classes.forEach(classInfo => {
      // Extract grade from document ID (e.g., "10E" -> "10", "11A" -> "11")
      const gradeMatch = classInfo.id.match(/^(\d+)/);
      const grade = gradeMatch ? `Grade ${gradeMatch[1]}` : 'Other';

      if (!groups[grade]) {
        groups[grade] = [];
      }
      groups[grade].push(classInfo);
    });

    // Sort within each grade group alphabetically by class ID
    Object.keys(groups).forEach(grade => {
      groups[grade].sort((a, b) => a.id.localeCompare(b.id));
    });

    return groups;
  }, [classes]);

  const getCapacityStatus = (current: number, max: number) => {
    const percentage = (current / max) * 100;
    return percentage >= 100 ? 'full' : 'available';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'full': return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700';
      default: return 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700';
    }
  };

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    let totalClasses = 0;
    let totalShifts = 0;
    let totalStudents = 0;
    let totalCapacity = 0;
    let fullClasses = 0;
    let availableClasses = 0;

    Object.values(groupedClasses).forEach(classes => {
      classes.forEach(classInfo => {
        totalClasses++;
        Object.entries(classInfo.shifts).forEach(([shiftName, shiftConfig]) => {
          totalShifts++;
          const stats = classInfo.stats[shiftName];
          totalStudents += stats.current;
          totalCapacity += stats.max;
          
          const status = getCapacityStatus(stats.current, stats.max);
          if (status === 'full') {
            fullClasses++;
          } else {
            availableClasses++;
          }
        });
      });
    });

    const utilizationRate = totalCapacity > 0 ? Math.round((totalStudents / totalCapacity) * 100) : 0;

    return {
      totalClasses,
      totalShifts,
      totalStudents,
      totalCapacity,
      utilizationRate,
      fullClasses,
      availableClasses
    };
  }, [groupedClasses]);

  if (loading) {
    return (
      <SectionMain>
        <SectionTitleLineWithButton icon={mdiSchoolOutline} title="Class Management" main />
        <CardBox>
          <div className="text-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading class data...</p>
          </div>
        </CardBox>
      </SectionMain>
    );
  }

  return (
    <SectionMain>
      <SectionTitleLineWithButton icon={mdiSchoolOutline} title="Class Management" main />
      
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
            <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">Class Management Overview</h3>
            <p className="text-blue-700 dark:text-blue-400 text-sm">
              Manage class capacities and view enrollment statistics. Click the edit button next to any capacity to modify it. 
              The system will automatically prevent over-enrollment based on these limits.
            </p>
          </div>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <CardBox className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Icon path={mdiSchoolOutline} size={24} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Classes</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{summaryStats.totalClasses}</div>
            </div>
          </div>
        </CardBox>

        <CardBox className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Icon path={mdiAccountGroup} size={24} className="text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Students</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{summaryStats.totalStudents}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">of {summaryStats.totalCapacity} capacity</div>
            </div>
          </div>
        </CardBox>

        <CardBox className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className={`w-3 h-3 rounded-full ${
                summaryStats.utilizationRate >= 90 ? 'bg-red-500' :
                summaryStats.utilizationRate >= 70 ? 'bg-orange-500' : 'bg-green-500'
              }`}></div>
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Utilization</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{summaryStats.utilizationRate}%</div>
            </div>
          </div>
        </CardBox>

        <CardBox className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              </div>
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</div>
              <div className="text-sm text-gray-900 dark:text-white">
                <span className="text-green-600 dark:text-green-400 font-semibold">{summaryStats.availableClasses}</span> Available, 
                <span className="text-red-600 dark:text-red-400 font-semibold ml-1">{summaryStats.fullClasses}</span> Full
              </div>
            </div>
          </div>
        </CardBox>
      </div>

      {Object.keys(groupedClasses)
        .sort((a, b) => {
          // Sort grade groups numerically (Grade 7, Grade 8, Grade 9, etc.)
          const gradeA = parseInt(a.replace('Grade ', '')) || 0;
          const gradeB = parseInt(b.replace('Grade ', '')) || 0;
          return gradeA - gradeB;
        })
        .map(grade => (
        <CardBox key={grade} className="mb-6" hasTable>
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-700">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center">
              <Icon path={mdiAccountGroup} size={20} className="mr-2 text-blue-600 dark:text-blue-400" />
              {grade}
              <span className="ml-2 text-sm font-normal text-gray-600 dark:text-gray-300">
                ({groupedClasses[grade].length} classes, {groupedClasses[grade].reduce((total, classInfo) => total + Object.keys(classInfo.shifts).length, 0)} shifts)
              </span>
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Class
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Shift
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Enrollment
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-gray-800">
                {groupedClasses[grade].map(classInfo => 
                  Object.entries(classInfo.shifts).map(([shiftName, shiftConfig]) => {
                    const stats = classInfo.stats[shiftName];
                    const status = getCapacityStatus(stats.current, stats.max);
                    const isEditing = editingClass === classInfo.id && editingShift === shiftName;
                    const utilizationPercent = Math.round((stats.current / stats.max) * 100);
                    
                    return (
                      <tr key={`${classInfo.id}-${shiftName}`} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                              status === 'full' 
                                ? 'bg-red-100 dark:bg-red-900/30' 
                                : 'bg-green-100 dark:bg-green-900/30'
                            }`}>
                              <Icon path={mdiSchoolOutline} size={16} className={`${
                                status === 'full' 
                                  ? 'text-red-600 dark:text-red-400' 
                                  : 'text-green-600 dark:text-green-400'
                              }`} />
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                {classInfo.name}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {classInfo.type}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                            shiftName?.toLowerCase() === 'morning' 
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                              : shiftName?.toLowerCase() === 'afternoon'
                              ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300'
                              : shiftName?.toLowerCase() === 'evening'
                              ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                          }`}>
                            {shiftName}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                {stats.current}
                              </span>
                              <span className="text-sm text-gray-500 dark:text-gray-400">/</span>
                              {isEditing ? (
                                <div className="flex items-center space-x-1">
                                  <input
                                    type="number"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    className="w-14 px-2 py-1 text-xs border rounded dark:bg-slate-700 dark:border-slate-600"
                                    min="1"
                                    autoFocus
                                  />
                                  <button
                                    onClick={saveEdit}
                                    className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                                  >
                                    <Icon path={mdiCheck} size={16} />
                                  </button>
                                  <button
                                    onClick={cancelEdit}
                                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                  >
                                    <Icon path={mdiClose} size={16} />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {stats.max}
                                </span>
                              )}
                            </div>
                            {stats.waitlist > 0 && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
                                +{stats.waitlist} waitlist
                              </span>
                            )}
                          </div>
                          <div className="mt-1">
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                              <div 
                                className={`h-1.5 rounded-full ${
                                  utilizationPercent >= 100 ? 'bg-red-500' :
                                  utilizationPercent >= 90 ? 'bg-orange-500' :
                                  utilizationPercent >= 70 ? 'bg-yellow-500' : 'bg-green-500'
                                }`}
                                style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
                              ></div>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              {utilizationPercent}% utilized
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(status)}`}>
                            {status === 'full' ? 'Full' : 'Available'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {!isEditing && (
                            <button
                              onClick={() => startEdit(classInfo.id, shiftName, stats.max)}
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
                              title="Edit capacity"
                            >
                              <Icon path={mdiPencil} size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardBox>
      ))}

      {classes.length === 0 && !loading && (
        <CardBox>
          <div className="text-center p-8">
            <Icon path={mdiSchoolOutline} size={48} className="text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">No classes found</p>
            <p className="text-gray-500 dark:text-gray-500 text-sm">
              Classes will appear here once they are configured in the system.
            </p>
          </div>
        </CardBox>
      )}
    </SectionMain>
  );
};

export default ClassManagementPage;
