import React from 'react';
import Icon from '../../_components/Icon';

interface AttendanceSummaryCardProps {
  title: string;
  count: number;
  total: number;
  icon: string;
  barColorClass: string;
  bgColorClass: string;
}

const AttendanceSummaryCard: React.FC<AttendanceSummaryCardProps> = ({
  title,
  count,
  total,
  icon,
  barColorClass,
  bgColorClass,
}) => {
  const barHeightPercentage = count > 0 ? Math.max(30, (count / total) * 100) : 0;
  const textColor = count > 0 ? 'text-white' : 'text-slate-800';

  return (
    <div className={`relative rounded-2xl p-4 h-40 overflow-hidden ${bgColorClass}`}>
      <div className="relative z-10">
          <p className="text-4xl font-bold text-slate-800">{count.toString().padStart(2, '0')}</p>
      </div>

      <div 
        className={`absolute bottom-0 left-0 w-full rounded-t-xl ${barColorClass}`}
        style={{ 
          height: `${barHeightPercentage}%`,
          maxHeight: '90%'
        }}
      ></div>

      <div className={`absolute bottom-4 left-4 z-10 flex items-center ${textColor}`}>
          <Icon path={icon} size={24} className="mr-2"/>
          <span className="font-semibold">{title}</span>
      </div>
    </div>
  );
};

export default AttendanceSummaryCard; 