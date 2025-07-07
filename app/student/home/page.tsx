"use client";

import React from 'react';
import { useAppSelector } from '../../_stores/hooks';
import CardBox from '@/app/_components/CardBox';
import Image from 'next/image';

const StudentHomePage = () => {
    const studentName = useAppSelector((state) => state.main.userName);
    const studentAvatar = useAppSelector((state) => state.main.userAvatar);

    return (
        <div className="space-y-6">
            <CardBox className="text-center p-6 bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
                {studentAvatar && (
                    <Image 
                        src={studentAvatar} 
                        alt="User Avatar"
                        width={80}
                        height={80}
                        className="rounded-full mx-auto mb-4 border-4 border-slate-700"
                    />
                )}
                <h1 className="text-2xl font-bold text-white">
                    Welcome, <span className="text-company-purple">{studentName || 'Student'}!</span>
                </h1>
                <p className="text-slate-400 mt-2">
                    Select an option from the menu below to get started.
                </p>
            </CardBox>

            <div className="p-4 text-center">
                <p className="text-slate-500">
                    This is your student portal. You can view your mock exam results, 
                    check your attendance, and manage your account settings.
                </p>
            </div>
        </div>
    );
};

export default StudentHomePage; 