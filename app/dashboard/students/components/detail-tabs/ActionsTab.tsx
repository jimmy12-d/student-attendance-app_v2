import React, { useRef, useState, useEffect } from 'react';
import { Student, ClaimedStar } from '../../../../_interfaces';
import { RawAttendanceRecord } from '../../../_lib/attendanceLogic';
import { PermissionRecord } from '../../../../_interfaces';
import { AllClassConfigs } from '../../../_lib/configForAttendanceLogic';
import StarManagementSection from '../StarManagementSection';
import ClaimedStarsHistory from '../ClaimedStarsHistory';
import StarRequestManagement from '../StarRequestManagement';
import { toast } from 'sonner';
import { deleteDoc, doc, query, where, getDocs, collection } from 'firebase/firestore';
import { db } from '../../../../../firebase-config';
import Icon from '../../../../_components/Icon';
import Webcam from 'react-webcam';
import { 
  mdiCalendar, 
  mdiFaceRecognition,
  mdiRobotHappy,
} from '@mdi/js';

interface ActionsTabProps {
  student: Student;
  attendanceRecords: RawAttendanceRecord[];
  approvedPermissions: PermissionRecord[];
  allClassConfigs: AllClassConfigs;
  isLoadingAttendance: boolean;
  setShowAttendanceModal: (show: boolean) => void;
  
  // Star management
  claimedStars: ClaimedStar[];
  totalStars: number;
  onBreak?: () => void;
  
  // Face enrollment
  isFaceEnrolling: boolean;
  enrollStudentWithPhoto: (student: Student) => void;
  
  // Photo capture
  showPhotoCapture: boolean;
  setShowPhotoCapture: (show: boolean) => void;
  capturedPhoto: string | null;
  setCapturedPhoto: (photo: string | null) => void;
  isCapturingPhoto: boolean;
  capturePhotoForEnrollment: () => void;
  confirmPhotoEnrollment: () => void;
  cancelPhotoCapture: () => void;
  webcamRef: React.RefObject<Webcam>;
  availableCameras: MediaDeviceInfo[];
  selectedCameraId: string;
  setSelectedCameraId: (id: string) => void;
}

