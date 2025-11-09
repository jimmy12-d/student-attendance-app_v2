/**
 * Date utility functions for consistent date handling across the app.
 * All dates are handled in Phnom Penh timezone (Asia/Phnom_Penh, UTC+7).
 */

/**
 * Format a Date object to YYYY-MM-DD string in local timezone
 * This prevents timezone offset issues when converting dates
 * 
 * @param date - The date to format
 * @returns Date string in YYYY-MM-DD format
 */
export function formatDateToLocalString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse a YYYY-MM-DD string to a Date object at midnight local time
 * This ensures the date is interpreted in the local timezone, not UTC
 * 
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Date object at midnight local time
 */
export function parseDateStringToLocal(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Get current date as YYYY-MM-DD string in local timezone
 * 
 * @returns Today's date in YYYY-MM-DD format
 */
export function getTodayLocalString(): string {
  return formatDateToLocalString(new Date());
}

/**
 * Get a Date object for today at midnight local time
 * 
 * @returns Today's date at 00:00:00 local time
 */
export function getTodayMidnight(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

/**
 * Format date for display in Phnom Penh locale
 * 
 * @param dateString - Date string in YYYY-MM-DD format
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 */
export function formatDateForDisplay(
  dateString: string,
  options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }
): string {
  const date = parseDateStringToLocal(dateString);
  return date.toLocaleDateString('en-US', options);
}
