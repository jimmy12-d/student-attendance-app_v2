// Test the dashboard logic with your specific attendance records
console.log('🧪 Testing dashboard attendance record processing...');

// Simulate the two attendance records you provided
const presentRecord = {
  id: 'record1',
  studentId: '1d7nzGQOx9odSrmTlwXA',
  studentName: 'Bo Sereivath',
  class: 'Class 12B',
  shift: 'Afternoon',
  status: 'present',
  date: '2025-09-01',
  authUid: null,
  cutoffTime: '01:15 PM',
  gracePeriodMinutes: 15,
  method: 'face-api',
  timeIn: '01:10 PM',
  timestamp: {
    toDate: () => new Date('September 1, 2025 at 1:10:29 PM UTC+7')
  }
};

const manualRecord = {
  id: 'record2',
  studentId: '1d7nzGQOx9odSrmTlwXA',
  studentName: 'Bo Sereivath',
  class: 'Class 12I',
  shift: 'Morning',
  status: 'present',
  date: '2025-08-09',
  authUid: 'manual-entry',
  scannedBy: 'Manual attendance by teacher',
  timestamp: {
    toDate: () => new Date('August 9, 2025 at 10:46:34 AM UTC+7')
  }
};

// Simulate the dashboard processing logic
function processAttendanceRecord(data, docId, studentsMap) {
  const student = studentsMap.get(data.studentId);
  
  if (!student) {
    console.warn(`Student not found for attendance record:`, {
      recordId: docId,
      studentId: data.studentId,
      studentName: data.studentName,
      date: data.date,
      status: data.status,
      method: data.method,
      authUid: data.authUid
    });
    
    return {
      id: docId,
      studentName: data.studentName || `Unknown (${data.studentId})`,
      studentId: data.studentId,
      class: data.class || 'N/A',
      shift: data.shift || 'N/A',
      status: data.status || 'Unknown',
      date: data.date,
      timestamp: data.timestamp,
    };
  }

  return {
    id: docId,
    studentName: student.fullName,
    studentId: data.studentId,
    class: student.class || 'N/A',
    shift: student.shift || 'N/A',
    status: data.status || 'Unknown',
    date: data.date,
    timestamp: data.timestamp,
  };
}

// Mock student data
const studentsMap = new Map();
studentsMap.set('1d7nzGQOx9odSrmTlwXA', {
  id: '1d7nzGQOx9odSrmTlwXA',
  fullName: 'Bo Sereivath',
  class: 'Class 12B',
  shift: 'Afternoon'
});

console.log('\n📋 Processing Record 1 (Face Recognition):');
const processedRecord1 = processAttendanceRecord(presentRecord, 'record1', studentsMap);
console.log('Input status:', presentRecord.status);
console.log('Output status:', processedRecord1.status);
console.log('Has timeIn:', !!presentRecord.timeIn);
console.log('Method:', presentRecord.method);
console.log('AuthUID:', presentRecord.authUid);

console.log('\n📋 Processing Record 2 (Manual Entry):');
const processedRecord2 = processAttendanceRecord(manualRecord, 'record2', studentsMap);
console.log('Input status:', manualRecord.status);
console.log('Output status:', processedRecord2.status);
console.log('Has timeIn:', !!manualRecord.timeIn);
console.log('Method:', manualRecord.method);
console.log('AuthUID:', manualRecord.authUid);

// Test the filter that removes 'Unknown' records
const records = [processedRecord1, processedRecord2];
const filteredRecords = records.filter(record => record !== null && record.status !== 'Unknown');

console.log('\n🔍 Filter Results:');
console.log('Records before filter:', records.length);
console.log('Records after filter:', filteredRecords.length);
console.log('Both records should pass the filter since both have status: "present"');

// Test the stats calculation
console.log('\n📊 Stats Calculation:');
const presentCount = filteredRecords.filter(r => r.status === 'present').length;
const lateCount = filteredRecords.filter(r => r.status === 'late').length;
const requestedCount = filteredRecords.filter(r => r.status === 'requested').length;

console.log('Present count:', presentCount);
console.log('Late count:', lateCount);
console.log('Requested count:', requestedCount);

console.log('\n🎯 Conclusion:');
console.log('Both records should show as Present in the dashboard');
console.log('If one is showing as Absent, there might be an issue with:');
console.log('1. The student data mapping');
console.log('2. A different filter or processing step');
console.log('3. The table rendering logic');
console.log('4. The date filtering logic');
