"use client";

import React from 'react';
import { useAppSelector } from '@/app/_stores/hooks';
import { useFirebaseMessaging } from '@/app/_hooks/useFirebaseMessaging';

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
        return <div className="w-11 h-6 bg-slate-700 rounded-full animate-pulse"></div>;
    }

    const isEnabled = permission === 'granted';

    return (
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
    );
};

export default NotificationSettings; 