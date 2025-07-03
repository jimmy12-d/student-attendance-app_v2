"use client";

import React, { useState, useEffect } from 'react';
import { useAppSelector } from '@/app/_stores/hooks';
import { useFirebaseMessaging } from '@/app/_hooks/useFirebaseMessaging';
import Icon from '@/app/_components/Icon';
import { mdiBellRing, mdiClose } from '@mdi/js';
import Button from '@/app/_components/Button';
import { usePromptManager } from '@/app/_hooks/usePromptManager';

const NotificationPermissionPrompt = () => {
    const userUid = useAppSelector((state) => state.main.userUid);
    const { permission, requestPermission } = useFirebaseMessaging(userUid ?? null);
    const [isVisible, setIsVisible] = useState(false);
    const { activePrompt, setActivePrompt } = usePromptManager();

    useEffect(() => {
        if (permission === 'default' && !activePrompt) {
            const hasBeenPrompted = localStorage.getItem('notificationPrompted');
            if (!hasBeenPrompted) {
                const timer = setTimeout(() => {
                    setIsVisible(true);
                    setActivePrompt('notification');
                }, 3000); 
                return () => clearTimeout(timer);
            }
        }
    }, [permission, activePrompt, setActivePrompt]);

    const handleAllow = async () => {
        await requestPermission();
        setIsVisible(false);
        setActivePrompt(null);
        localStorage.setItem('notificationPrompted', 'true');
    };

    const handleDismiss = () => {
        setIsVisible(false);
        setActivePrompt(null);
        localStorage.setItem('notificationPrompted', 'true');
    };

    if (!isVisible) {
        return null;
    }

    return (
        <div className="fixed bottom-4 right-4 max-w-sm w-full bg-slate-800 border border-slate-700/80 shadow-2xl rounded-xl p-5 z-50 text-white animate-fade-in-up">
            <div className="flex items-start">
                <div className="flex-shrink-0 bg-company-purple/20 text-company-purple p-3 rounded-full mr-4">
                    <Icon path={mdiBellRing} size={24} />
                </div>
                <div className="flex-grow">
                    <h3 className="font-bold text-lg mb-1">Get Notified</h3>
                    <p className="text-slate-300 text-sm">
                        Enable push notifications to receive important updates, announcements, and reminders instantly.
                    </p>
                    <div className="mt-5 flex gap-3">
                        <Button
                            label="Enable Notifications"
                            color="contrast"
                            onClick={handleAllow}
                            small
                        />
                        <Button
                            label="Not Now"
                            color="white"
                            onClick={handleDismiss}
                            outline
                            small
                        />
                    </div>
                </div>
                <button onClick={handleDismiss} className="-mt-2 -mr-2 p-2 text-slate-400 hover:text-white">
                    <Icon path={mdiClose} size={20} />
                </button>
            </div>
        </div>
    );
};

export default NotificationPermissionPrompt; 