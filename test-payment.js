// Simple test for payment logic
function calculatePaymentStatus(lastPaymentMonth, currentDate = new Date()) {
  if (!lastPaymentMonth) {
    return {
      status: 'no-record',
      reason: 'No payment record found'
    };
  }

  const currentYearMonth = currentDate.toISOString().slice(0, 7);
  const lastPaymentYearMonth = lastPaymentMonth.slice(0, 7);
  
  if (lastPaymentYearMonth < currentYearMonth) {
    return {
      status: 'unpaid',
      reason: 'Payment is from a previous month'
    };
  }
  
  if (lastPaymentYearMonth === currentYearMonth) {
    const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const currentDay = currentDate.getDate();
    const daysUntilEndOfMonth = lastDayOfMonth - currentDay;
    
    if (daysUntilEndOfMonth <= 2) {
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
  
  return {
    status: 'paid',
    reason: 'Payment is from a future month'
  };
}

console.log('Testing Payment Logic...\n');

// Test with current date September 15, 2025
const currentDate = new Date('2025-09-15T10:00:00');

console.log('Test 1: No payment record');
console.log(calculatePaymentStatus(null, currentDate));
console.log('');

console.log('Test 2: Payment from previous month (August 2025)');
console.log(calculatePaymentStatus('2025-08', currentDate));
console.log('');

console.log('Test 3: Payment from current month, not in last 3 days (September 15th)');
console.log(calculatePaymentStatus('2025-09', currentDate));
console.log('');

console.log('Test 4: Payment from current month, but in last 3 days (September 29th)');
const lastDayCurrentDate = new Date('2025-09-29T10:00:00');
console.log(calculatePaymentStatus('2025-09', lastDayCurrentDate));
console.log('');

console.log('Test 5: Payment from current month, exactly 3 days before end (September 28th)');
const threeDaysBeforeEnd = new Date('2025-09-28T10:00:00');
console.log(calculatePaymentStatus('2025-09', threeDaysBeforeEnd));
console.log('');

console.log('Test 6: Payment from current month, 4 days before end (September 27th)');
const fourDaysBeforeEnd = new Date('2025-09-27T10:00:00');
console.log(calculatePaymentStatus('2025-09', fourDaysBeforeEnd));
