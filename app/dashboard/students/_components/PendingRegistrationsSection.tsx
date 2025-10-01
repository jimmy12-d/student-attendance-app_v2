import React from 'react';
import { mdiAccountClock, mdiAccountCheck, mdiAccountRemove, mdiEye } from '@mdi/js';
import Icon from '../../../_components/Icon';
import { Student } from '../../../_interfaces';

interface PendingRegistrationsProps {
  pendingStudents: Student[];
  showPendingRegistrations: boolean;
  onToggleShow: () => void;
  onActivateStudent: (student: Student) => void;
  onRejectStudent: (student: Student) => void;
  onViewDetails: (student: Student, tab?: 'basic' | 'actions' | 'requests') => void;
}

const PendingRegistrationsSection: React.FC<PendingRegistrationsProps> = ({
  pendingStudents,
  showPendingRegistrations,
  onToggleShow,
  onActivateStudent,
  onRejectStudent,
  onViewDetails
}) => {
  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    let date;
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      date = new Date(timestamp);
    }
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-orange-200 dark:border-orange-800 mb-6">
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
        onClick={onToggleShow}
      >
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
            <Icon path={mdiAccountClock} size={20} className="text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Pending Registrations
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {pendingStudents.length} student{pendingStudents.length !== 1 ? 's' : ''} awaiting approval
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {pendingStudents.length > 0 && (
            <span className="bg-orange-100 text-orange-800 text-xs font-medium px-2.5 py-0.5 rounded-full dark:bg-orange-900 dark:text-orange-300">
              {pendingStudents.length}
            </span>
          )}
          <Icon 
            path={showPendingRegistrations ? "M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z" : "M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z"} 
            size={20} 
            className="text-gray-400" 
          />
        </div>
      </div>

      {showPendingRegistrations && (
        <div className="border-t border-orange-200 dark:border-orange-800">
          {pendingStudents.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-orange-50 dark:bg-orange-900/20 rounded-full flex items-center justify-center">
                <Icon path={mdiAccountClock} size={32} className="text-orange-400" />
              </div>
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No Pending Registrations
              </h4>
              <p className="text-gray-500 dark:text-gray-400">
                All registration requests have been processed.
              </p>
            </div>
          ) : (
            <div className="p-4">
              <div className="space-y-3">
                {pendingStudents.map((student) => (
                  <div 
                    key={student.id} 
                    className="bg-orange-25 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {student.fullName}
                          </h4>
                          <span className="bg-orange-100 text-orange-800 text-xs font-medium px-2 py-1 rounded dark:bg-orange-900 dark:text-orange-300">
                            Self-Registration
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <div>
                            <span className="font-medium">Phone:</span> {student.phone || 'N/A'}
                          </div>
                          <div>
                            <span className="font-medium">Grade:</span> {student.grade || 'N/A'}
                          </div>
                          <div>
                            <span className="font-medium">Status:</span> 
                            <span className="ml-1 text-orange-600 dark:text-orange-400">Awaiting Assignment</span>
                          </div>
                        </div>
                        
                        {student.registeredAt && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            Registered: {formatDate(student.registeredAt)}
                          </div>
                        )}
                        
                        {student.username && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Username: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">{student.username}</code>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => onViewDetails(student)}
                          className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Icon path={mdiEye} size={16} />
                        </button>
                        
                        <button
                          onClick={() => onActivateStudent(student)}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded transition-colors"
                          title="Activate Account"
                        >
                          <Icon path={mdiAccountCheck} size={16} className="inline mr-1" />
                          Activate
                        </button>
                        
                        <button
                          onClick={() => onRejectStudent(student)}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded transition-colors"
                          title="Reject Registration"
                        >
                          <Icon path={mdiAccountRemove} size={16} className="inline mr-1" />
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PendingRegistrationsSection;