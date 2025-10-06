/**
 * Dynamic payment status logic
 * 
 * Rules:
 * 1. If lastPaymentDate is in the same month as currentDate, status is 'paid'
 * 2. If lastPaymentDate is in the same month as currentDate, but currentDate is in the last 3 days of the month, status is 'unpaid'
 * 3. If lastPaymentDate is in a previous month, status is 'unpaid'
 * 4. If no payment record exists, status is 'no-record'
 */

export type PaymentStatus = 'paid' | 'unpaid' | 'no-record';
export type InactiveStatus = 'dropped' | 'onBreak' | 'active';

export interface PaymentStatusResult {
  status: PaymentStatus;
  reason: string;
}

/**
 * Calculate dynamic payment status based on lastPaymentMonth and current date
 * @param lastPaymentMonth - The last payment month in format "YYYY-MM" or "Month Year" (e.g., "October 2025") or null/undefined
 * @param currentDate - Optional current date (defaults to new Date())
 * @returns PaymentStatusResult with status and reason
 */
export function calculatePaymentStatus(
  lastPaymentMonth: string | null | undefined,
  currentDate: Date = new Date()
): PaymentStatusResult {
  // If no payment record exists
  if (!lastPaymentMonth) {
    return {
      status: 'no-record',
      reason: 'No payment record found'
    };
  }

  // Get current year-month in format "YYYY-MM"
  const currentYearMonth = currentDate.toISOString().slice(0, 7);
  
  // Parse the last payment month - handle both "YYYY-MM" and "Month Year" formats
  let lastPaymentYearMonth: string;
  
  if (lastPaymentMonth.includes('-') && lastPaymentMonth.length === 7) {
    // Format is already "YYYY-MM"
    lastPaymentYearMonth = lastPaymentMonth;
  } else {
    // Format is "Month Year" (e.g., "October 2025")
    try {
      const parsedDate = new Date(lastPaymentMonth + ' 1'); // Add day to make it parseable
      if (isNaN(parsedDate.getTime())) {
        // If parsing fails, return unpaid
        return {
          status: 'unpaid',
          reason: 'Invalid payment month format'
        };
      }
      lastPaymentYearMonth = parsedDate.toISOString().slice(0, 7);
    } catch (error) {
      return {
        status: 'unpaid',
        reason: 'Error parsing payment month'
      };
    }
  }
  
  // If payment is from a previous month
  if (lastPaymentYearMonth < currentYearMonth) {
    return {
      status: 'unpaid',
      reason: 'Payment is from a previous month'
    };
  }
  
  // If payment is from the current month
  if (lastPaymentYearMonth === currentYearMonth) {
    // Check if we're in the last 3 days of the month
    const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const currentDay = currentDate.getDate();
    const daysUntilEndOfMonth = lastDayOfMonth - currentDay;
    
    if (daysUntilEndOfMonth <= 3) { // Last 4 days (0, 1, 2 days remaining)
      return {
        status: 'unpaid',
        reason: 'Payment required for next month (last 3 days of current month)'
      };
    }
    
    return {
      status: 'paid',
      reason: 'Payment is current for this month'
    };
  }
  
  // If payment is from a future month (shouldn't happen in normal cases)
  return {
    status: 'paid',
    reason: 'Payment is from a future month'
  };
}

/**
 * Simple version that returns only the status (for backward compatibility)
 * @param lastPaymentMonth - The last payment month in format "YYYY-MM" or null/undefined
 * @param currentDate - Optional current date (defaults to new Date())
 * @returns PaymentStatus
 */
export function getPaymentStatus(
  lastPaymentMonth: string | null | undefined,
  currentDate: Date = new Date()
): PaymentStatus {
  return calculatePaymentStatus(lastPaymentMonth, currentDate).status;
}

/**
 * Get user-friendly payment status display text
 * @param status - The payment status
 * @returns Display text for the status
 */
export function getPaymentStatusDisplayText(status: PaymentStatus): string {
  switch (status) {
    case 'paid':
      return 'Paid';
    case 'unpaid':
      return 'Unpaid';
    case 'no-record':
      return 'No Record';
    default:
      return 'Unknown';
  }
}

/**
 * Determine if a student should be counted as inactive (dropped or on break)
 * based on their status and last payment month
 * @param student - Student object with onBreak, dropped, and lastPaymentMonth properties
 * @param currentDate - Optional current date (defaults to new Date())
 * @returns InactiveStatus indicating if student is dropped, onBreak, or active
 */
export function getInactiveStudentStatus(
  student: { onBreak?: boolean; dropped?: boolean; lastPaymentMonth?: string | null },
  currentDate: Date = new Date()
): InactiveStatus {
  // If student is not marked as inactive, they're active
  if (!student.onBreak && !student.dropped) {
    return 'active';
  }

  // Get previous month in the same format as lastPaymentMonth
  const previousMonth = currentDate.getMonth() === 0
    ? `${currentDate.getFullYear() - 1}-12`
    : `${currentDate.getFullYear()}-${String(currentDate.getMonth()).padStart(2, '0')}`;

  // Only count as inactive if their last payment was exactly the previous month
  if (student.onBreak && student.lastPaymentMonth === previousMonth) {
    return 'onBreak';
  } else if (student.dropped && student.lastPaymentMonth === previousMonth) {
    return 'dropped';
  }

  // If they are marked as inactive but don't meet the payment criteria, treat as active
  return 'active';
}
