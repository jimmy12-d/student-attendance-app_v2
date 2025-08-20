import React from 'react';
import { Student } from '../_lib/types';

interface StatisticsSectionProps {
  enrolledStudents: Student[];
  unenrolledStudents: Student[];
  totalStudents: number;
}

export const StatisticsSection: React.FC<StatisticsSectionProps> = ({
  enrolledStudents,
  unenrolledStudents,
  totalStudents,
}) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t">
      <div className="text-center">
        <div className="text-2xl font-bold text-green-600">{enrolledStudents.length}</div>
        <div className="text-sm text-gray-600">Enrolled</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-orange-600">{unenrolledStudents.length}</div>
        <div className="text-sm text-gray-600">Pending</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-blue-600">{totalStudents}</div>
        <div className="text-sm text-gray-600">Total Students</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-purple-600">FaceIO</div>
        <div className="text-sm text-gray-600">Technology</div>
      </div>
    </div>
  );
};
