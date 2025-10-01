import React, { useState } from 'react';
import { mdiClose, mdiCheck } from '@mdi/js';
import Icon from '../../../_components/Icon';
import { useClassData } from '../hooks/useClassData';

const StudentActivationModal = ({
  student,
  isOpen,
  onClose,
  onActivate
}) => {
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedShift, setSelectedShift] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { allClassData, classOptions, allShiftOptions, loadingClasses } = useClassData();

  // Get available shifts for selected class
  const availableShifts = React.useMemo(() => {
    if (!selectedClass || !allClassData || loadingClasses) {
      return allShiftOptions || [];
    }

    const classData = allClassData[selectedClass];
    if (classData && classData.shifts) {
      const classShifts = Object.keys(classData.shifts);
      return (allShiftOptions || []).filter((shift) => classShifts.includes(shift.value));
    }

    return allShiftOptions || [];
  }, [selectedClass, allClassData, loadingClasses, allShiftOptions]);

  // Auto-select shift if only one available
  React.useEffect(() => {
    if (availableShifts && availableShifts.length === 1) {
      setSelectedShift(availableShifts[0].value);
    } else if (availableShifts && availableShifts.length > 1) {
      setSelectedShift('');
    }
  }, [availableShifts]);

  const handleActivate = async () => {
    if (!student || !selectedClass || !selectedShift) return;
    
    setLoading(true);
    try {
      await onActivate(student, selectedClass, selectedShift);
      onClose();
      setSelectedClass('');
      setSelectedShift('');
    } catch (error) {
      console.error('Activation error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !student) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-600">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Activate Student Account
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <Icon path={mdiClose} size={24} />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Student Information</h4>
              <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <div><span className="font-medium">Name:</span> {student.fullName}</div>
                <div><span className="font-medium">Grade:</span> {student.grade || 'N/A'}</div>
                <div><span className="font-medium">Phone:</span> {student.phone || 'N/A'}</div>
                {student.scheduleType && (
                  <div><span className="font-medium">Schedule Preference:</span> {student.scheduleType}</div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Assign Class *
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                disabled={loadingClasses}
              >
                <option value="">Select a class</option>
                {(classOptions || []).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Assign Shift *
              </label>
              <select
                value={selectedShift}
                onChange={(e) => setSelectedShift(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                disabled={!selectedClass || availableShifts.length <= 1}
              >
                <option value="">Select a shift</option>
                {(availableShifts || []).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {availableShifts.length <= 1 && selectedClass && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {availableShifts.length === 1 ? 'Shift auto-selected' : 'No shifts available for this class'}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-slate-600">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleActivate}
            disabled={!selectedClass || !selectedShift || loading}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center space-x-2"
          >
            <Icon path={mdiCheck} size={16} />
            <span>{loading ? 'Activating...' : 'Activate Student'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentActivationModal;