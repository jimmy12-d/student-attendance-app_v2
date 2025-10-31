/**
 * Centralized attendance configuration
 * This file is shared between Firebase Functions and the Next.js app
 */

const cambodianHolidays = [
    "2025-01-01", "2025-01-07", "2025-03-08", "2025-05-01",
    "2025-05-14", "2025-05-15", "2025-05-16",
    "2025-06-18",
    "2025-08-01", "2025-08-02",
    "2025-09-22", "2025-09-23", "2025-09-24",
    "2025-11-07", "2025-11-08", "2025-11-09",
    "2025-10-15",
    "2025-10-29",
    "2025-11-09",
    "2025-11-20", "2025-11-21", "2025-11-22",
];

const cambodianHolidaysSet = new Set(cambodianHolidays);

/**
 * Check if a given date is a school day
 * @param {Date|string} date - Date object or YYYY-MM-DD string
 * @param {number[]} classStudyDays - Array of study days (0=Sun, 1=Mon, ..., 6=Sat)
 * @returns {boolean} - True if it's a school day
 */
const isSchoolDay = (date, classStudyDays = null) => {
    const dateObj = typeof date === 'string' ? new Date(date + 'T00:00:00') : date;
    const dayOfWeek = dateObj.getDay();
    const dateString = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
    
    // Check if it's a holiday
    if (cambodianHolidaysSet.has(dateString)) {
        return false;
    }
    
    // Check if it's a study day based on class configuration
    if (classStudyDays && classStudyDays.length > 0) {
        return classStudyDays.includes(dayOfWeek);
    }
    
    // Default: all days except Sunday are school days
    return dayOfWeek !== 0;
};

module.exports = {
    cambodianHolidays,
    cambodianHolidaysSet,
    isSchoolDay
};
