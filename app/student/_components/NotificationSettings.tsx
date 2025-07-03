"use client";

import React from 'react';
import { useAppSelector } from '@/app/_stores/hooks';
import { useFirebaseMessaging } from '@/app/_hooks/useFirebaseMessaging';
import Icon from '@/app/_components/Icon';
import { mdiBell, mdiBellOff } from '@mdi/js';

const NotificationSettings = () => {
    const userUid = useAppSelector((state) => state.main.userUid);
    const { permission, requestPermission } = useFirebaseMessaging(userUid ?? null);

    const handleToggle = () => {
        if (permission !== 'granted') {
            requestPermission();
        } else {
            // Note: Browsers do not allow sites to programmatically REVOKE permission.
            // The user must do this manually in their browser settings.
            // We can guide them on how to do this.
            alert("To disable notifications, you need to go to your browser settings for this site and block notifications.");
        }
    };
    
    if (permission === 'loading') {
        return <div className="h-10 bg-slate-700/50 rounded-lg animate-pulse"></div>;
    }

    const isEnabled = permission === 'granted';

    return (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 flex justify-between items-center">
            <div>
                <h3 className="font-semibold text-base text-slate-100">Push Notifications</h3>
                <p className="text-sm text-slate-400">Receive alerts for announcements and updates.</p>
            </div>
            <div className="flex items-center gap-4">
                 <span className={`text-xs font-bold ${isEnabled ? 'text-green-400' : 'text-slate-500'}`}>
                    {isEnabled ? 'Enabled' : 'Disabled'}
                </span>
                <button
                    onClick={handleToggle}
                    className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${
                        isEnabled ? 'bg-company-purple' : 'bg-slate-600'
                    }`}
                >
                    <span
                        className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
                            isEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                    />
                </button>
            </div>
        </div>
    );
};

export default NotificationSettings; 