"use client";

import { useState, useEffect, useRef } from "react";
import Icon from "@/app/_components/Icon";
import { mdiGauge, mdiTrophy, mdiMinus, mdiPlus } from "@mdi/js";

interface ScoreInputQuestionProps {
  maxScore: number;
  value: string;
  onChange: (value: string) => void;
  required: boolean;
}

const ScoreInputQuestion: React.FC<ScoreInputQuestionProps> = ({
  maxScore = 100,
  value,
  onChange,
  required,
}) => {
  const [score, setScore] = useState<number>(Number(value) || 0);
  const [isDragging, setIsDragging] = useState(false);
  const [showGrade, setShowGrade] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  // Calculate percentage and grade
  const percentage = maxScore > 0 ? (score / maxScore) : 0;
  const percentageDisplay = Math.round(percentage * 100);

  const getGrade = (): { grade: string; color: string; bgColor: string; borderColor: string } => {
    if (percentage >= 0.9) return { 
      grade: 'A', 
      color: 'text-green-700 dark:text-green-300', 
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      borderColor: 'border-green-500 dark:border-green-400'
    };
    if (percentage >= 0.8) return { 
      grade: 'B', 
      color: 'text-blue-700 dark:text-blue-300', 
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      borderColor: 'border-blue-500 dark:border-blue-400'
    };
    if (percentage >= 0.7) return { 
      grade: 'C', 
      color: 'text-yellow-700 dark:text-yellow-300', 
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
      borderColor: 'border-yellow-500 dark:border-yellow-400'
    };
    if (percentage >= 0.6) return { 
      grade: 'D', 
      color: 'text-orange-700 dark:text-orange-300', 
      bgColor: 'bg-orange-100 dark:bg-orange-900/30',
      borderColor: 'border-orange-500 dark:border-orange-400'
    };
    if (percentage >= 0.5) return { 
      grade: 'E', 
      color: 'text-gray-700 dark:text-gray-300', 
      bgColor: 'bg-gray-100 dark:bg-gray-900/30',
      borderColor: 'border-gray-500 dark:border-gray-400'
    };
    return { 
      grade: 'F', 
      color: 'text-red-700 dark:text-red-300', 
      bgColor: 'bg-red-100 dark:bg-red-900/30',
      borderColor: 'border-red-500 dark:border-red-400'
    };
  };

  const gradeInfo = getGrade();

  // Update parent when score changes
  useEffect(() => {
    onChange(score.toString());
    if (score > 0) {
      setShowGrade(true);
    }
  }, [score]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    if (inputValue === '') {
      setScore(0);
      return;
    }
    
    const parsed = Number(inputValue);
    if (!isNaN(parsed)) {
      setScore(Math.max(0, Math.min(parsed, maxScore)));
    }
  };

  const adjustScore = (delta: number) => {
    setScore(prev => Math.max(0, Math.min(prev + delta, maxScore)));
  };

  // Handle mouse/touch events for dragging
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    updateScoreFromEvent(e);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) {
      updateScoreFromEvent(e);
    }
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const updateScoreFromEvent = (e: React.PointerEvent) => {
    if (!barRef.current) return;

    const rect = barRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const newPercentage = x / rect.width;
    const newScore = Math.round(newPercentage * maxScore);
    
    setScore(Math.max(0, Math.min(newScore, maxScore)));
  };

  // Get gradient color based on percentage
  const getBarGradient = () => {
    if (percentage >= 0.9) return 'from-green-400 via-green-500 to-green-600';
    if (percentage >= 0.8) return 'from-blue-400 via-blue-500 to-blue-600';
    if (percentage >= 0.7) return 'from-yellow-400 via-yellow-500 to-yellow-600';
    if (percentage >= 0.6) return 'from-orange-400 via-orange-500 to-orange-600';
    if (percentage >= 0.5) return 'from-red-400 via-red-500 to-red-600';
    return 'from-gray-400 via-gray-500 to-gray-600';
  };

  // Get text color to match bar gradient
  const getTextColor = () => {
    if (percentage >= 0.9) return 'text-green-500 dark:text-green-400';
    if (percentage >= 0.8) return 'text-blue-500 dark:text-blue-400';
    if (percentage >= 0.7) return 'text-yellow-500 dark:text-yellow-400';
    if (percentage >= 0.6) return 'text-orange-500 dark:text-orange-400';
    if (percentage >= 0.5) return 'text-red-500 dark:text-red-400';
    return 'text-gray-500 dark:text-gray-400';
  };

  return (
    <div className="space-y-6 nokora-font">
      {/* Score Input Section */}
      <div className="space-y-4">
        <label className="block text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-300">
          Enter Score (0 - {maxScore})
        </label>
        
        {/* Main Input with +/- buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => adjustScore(-1)}
            className="w-12 h-12 sm:w-14 sm:h-14 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white rounded-full flex items-center justify-center shadow-lg transition-colors touch-manipulation"
            type="button"
          >
            <Icon path={mdiMinus} size={20} />
          </button>
          
          <input
            type="number"
            min="0"
            max={maxScore}
            step="0.1"
            value={score || ''}
            onChange={handleInputChange}
            placeholder="0"
            className="flex-1 bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-600 rounded-2xl px-4 sm:px-6 py-3 sm:py-4 text-2xl sm:text-3xl font-bold text-center text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          
          <button
            onClick={() => adjustScore(1)}
            className="w-12 h-12 sm:w-14 sm:h-14 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white rounded-full flex items-center justify-center shadow-lg transition-colors touch-manipulation"
            type="button"
          >
            <Icon path={mdiPlus} size={20} />
          </button>
        </div>
      </div>

      {/* Draggable Progress Bar */}
      <div className="space-y-2 sm:space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
            Or drag to set score
          </label>
          <span className={`text-xs sm:text-sm font-bold ${getTextColor()}`}>
            {percentageDisplay}%
          </span>
        </div>
        
        <div
          ref={barRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className={`relative h-12 sm:h-16 bg-gray-200 dark:bg-slate-700 rounded-2xl overflow-hidden cursor-pointer shadow-inner ${
            isDragging ? 'scale-105 shadow-xl' : ''
          } transition-all duration-200 touch-none`}
        >
          {/* Filled portion with gradient */}
          <div
            className={`absolute inset-y-0 left-0 bg-gradient-to-r ${getBarGradient()} rounded-2xl shadow-lg transition-all duration-300 ease-out flex items-center justify-end px-3 sm:px-4`}
            style={{ width: `${percentageDisplay}%` }}
          >
            {percentageDisplay > 15 && (
              <div className="flex items-center gap-1 sm:gap-2 text-white font-bold text-sm sm:text-lg drop-shadow-lg">
                <Icon path={mdiGauge} size={16} />
                <span>{score.toFixed(1)}</span>
              </div>
            )}
          </div>

          {/* Empty portion label */}
          {percentageDisplay < 15 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-semibold">
                Drag or type to set score
              </span>
            </div>
          )}

          {/* Percentage markers */}
          <div className="absolute inset-y-0 left-0 w-full flex items-center justify-between px-2 pointer-events-none">
            {[0, 25, 50, 75, 100].map((mark) => (
              <div
                key={mark}
                className="w-px h-6 sm:h-8 bg-gray-400/30 dark:bg-slate-500/30"
                style={{ marginLeft: mark === 0 ? '0' : 'auto' }}
              />
            ))}
          </div>
        </div>

        {/* Scale labels */}
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 font-medium px-1">
          <span>0</span>
          <span>{maxScore}</span>
        </div>
      </div>

      {/* Grade Display */}
      {showGrade && score > 0 && (
        <div
          className={`${gradeInfo.bgColor} ${gradeInfo.borderColor} border-2 rounded-2xl p-4 sm:p-6 transform transition-all duration-500 animate-in slide-in-from-bottom-4`}
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-3 sm:gap-2">
              <div className={`p-3 sm:p-4 ${gradeInfo.bgColor} rounded-xl border-2 ${gradeInfo.borderColor} shadow-lg`}>
                <Icon path={mdiTrophy} size={28} className={gradeInfo.color} />
              </div>
              <div className="text-center sm:text-left">
                <p className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                  Your Grade
                </p>
                <p className={`text-4xl sm:text-5xl font-black ${gradeInfo.color} drop-shadow-sm`}>
                  {gradeInfo.grade}
                </p>
              </div>  
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScoreInputQuestion;
