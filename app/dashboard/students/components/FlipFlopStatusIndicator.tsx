import React, { useState, useEffect } from 'react';
import { Student } from '../../../_interfaces';
import { mdiCalendarClock, mdiSwapHorizontal, mdiCheckCircle, mdiAlertCircle, mdiHistory } from '@mdi/js';
import Icon from '../../../_components/Icon';
import { flipFlopService } from '../_services/flipFlopService';

interface FlipFlopStatusIndicatorProps {
  students: Student[];
  onApplyFlipFlop: () => void;
}

export const FlipFlopStatusIndicator: React.FC<FlipFlopStatusIndicatorProps> = ({
  students,
  onApplyFlipFlop
}) => {
  const [hasBeenAppliedThisMonth, setHasBeenAppliedThisMonth] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastAppliedDate, setLastAppliedDate] = useState<string | null>(null);
  const [isBaseline, setIsBaseline] = useState(false);
  
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  
  const flipFlopStudents = students.filter(student => 
    student.scheduleType?.toLowerCase() === 'flip-flop'
  );

  // Check Firestore tracking status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        setLoading(true);
        
        // Check Firestore for tracking record
        const trackingRecord = await flipFlopService.getTrackingRecord(currentYear, currentMonth);
        const isApplied = trackingRecord !== null;
        const isBaselineMonth = trackingRecord?.isBaseline || false;
        
        setHasBeenAppliedThisMonth(isApplied);
        setIsBaseline(isBaselineMonth);
        
        // Get last applied date from localStorage as fallback
        const localLastApplied = localStorage.getItem('flipFlop_lastApplied');
        setLastAppliedDate(localLastApplied);
        
        // If Firestore shows applied but localStorage doesn't, update localStorage
        if (isApplied && !localStorage.getItem(`flipFlop_${currentYear}_${currentMonth}`)) {
          localStorage.setItem(`flipFlop_${currentYear}_${currentMonth}`, 'applied');
        }
        
      } catch (error) {
        // Fallback to localStorage on error
        const localStatus = localStorage.getItem(`flipFlop_${currentYear}_${currentMonth}`);
        setHasBeenAppliedThisMonth(localStatus === 'applied');
      } finally {
        setLoading(false);
      }
    };

    if (flipFlopStudents.length > 0) {
      checkStatus();
    } else {
      setLoading(false);
    }
  }, [currentYear, currentMonth, flipFlopStudents.length]);

  if (flipFlopStudents.length === 0) return null;

  // Check if we're in the grace period (first 7 days of month)
  const isGracePeriod = currentDate.getDate() <= 7;
  
  // Get month name
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const currentMonthName = monthNames[currentMonth];

  // Hide completely for baseline months (no status needed for baseline)
  if (isBaseline && hasBeenAppliedThisMonth) {
    return null;
  }

  // Hide if everything is up to date and not in grace period
  if (hasBeenAppliedThisMonth && !isBaseline && !isGracePeriod) {
    return null;
  }

  // Count students by current shift
  const shiftCounts = flipFlopStudents.reduce((acc, student) => {
    const shift = student.shift || 'Unknown';
    acc[shift] = (acc[shift] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const getStatusColor = () => {
    if (loading) return 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800';
    if (hasBeenAppliedThisMonth) {
      return isBaseline 
        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
        : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
    }
    if (isGracePeriod) return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
    return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
  };

  const getStatusIcon = () => {
    if (loading) return mdiCalendarClock;
    if (hasBeenAppliedThisMonth) {
      return isBaseline ? mdiHistory : mdiCheckCircle;
    }
    if (isGracePeriod) return mdiSwapHorizontal;
    return mdiAlertCircle;
  };

  const getStatusText = () => {
    if (loading) {
      return {
        title: 'Checking Flip-Flop Status...',
        subtitle: 'Loading data from Firestore',
        color: 'text-gray-800 dark:text-gray-200'
      };
    }
    
    if (hasBeenAppliedThisMonth) {
      if (isBaseline) {
        return {
          title: 'Baseline Month Established',
          subtitle: `${currentMonthName} ${currentYear} baseline set - no flip needed (starting month)`,
          color: 'text-blue-800 dark:text-blue-200'
        };
      }
      return {
        title: 'Flip-Flop Schedules Updated',
        subtitle: `Already updated for ${currentMonthName} ${currentYear} (Tracked in Firestore)`,
        color: 'text-green-800 dark:text-green-200'
      };
    }
    
    if (isGracePeriod) {
      return {
        title: 'Flip-Flop Update Available',
        subtitle: `Ready to update for ${currentMonthName} ${currentYear} (grace period)`,
        color: 'text-yellow-800 dark:text-yellow-200'
      };
    }
    
    return {
      title: 'Flip-Flop Update Overdue',
      subtitle: `Should have been updated for ${currentMonthName} ${currentYear}`,
      color: 'text-red-800 dark:text-red-200'
    };
  };

  const statusInfo = getStatusText();

  return (
    <div className={`border rounded-lg p-4 transition-all duration-200 ${getStatusColor()}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Icon 
            path={getStatusIcon()} 
            size={24} 
            className={statusInfo.color}
          />
          <div>
            <h3 className={`font-semibold ${statusInfo.color}`}>
              {statusInfo.title}
            </h3>
            <p className={`text-sm ${statusInfo.color} opacity-80`}>
              {statusInfo.subtitle}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Student count breakdown */}
          <div className="flex items-center space-x-2 text-sm">
            <Icon path={mdiSwapHorizontal} size={16} className={statusInfo.color} />
            <span className={statusInfo.color}>
              {flipFlopStudents.length} flip-flop students
            </span>
            {Object.entries(shiftCounts).map(([shift, count]) => (
              <span 
                key={shift}
                className={`px-2 py-1 rounded-full text-xs font-medium bg-white/50 dark:bg-black/20 ${statusInfo.color}`}
              >
                {shift}: {count}
              </span>
            ))}
          </div>
          
          {/* Action button */}
          {!loading && !hasBeenAppliedThisMonth && (
            <button
              onClick={onApplyFlipFlop}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                isGracePeriod
                  ? 'bg-yellow-200 dark:bg-yellow-800 text-yellow-900 dark:text-yellow-100 hover:bg-yellow-300 dark:hover:bg-yellow-700'
                  : 'bg-red-200 dark:bg-red-800 text-red-900 dark:text-red-100 hover:bg-red-300 dark:hover:bg-red-700'
              }`}
            >
              <Icon path={mdiCalendarClock} size={16} />
              <span>Update Now</span>
            </button>
          )}
        </div>
      </div>
      
      {/* Last applied info */}
      {lastAppliedDate && (
        <div className="mt-2 pt-2 border-t border-current/20">
          <p className={`text-xs ${statusInfo.color} opacity-70`}>
            Last updated: {new Date(lastAppliedDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
      )}
    </div>
  );
};
