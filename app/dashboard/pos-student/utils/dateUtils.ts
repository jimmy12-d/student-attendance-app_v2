import { isSchoolDay } from "../../_lib/attendanceLogic";
// import { cambodianHolidaysSet } from "../../_lib/attendanceUtils";

export const getWorkingDaysInMonth = (year: number, month: number, classStudyDays?: number[] | null) => {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0); // Last day of the month
    let workingDays = 0;

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        if (isSchoolDay(d, classStudyDays)) {
            workingDays++;
        }
    }

    return workingDays;
};

export const calculateProratedAmount = (
    fullAmount: number,
    joinDate: Date,
    paymentMonth: string,
    classStudyDays?: number[] | null,
    scholarshipAmount?: number
) => {
    const [year, month] = paymentMonth.split('-').map(Number);
    
    // Apply scholarship discount to the full amount first
    const discountedFullAmount = Math.max(0, fullAmount - (scholarshipAmount || 0));
    
    // Normalize dates to start of day to avoid time component issues
    const normalizedJoinDate = new Date(joinDate.getFullYear(), joinDate.getMonth(), joinDate.getDate());
    const monthStartDate = new Date(year, month - 1, 1);
    const monthEndDate = new Date(year, month, 0);
    
    // If join date is after this month, return 0
    if (normalizedJoinDate > monthEndDate) return 0;
    
    // Only return discounted full amount if join date is exactly on or before the first day of the month
    if (normalizedJoinDate.getTime() === monthStartDate.getTime() || normalizedJoinDate < monthStartDate) return discountedFullAmount;
    
    // Calculate working days in month
    const totalWorkingDays = getWorkingDaysInMonth(year, month - 1, classStudyDays);
    // Calculate remaining working days from join date (inclusive)
    let remainingWorkingDays = 0;
    
    // Count all working days from join date to end of month (inclusive)
    for (let d = new Date(normalizedJoinDate); d <= monthEndDate; d.setDate(d.getDate() + 1)) {
        if (isSchoolDay(d, classStudyDays)) {
            remainingWorkingDays++;
        }
    }
    
    // Ensure remaining days don't exceed total days
    remainingWorkingDays = Math.min(remainingWorkingDays, totalWorkingDays);
    
    // Calculate prorated amount with more precision
    const ratio = remainingWorkingDays / totalWorkingDays;
    const exactAmount = discountedFullAmount * ratio;
    
    return exactAmount; // Return exact amount without rounding
};
