"use client";
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type DurationSelectorProps = {
  value: number;
  onChange: (value: number) => void;
};

const DurationSelector = ({ value, onChange }: DurationSelectorProps) => {
  const [animation, setAnimation] = useState('');
  const [clickedButton, setClickedButton] = useState<'left' | 'right' | null>(null);

  const handleAnimate = (newAnimation: string) => {
    setAnimation(newAnimation);
    setTimeout(() => setAnimation(''), 300);
  };

  const handleIncrease = () => {
    setClickedButton('right');
    setTimeout(() => setClickedButton(null), 300);

    handleAnimate('animate-fade-out-left');
    setTimeout(() => {
      onChange(value + 1);
      handleAnimate('animate-fade-in-right');
    }, 300);
  };

  const handleDecrease = () => {
    if (value > 1) {
      setClickedButton('left');
      setTimeout(() => setClickedButton(null), 300);

      handleAnimate('animate-fade-out-right');
      setTimeout(() => {
        onChange(value - 1);
        handleAnimate('animate-fade-in-left');
      }, 300);
    }
  };

  return (
    <div className="flex items-center justify-center space-x-4 bg-gray-100 dark:bg-slate-700 p-2 rounded-lg">
      <button
        type="button"
        onClick={handleDecrease}
        disabled={value <= 1}
        className={`p-2 rounded-full transition-colors duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed ${
          clickedButton === 'left'
            ? 'bg-company-purple-dark text-white'
            : 'bg-gray-200 dark:bg-slate-600 hover:bg-gray-300 dark:hover:bg-slate-500'
        }`}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <div className="w-10 text-center text-lg font-semibold">
        <span className={animation}>{value}</span>
      </div>
      <button
        type="button"
        onClick={handleIncrease}
        className={`p-2 rounded-full transition-colors duration-300 ease-in-out ${
          clickedButton === 'right'
            ? 'bg-company-purple-dark text-white'
            : 'bg-gray-200 dark:bg-slate-600 hover:bg-gray-300 dark:hover:bg-slate-500'
        }`}
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
};

export default DurationSelector; 