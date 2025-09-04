import React from 'react';
import { toast } from 'sonner';
import { Student } from '../../../_interfaces';

interface QRCodeModalProps {
  student: Student | null;
  isOpen: boolean;
  onClose: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ student, isOpen, onClose }) => {
  if (!isOpen || !student || !student.registrationToken) return null;

  // Generate QR code URL using the same logic as the script
  const generateQRCodeURL = (token: string) => {
    const botUsername = 'rodwell_portal_password_bot'; // Update with your actual bot username
    const startPayload = `https://t.me/${botUsername}?start=${token}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(startPayload)}`;
  };

  const qrCodeURL = generateQRCodeURL(student.registrationToken);
  
  // Get expiry date
  const getExpiryDate = () => {
    if (!student.tokenExpiresAt) return null;
    
    let expiryDate: Date | null = null;
    if (student.tokenExpiresAt instanceof Date) {
      expiryDate = student.tokenExpiresAt;
    } else if (student.tokenExpiresAt?.toDate && typeof student.tokenExpiresAt.toDate === 'function') {
      expiryDate = student.tokenExpiresAt.toDate();
    }
    
    return expiryDate;
  };

  const expiryDate = getExpiryDate();
  const isExpired = expiryDate && expiryDate <= new Date();

  const handleCopyToken = async () => {
    try {
      await navigator.clipboard.writeText(student.registrationToken || '');
  toast.success('Registration token copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy token:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-[rgba(0,0,0,0.6)] flex items-center justify-center z-50 px-4 py-2 mt-15">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-600">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Telegram Registration QR Code
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Student Info */}
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {student.fullName}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {student.class} - {student.shift}
            </p>
            {student.phone && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Phone: {student.phone}
              </p>
            )}
          </div>

          {/* Status */}
          {isExpired ? (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-red-800 dark:text-red-300 font-medium">QR Code Expired</span>
              </div>
              <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                This QR code expired on {expiryDate?.toLocaleDateString()}. Generate a new one.
              </p>
            </div>
          ) : (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-green-800 dark:text-green-300 font-medium">QR Code Active</span>
              </div>
              {expiryDate && (
                <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                  Expires on {expiryDate.toLocaleDateString()}
                </p>
              )}
            </div>
          )}

          {/* QR Code */}
          <div className="flex justify-center">
            <div className="bg-white p-4 rounded-lg border-2 border-gray-300 dark:border-gray-600">
              <img 
                src={qrCodeURL} 
                alt="Telegram Registration QR Code"
                className="w-64 h-64"
              />
            </div>
          </div>

          {/* Token */}
          <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Registration Token:
              </span>
              <button
                onClick={handleCopyToken}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
              >
                Copy Token
              </button>
            </div>
            <code className="text-xs text-gray-800 dark:text-gray-200 font-mono break-all">
              {student.registrationToken}
            </code>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-blue-900 dark:text-blue-300">Instructions for Student:</h4>
              <button
                onClick={() => {
                  const instructions = `Portal Setup Instructions for ${student.fullName}:

1. Click on this link to create your password: https://t.me/rodwell_portal_password_bot?start=${student.registrationToken}
2. After creating password, go to: portal.rodwell.center/login
3. Download the app:
   • Android: Download the app from browser
   • iOS: Add to Home Screen from Safari
4. Login with: Your phone number + new password`;
                  navigator.clipboard.writeText(instructions);
                  toast.success('Instructions copied to clipboard!');
                }}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                aria-label="Copy instructions"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
            <ol className="text-sm text-blue-800 dark:text-blue-400 space-y-1 list-decimal list-inside">
              <li>
                Click on this link to create your password: 
                <span className="flex items-center">
                  <a href={`https://t.me/rodwell_portal_password_bot?start=${student.registrationToken}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    https://t.me/rodwell_portal_password_bot?start={student.registrationToken}
                  </a>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`https://t.me/rodwell_portal_password_bot?start=${student.registrationToken}`);
                      toast.success('Telegram link copied to clipboard!');
                    }}
                    className="ml-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    aria-label="Copy link"
                  >

                  </button>
                </span>
              </li>
              <li>After creating password, go to: portal.rodwell.center/login</li>
              <li>Download the app:
                <ul className="ml-4 mt-1 space-y-1">
                  <li>• Android: Download the app from browser</li>
                  <li>• iOS: Add to Home Screen from Safari</li>
                </ul>
              </li>
              <li>Login with: Your phone number + new password</li>
            </ol>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors duration-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* sonner Toaster is managed at app layout; using toast.success for copy feedback */}
    </div>
  );
};
