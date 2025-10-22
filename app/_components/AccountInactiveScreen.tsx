"use client";

import React from 'react';
import Image from 'next/image';
import Icon from './Icon';
import { mdiAccountOff, mdiAlertCircle, mdiInformation } from '@mdi/js';

interface AccountInactiveScreenProps {
  reason?: 'dropped' | 'onBreak' | 'waitlist';
  expectedReturnMonth?: string;
  breakReason?: string;
  waitlistReason?: string;
}

// Simple messages without translation context dependency
const messages = {
  dropped: {
    title: 'Account Inactive',
    message: 'Your account is currently inactive. Please contact the school to reactivate your account.',
    icon: mdiAccountOff,
    color: 'text-red-500',
    bgGradient: 'from-red-900/20 via-pink-900/20 to-red-900/20',
  },
  onBreak: {
    title: 'Account on Break',
    message: 'Your account is currently on break. Please contact the school for more information.',
    icon: mdiInformation,
    color: 'text-yellow-500',
    bgGradient: 'from-yellow-900/20 via-orange-900/20 to-yellow-900/20',
  },
  waitlist: {
    title: 'Account on Waitlist',
    message: 'Your account is currently on the waitlist. You will be notified when a spot becomes available.',
    icon: mdiAlertCircle,
    color: 'text-blue-500',
    bgGradient: 'from-blue-900/20 via-indigo-900/20 to-blue-900/20',
  }
};

export default function AccountInactiveScreen({ 
  reason = 'dropped',
  expectedReturnMonth,
  breakReason,
  waitlistReason 
}: AccountInactiveScreenProps) {
  const reasonInfo = messages[reason];

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 ${reasonInfo.bgGradient}`}>
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-800/50 via-transparent to-slate-800/50 animate-pulse" />
      
      <div className="relative max-w-md mx-4 p-8 bg-slate-800/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-slate-700">
        {/* Icon container */}
        <div className="flex flex-col items-center space-y-6">
          {/* Logo */}
          <div className="relative">
            <div className="absolute inset-0 blur-2xl bg-slate-500/30 animate-pulse rounded-full scale-150" />
            <div className="relative">
              <Image
                src="/rodwell_logo.png"
                alt="Rodwell Portal"
                width={80}
                height={80}
                className="drop-shadow-2xl opacity-50"
                priority
              />
            </div>
          </div>

          {/* Status Icon */}
          <div className={`p-4 rounded-full bg-slate-900/50 ${reasonInfo.color}`}>
            <Icon path={reasonInfo.icon} size={28} />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-white text-center">
            {reasonInfo.title}
          </h1>

          {/* Message */}
          <p className="text-slate-300 text-center leading-relaxed">
            {reasonInfo.message}
          </p>

          {/* Additional Information */}
          {reason === 'onBreak' && (expectedReturnMonth || breakReason) && (
            <div className="w-full mt-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
              {breakReason && (
                <p className="text-sm text-slate-400 mb-2">
                  <span className="font-semibold text-slate-300">
                    Reason:
                  </span>{' '}
                  {breakReason}
                </p>
              )}
              {expectedReturnMonth && (
                <p className="text-sm text-slate-400">
                  <span className="font-semibold text-slate-300">
                    Expected Return:
                  </span>{' '}
                  {expectedReturnMonth}
                </p>
              )}
            </div>
          )}

          {reason === 'waitlist' && waitlistReason && (
            <div className="w-full mt-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
              <p className="text-sm text-slate-400">
                <span className="font-semibold text-slate-300">
                  Reason:
                </span>{' '}
                {waitlistReason}
              </p>
            </div>
          )}

          {/* Contact Information */}
          <div className="mt-6 text-center text-sm text-slate-400">
            <p>Please contact the school for assistance</p>
            <p className="mt-2 text-xs text-slate-500">
              You cannot perform any actions while your account is inactive
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
