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
          <div key={index} className="bg-slate-900 p-4 rounded-2xl animate-pulse">
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 rounded-full bg-slate-700 mr-3"></div>
              <div className="flex-1">
                <div className="h-4 bg-slate-700 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-slate-700 rounded w-1/2"></div>
              </div>
            </div>
            <div className="h-2 bg-slate-700 rounded-full w-full"></div>
          </div>
        ))}
      </div>
    );
  }

  if (permissions.length === 0) {
    return (
      <div className="text-center text-slate-500 py-8">
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
        return { borderColor: 'border-green-300', tag: 'Approved', rippleColor: 'rgba(12, 255, 12, 0.4)' };
      case 'pending':
        return { borderColor: 'border-yellow-300', tag: 'Pending', rippleColor: 'rgba(234, 179, 8, 0.4)' };
      case 'rejected':
        return { borderColor: 'border-red-300', tag: 'Rejected', rippleColor: 'rgba(239, 34, 34, 0.4)' };
      default:
        return { borderColor: 'border-slate-700', tag: null, rippleColor: 'rgba(255, 255, 255, 0.2)' };
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {permissions.map(permission => {
        const { borderColor, tag, rippleColor } = getStatusInfo(permission.status);
        const progress = calculateProgress(permission.permissionStartDate, permission.permissionEndDate);
        
        return (
          <motion.div 
            key={permission.id} 
            className={`relative overflow-hidden bg-slate-900 p-4 rounded-2xl border-l-6 ${borderColor} cursor-pointer`}
            onClick={(e) => createRipple(e, permission.id)}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center mb-3 pointer-events-none">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 font-bold">
                {permission.studentName.charAt(0)}
              </div>
              <div className="flex-1 ml-3">
                <p className="font-semibold text-white">{permission.studentName}</p>
                <p className="text-sm text-slate-400">{permission.reason}</p>
              </div>
              {tag && (
                <div className={`text-xs font-bold px-2 py-1 -mt-4 rounded-full ${
                  tag === 'Pending' ? 'bg-yellow-200 bg-opacity-20 text-yellow-800' :
                  tag === 'Approved' ? 'bg-green-200 bg-opacity-20 text-green-800' :
                  'bg-red-200 bg-opacity-20 text-red-800'
                }`}>
                  {tag}
                </div>
              )}
            </div>
            
            <div className="pointer-events-none">
              {permission.status === 'approved' && progress > 0 && (
                <div className="w-full bg-slate-700 rounded-full h-1.5 mb-1.5">
                  <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${progress}%` }}></div>
                </div>
              )}
              <div className="text-xs text-slate-500">
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