export const ActionsTab: React.FC<ActionsTabProps> = ({
  student,
  setShowAttendanceModal,
  claimedStars,
  totalStars,
  onBreak,
  isFaceEnrolling,
  enrollStudentWithPhoto,
}) => {
  const [hasParentLink, setHasParentLink] = useState(false);

  useEffect(() => {
    const checkParentLink = async () => {
      if (!student?.id) return;
      try {
        const q = query(
          collection(db, 'parentNotifications'),
          where('studentId', '==', student.id)
        );
        const querySnapshot = await getDocs(q);
        setHasParentLink(!querySnapshot.empty);
      } catch (error) {
        console.error('Error checking parent link:', error);
      }
    };
    checkParentLink();
  }, [student?.id]);

  return (
    <div className="space-y-6">
      {/* Action Buttons Section */}
      <div className="bg-white dark:bg-slate-700 rounded-xl border border-gray-200 dark:border-slate-600 overflow-hidden shadow-sm">
        <div className="px-6 py-4">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Quick Actions
          </h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* View Attendance Button */}
            <button
              onClick={() => setShowAttendanceModal(true)}
              className="group relative inline-flex items-center justify-center w-full px-5 py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-700"
            >
              <Icon path={mdiCalendar} size={20} />
              <span className="ml-3">View Attendance</span>
              <div className="absolute inset-0 rounded-xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
            
            {/* Copy Permission Link Button */}
            <button
              onClick={() => {
                const baseUrl = window.location.origin;
                const permissionUrl = `${baseUrl}/permission-request?studentId=${encodeURIComponent(student.id)}&studentName=${encodeURIComponent(student.fullName)}&studentClass=${encodeURIComponent(student.class || '')}&studentShift=${encodeURIComponent(student.shift || '')}`;
                navigator.clipboard.writeText(permissionUrl).then(() => {
                  toast.success('Permission link copied to clipboard!');
                }).catch(() => {
                  // Fallback: show the URL in a modal or alert
                  alert(`Permission URL: ${permissionUrl}`);
                });
              }}
              className="group relative inline-flex items-center justify-center w-full px-5 py-4 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white text-sm font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-purple-500/25 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className="ml-3">Copy Permission</span>
              <div className="absolute inset-0 rounded-xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>

            {/* Face Enrollment Button */}
            <button
              onClick={() => enrollStudentWithPhoto(student)}
              disabled={isFaceEnrolling}
              className={`group relative inline-flex items-center justify-center w-full px-5 py-4 text-sm font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-700 ${
                isFaceEnrolling
                  ? 'bg-gray-400 cursor-not-allowed opacity-75'
                  : student.faceDescriptor
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 focus:ring-orange-500/25'
                  : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 focus:ring-green-500/25'
              } text-white`}
            >
              {isFaceEnrolling ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span className="ml-3">Enrolling...</span>
                </>
              ) : (
                <>
                  <Icon path={mdiFaceRecognition} size={20} />
                  <span className="ml-3">
                    {student.faceDescriptor ? 'Re-enroll Face' : 'Enroll Face'}
                  </span>
                  <div className="absolute inset-0 rounded-xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </>
              )}
            </button>

            {/* Parent Telegram Registration Button */}
            <button
              onClick={() => {
                const botUsername = 'rodwell_sams_bot'; // Your actual bot username
                const token = btoa(`parent_${student.id}_${Date.now()}`); // Generate unique token
                const telegramUrl = `https://t.me/${botUsername}?start=parent_${token}`;
                
                // Create Khmer message template
                const studentName = student.nameKhmer || student.fullName;
                const khmerMessage = `សួស្តីបង,

ខាងក្រោមនេះជាលីងតភ្ជាប់ទៅ SAMS របស់សិស្សឈ្មោះ ${studentName}

សូមចុចលើលីងនេះ
${telegramUrl}

ទាំងម៉ាក់ ទាំងប៉ា អាចប្រើលីងតែមួយនេះបាន។ ប្រសិនបើបងមានសំណួរទាក់ទងនឹងការប្រើប្រាស់ បងអាចទាក់ទងមកពួកខ្ញុំបាន។`;
                
                // Copy to clipboard and show instructions
                navigator.clipboard.writeText(khmerMessage).then(() => {
                  toast.success('SAMS message copied! Share this with the parent.');
                }).catch(() => {
                  // Fallback: show the message in a modal or alert
                  alert(khmerMessage);
                });
              }}
              className={`group relative inline-flex items-center justify-center w-full px-5 py-4 text-white text-sm font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 focus:outline-none focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-700 ${
                hasParentLink
                  ? 'bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700'
                  : 'bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700'
              }`}
            >
              <Icon path={mdiRobotHappy} size={20} />
              <span className="ml-3">SAMS Link</span>
              <div className="absolute inset-0 rounded-xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
          </div>
        </div>
      </div>

      {/* Star Management and Claimed Stars in One Row */}
      <div className="bg-white dark:bg-slate-700 rounded-xl border border-gray-200 dark:border-slate-600 overflow-hidden shadow-sm">
        <div className="px-6 py-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Star Management Section */}
            <div>
              <StarManagementSection
                student={student}
                onStarUpdate={() => {
                  // Optional: refresh any data if needed
                  if (onBreak) {
                    onBreak();
                  }
                }}
              />
            </div>

            {/* Claimed Stars History */}
            <div>
              <ClaimedStarsHistory
                claimedStars={claimedStars}
                totalStars={totalStars}
                isCompact={true}
                onDelete={async (id: string) => {
                  if (!student?.id) return;
                  try {
                    await deleteDoc(doc(db, 'students', student.id, 'claimedStars', id));
                    toast.success('Claimed star deleted');
                  } catch (error) {
                    console.error('Failed to delete claimed star:', error);
                    toast.error('Failed to delete claimed star');
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Star Requests Section */}
      <div className="bg-white dark:bg-slate-700 rounded-xl border border-gray-200 dark:border-slate-600 overflow-hidden shadow-sm">
        <div className="px-6 py-4">
          <StarRequestManagement studentId={student.id} />
        </div>
      </div>
    </div>
  );
};

export default ActionsTab;
