"use client";

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useAppSelector } from '@/app/_stores/hooks';
import { db } from '@/firebase-config';
import { doc, getDoc } from 'firebase/firestore';
import Icon from '@/app/_components/Icon';
import { mdiBell } from '@mdi/js';
import NotificationsPanel from './NotificationsPanel';

const StudentTopNav = () => {
    const { studentDocId, authUserName, unreadNotificationCount } = useAppSelector((state) => ({
        studentDocId: state.main.studentDocId,
        authUserName: state.main.userName,
        unreadNotificationCount: state.main.unreadNotificationCount,
    }));
    const [fullName, setFullName] = useState<string | null>(null);
    const [userClass, setUserClass] = useState<string | null>(null);
    const [isPanelVisible, setIsPanelVisible] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchStudentDetails = async () => {
            if (studentDocId) {
                const studentRef = doc(db, 'students', studentDocId);
                const studentSnap = await getDoc(studentRef);

                if (studentSnap.exists()) {
                    const studentData = studentSnap.data();
                    setFullName(studentData.fullName);
                    setUserClass(studentData.class);
                } else {
                    setFullName(authUserName); // Fallback to auth name
                }
            } else {
                 setFullName(authUserName); // Fallback if no doc id
            }
        };

        fetchStudentDetails();
    }, [studentDocId, authUserName]);

    // Close panel when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                setIsPanelVisible(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <nav className="bg-slate-800/90 backdrop-blur-lg shadow-lg border-b border-slate-700/50 relative z-30">
            <div className="max-w-3xl mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center space-x-2">
                        <Image src="/rodwell_logo.png" alt="Logo" width={46} height={46} />
                        <span className="text-lg font-bold text-white">Student Portal</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                        <div className="flex flex-col items-end">
                            {fullName && (
                                <span className="text-base font-semibold text-slate-100 truncate">
                                    {fullName}
                                </span>
                            )}
                            {userClass && (
                                <span className="text-xs text-slate-400 truncate">
                                    {userClass}
                                </span>
                            )}
                        </div>
                        <div ref={panelRef} className="relative">
                            <button onClick={() => setIsPanelVisible(!isPanelVisible)} className="relative text-white">
                                <Icon path={mdiBell} size={24} />
                                {unreadNotificationCount > 0 && (
                                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                                        {unreadNotificationCount}
                                    </span>
                                )}
                            </button>
                            <NotificationsPanel 
                                isVisible={isPanelVisible}
                                onClose={() => setIsPanelVisible(false)}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default StudentTopNav; 