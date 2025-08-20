export interface Student {
  id: string;
  fullName: string;
  email: string;
  faceId?: string;
  class?: string;
  rollNumber?: string;
  shift?: string;
}

export interface AttendanceRecord {
  studentId: string;
  studentName: string;
  date: string;
  timeIn?: string;
  status: 'present' | 'late' | 'absent';
  method: 'faceio' | 'manual' | 'qr' | 'legacy-face';
  timestamp: any;
}
