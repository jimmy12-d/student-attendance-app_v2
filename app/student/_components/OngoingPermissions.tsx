import React, { useState } from 'react';
import { PermissionRecord } from '../../_interfaces';
import { motion, AnimatePresence } from 'framer-motion';

interface OngoingPermissionsProps {
  permissions: PermissionRecord[];
  isLoading: boolean;
}

const OngoingPermissions: React.FC<OngoingPermissionsProps> = ({ permissions, isLoading }) => {
  const [ripples, setRipples] = useState<{ [key: string]: any[] }>({});

  const createRipple = (event: React.MouseEvent<HTMLDivElement, MouseEvent>, permissionId: string) => {
    const { left, top, width, height } = event.currentTarget.getBoundingClientRect();
    const size = Math.max(width, height);
    const x = event.clientX - left - size / 2;
    const y = event.clientY - top - size / 2;

    const newRipple = { x, y, size, id: Date.now() };

    setRipples(prev => ({
      ...prev,
      [permissionId]: [...(prev[permissionId] || []), newRipple]
    }));

    setTimeout(() => {
      setRipples(prev => {
        const updatedRipples = (prev[permissionId] || []).filter((r) => r.id !== newRipple.id);
        return { ...prev, [permissionId]: updatedRipples };
      });
    }, 700);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(2)].map((_, index) => (
          <div key={index} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700 animate-pulse">
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-slate-700 mr-3"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/2"></div>
              </div>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full w-full"></div>
          </div>
        ))}
      </div>
    );
  }

  if (permissions.length === 0) {
    return (
      <div className="text-center text-gray-500 dark:text-slate-500 py-8">
        No permission requests in the last 30 days.
      </div>
    );
  }

  const calculateProgress = (startDate: string, endDate: string): number => {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const now = new Date().getTime();
    if (now < start || now > end) return 0;
    const totalDuration = end - start;
    const elapsed = now - start;
    return totalDuration > 0 ? (elapsed / totalDuration) * 100 : 0;
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString.replace(/-/g, '\/')).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getStatusInfo = (status: string) => {
    switch(status) {
      case 'approved':
        return { 
          borderColor: 'border-l-4 border-l-green-500 dark:border-l-green-400', 
          badgeStyle: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800',
          tag: 'Approved', 
          rippleColor: 'rgba(34, 197, 94, 0.4)' 
        };
      case 'pending':
        return { 
          borderColor: 'border-l-4 border-l-amber-500 dark:border-l-amber-400', 
          badgeStyle: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-700',
          tag: 'Pending', 
          rippleColor: 'rgba(245, 158, 11, 0.4)' 
        };
      case 'rejected':
        return { 
          borderColor: 'border-l-4 border-l-red-500 dark:border-l-red-400', 
          badgeStyle: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800',
          tag: 'Rejected', 
          rippleColor: 'rgba(239, 68, 68, 0.4)' 
        };
      default:
        return { 
          borderColor: 'border-l-4 border-l-gray-500 dark:border-l-gray-400', 
          badgeStyle: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700',
          tag: null, 
          rippleColor: 'rgba(156, 163, 175, 0.4)' 
        };
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {permissions.map(permission => {
        const { borderColor, badgeStyle, tag, rippleColor } = getStatusInfo(permission.status);
        const progress = calculateProgress(permission.permissionStartDate, permission.permissionEndDate);
        
        return (
          <motion.div 
            key={permission.id} 
            className={`relative overflow-hidden bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 ${borderColor} cursor-pointer hover:shadow-xl transition-all duration-300 active:scale-95`}
            onClick={(e) => createRipple(e, permission.id)}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center mb-3 pointer-events-none">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-gray-600 dark:text-slate-400 font-bold text-base">
                {formatDate(permission.permissionStartDate).split(' ')[1]}
              </div>
              <div className="flex-1 ml-3">
                <p className="font-semibold text-gray-900 dark:text-white">{permission.studentName}</p>
                <p className="text-sm text-gray-600 dark:text-slate-400">{permission.reason}</p>
              </div>
              {tag && (
                <div className={`text-xs font-medium px-2 py-1 -mt-4 rounded-md ${badgeStyle}`}>
                  {tag}
                </div>
              )}
            </div>
            
            <div className="pointer-events-none">
              {permission.status === 'approved' && progress > 0 && (
                <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-1.5 mb-1.5">
                  <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${progress}%` }}></div>
                </div>
              )}
              <div className="text-xs text-gray-500 dark:text-slate-500">
                  <span>{formatDate(permission.permissionStartDate)} to {formatDate(permission.permissionEndDate)}</span>
              </div>
            </div>
            <AnimatePresence>
              {(ripples[permission.id] || []).map((ripple) => (
                <motion.span
                  key={ripple.id}
                  initial={{ scale: 0, opacity: 0.3 }}
                  animate={{ scale: 4, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.4 }}
                  className="absolute rounded-full z-20 pointer-events-none"
                  style={{
                    left: ripple.x,
                    top: ripple.y,
                    width: ripple.size,
                    height: ripple.size,
                    backgroundColor: rippleColor,
                  }}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
};

export default OngoingPermissions;