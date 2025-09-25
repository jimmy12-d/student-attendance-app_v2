import React, { useMemo } from 'react';
import Image from 'next/image';

interface ExamInfoBoxesProps {
  progressStatus: string;
  seatInfo: string | null;
  phoneInfo: string | null;
}

const ExamInfoBoxes: React.FC<ExamInfoBoxesProps> = ({
  progressStatus,
  seatInfo,
  phoneInfo,
}) => {
  const { room, seat } = useMemo(() => {
    if (typeof seatInfo !== 'string' || seatInfo.length < 3) {
      return { room: '?', seat: '?' };
    }
    const len = seatInfo.length;
    const seatValue = seatInfo.substring(len - 2);
    const roomValue = seatInfo.substring(0, len - 2);
    return { room: roomValue, seat: seatValue };
  }, [seatInfo]);

  const { phonePocketHolder, phonePocketSlot } = useMemo(() => {
    if (typeof phoneInfo !== 'string' || phoneInfo.length !== 3) {
      return { phonePocketHolder: '?', phonePocketSlot: '?' };
    }
    const holderValue = phoneInfo.substring(0, 1);
    const slotValue = phoneInfo.substring(1);
    return { phonePocketHolder: holderValue, phonePocketSlot: slotValue };
  }, [phoneInfo]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-6 mt-6">
      <div className="relative h-32">
        <Image
          src="/door.png"
          alt="Room"
          width={80}
          height={80}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 -ml-4"
        />
        <div className={`relative bg-slate-900 rounded-2xl h-full ml-6 px-4 py-2 flex flex-col ${progressStatus === 'No Registered' ? 'justify-center items-center' : 'justify-between items-end'}`}>
          {progressStatus === 'No Registered' ? (
            <span className="text-center text-sm font-semibold text-yellow-300 animate-pulse pl-6">
              Register to View your Exam Room
            </span>
          ) : (
            <>
              <span className="font-semibold text-white">Room</span>
              <span className="text-5xl font-bold text-white">
                {room}
              </span>
            </>
          )}
        </div>
      </div>
      <div className="relative h-32">
        <Image
          src="/school-desk.png"
          alt="Seat"
          width={80}
          height={80}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 saturate-125 contrast-125"
        />
        <div className={`relative bg-slate-900 rounded-2xl h-full ml-6 px-4 py-2 flex flex-col ${
          progressStatus === 'Paid Star' || progressStatus === 'Borrow' 
            ? 'justify-between items-end' 
            : 'justify-center items-center'
        }`}>
        {progressStatus === 'Paid Star' || progressStatus === 'Borrow' ? (
          <>
            <span className="font-semibold text-white">Seat</span>
            <span className="text-5xl font-bold text-white">
              {seat}
            </span>
          </>
        ) : (
          <span className="text-center text-sm font-semibold text-yellow-300 animate-pulse pl-8">
            Pay STAR to View your Exam Seat
          </span>
        )}
        </div>
      </div>
      <div className="relative h-32">
        <Image
          src="/pocket.png"
          alt="Phone Pocket"
          width={80}
          height={80}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 -ml-4 saturate-125 contrast-125"
        />
        <div className={`relative bg-slate-900 rounded-2xl h-full ml-6 px-4 py-2 flex flex-col ${progressStatus === 'Paid Star' || progressStatus === 'Borrow' ? 'justify-between items-end' : 'justify-center items-center'}`}>
          {progressStatus !== "" ? (
            <>
              <span className="font-semibold text-white">Phone Pocket</span>
                <div className="flex items-baseline">
                  <span className="text-5xl font-bold text-white">
                    {phonePocketHolder}
                  </span>
                  <span className="text-xl font-semibold text-gray-400 ml-2">
                    #{phonePocketSlot}
                  </span>
                </div>
              </>
            ) : (
              <span className="text-center text-sm font-semibold text-yellow-300 animate-pulse pl-8">
                Register to View your Phone Pocket
              </span>
            )}
        </div>
      </div>
    </div>
  );
};

export default ExamInfoBoxes; 