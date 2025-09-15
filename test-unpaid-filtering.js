// Simple test for unpaid student count filtering logic
function getPaymentStatus(lastPaymentMonth, currentDate = new Date()) {
  if (!lastPaymentMonth) {
    return 'no-record';
  }

  const currentYearMonth = currentDate.toISOString().slice(0, 7);
  const lastPaymentYearMonth = lastPaymentMonth.slice(0, 7);

  if (lastPaymentYearMonth < currentYearMonth) {
    return 'unpaid';
  }

  if (lastPaymentYearMonth === currentYearMonth) {
    const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const currentDay = currentDate.getDate();
    const daysUntilEndOfMonth = lastDayOfMonth - currentDay;

    if (daysUntilEndOfMonth <= 2) {
      return 'unpaid';
    }

    return 'paid';
  }

  return 'paid';
}

// Mock student data
const mockStudents = [
  { id: '1', fullName: 'Active Student', lastPaymentMonth: '2025-09', onBreak: false, onWaitlist: false, dropped: false },
  { id: '2', fullName: 'On Break Student', lastPaymentMonth: '2025-08', onBreak: true, onWaitlist: false, dropped: false },
  { id: '3', fullName: 'Waitlist Student', lastPaymentMonth: '2025-08', onBreak: false, onWaitlist: true, dropped: false },
  { id: '4', fullName: 'Dropped Student', lastPaymentMonth: '2025-08', onBreak: false, onWaitlist: false, dropped: true },
  { id: '5', fullName: 'Unpaid Active Student', lastPaymentMonth: '2025-08', onBreak: false, onWaitlist: false, dropped: false },
  { id: '6', fullName: 'No Payment Record', lastPaymentMonth: null, onBreak: false, onWaitlist: false, dropped: false },
];

console.log('Testing Unpaid Student Count Filtering...\n');

// Simulate the filtering logic from payment summary page
let unpaidStudentsCount = 0;
mockStudents.forEach((student) => {
  // Skip students who are on break, waitlist, or dropped
  if (student.onBreak || student.onWaitlist || student.dropped) {
    console.log(`Skipping ${student.fullName} (${student.onBreak ? 'on break' : student.onWaitlist ? 'waitlist' : 'dropped'})`);
    return;
  }

  const paymentStatus = getPaymentStatus(student.lastPaymentMonth);
  console.log(`${student.fullName}: ${paymentStatus}`);

  if (paymentStatus === 'unpaid' || paymentStatus === 'no-record') {
    unpaidStudentsCount++;
  }
});

console.log(`\nTotal unpaid active students: ${unpaidStudentsCount}`);
console.log('Expected: 2 (Unpaid Active Student + No Payment Record)');
