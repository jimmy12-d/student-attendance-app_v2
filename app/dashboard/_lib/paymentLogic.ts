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

export interface PaymentStatusResult {
  status: PaymentStatus;
  reason: string;
}

/**
 * Calculate dynamic payment status based on lastPaymentMonth and current date
 * @param lastPaymentMonth - The last payment month in format "YYYY-MM" or null/undefined
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
  
  // Parse the last payment month
  const lastPaymentYearMonth = lastPaymentMonth.slice(0, 7);
  
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
    
    if (daysUntilEndOfMonth <= 2) { // Last 3 days (0, 1, 2 days remaining)
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
