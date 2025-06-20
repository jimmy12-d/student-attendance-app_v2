"use client";

import React, { useState, useRef, ChangeEvent, KeyboardEvent } from 'react';

type OtpInputProps = {
  length?: number;
  onComplete: (otp: string) => void;
};

const OtpInput = ({ length = 6, onComplete }: OtpInputProps) => {
  const [otp, setOtp] = useState<string[]>(new Array(length).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>(new Array(length));

  const handleChange = (element: HTMLInputElement, index: number) => {
    const value = element.value;
    // Only allow numbers
    if (isNaN(Number(value))) return;

    const newOtp = [...otp];
    // This allows the user to paste a multi-digit string into the first box
    if (value.length > 1) {
      const pastedOtp = value.split('').slice(0, length);
      for (let i = 0; i < length; i++) {
        newOtp[i] = pastedOtp[i] || "";
      }
      setOtp(newOtp);
      const lastFullBox = Math.min(pastedOtp.length, length) -1;
      if (inputRefs.current[lastFullBox]) {
        inputRefs.current[lastFullBox]?.focus();
      }
      if (pastedOtp.length >= length) {
        onComplete(pastedOtp.join(""));
      }
    } else {
      newOtp[index] = value;
      setOtp(newOtp);

      // Move to next input if a digit is entered
      if (value && index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    }

    // Check if OTP is complete
    if (newOtp.every(digit => digit !== "") && newOtp.join("").length === length) {
      onComplete(newOtp.join(""));
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    // Move to previous input on backspace if current input is empty
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <div className="flex justify-center gap-2">
      {otp.map((data, index) => {
        return (
          <input
            key={index}
            type="text"
            inputMode="numeric"
            maxLength={index === 0 ? length : 1}
            className="w-12 h-14 text-center text-xl font-semibold border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-slate-700 dark:border-slate-600"
            value={data}
            onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange(e.target, index)}
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => handleKeyDown(e, index)}
            onFocus={e => e.target.select()}
            ref={el => { inputRefs.current[index] = el; }}          />
        );
      })}
    </div>
  );
};

export default OtpInput; 