"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useAppSelector } from '@/app/_stores/hooks';
import { db } from '@/firebase-config';
import { doc, getDoc } from 'firebase/firestore';

const StudentTopNav = () => {
    const studentDocId = useAppSelector((state) => state.main.studentDocId);
    const authUserName = useAppSelector((state) => state.main.userName);
    const [fullName, setFullName] = useState<string | null>(null);
    const [userClass, setUserClass] = useState<string | null>(null);

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

    return (
        <nav className="z-30 bg-slate-900/80 backdrop-blur-lg shadow-md">
            <div className="max-w-4xl mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center space-x-2">
                        <Image src="/rodwell_logo.png" alt="Logo" width={40} height={40} />
                        <span className="text-lg font-bold text-white">Student Portal</span>
                    </div>
                    
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
                </div>
            </div>
        </nav>
    );
};

export default StudentTopNav; 