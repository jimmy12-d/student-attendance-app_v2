"use client";

// Force dynamic rendering - this page uses real-time Firebase listeners
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../../../firebase-config';
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  onSnapshot, 
  query, 
  orderBy, 
  doc, 
  deleteDoc,
  Timestamp,
  getDocs
} from 'firebase/firestore';

// UI Components
import SectionMain from '../../_components/Section/Main';
import SectionTitleLineWithButton from '../../_components/Section/TitleLineWithButton';
import CardBox from '../../_components/CardBox';
import Button from '../../_components/Button';
import FormField from '../../_components/FormField';
import CustomMultiSelectDropdown, { MultiSelectOption } from '../_components/CustomMultiSelectDropdown';
import { mdiBellRing, mdiTrashCan, mdiEyeOutline, mdiEyeOffOutline, mdiEarth, mdiGoogleClassroom, mdiAccount } from '@mdi/js';
import Icon from '../../_components/Icon';
import { toast } from 'sonner';


type Notification = {
    id: string;
    title: string;
    body: string;
    link?: string;
    targetType: 'all' | 'class' | 'user';
    targetValue: string | string[]; // 'all_students', 'Grade 12A', or student_auth_uid
    createdAt: Timestamp; 
    readCount: number;
    totalRecipients?: number;
};

type Student = {
    id: string;
    fullName: string;
    authUid: string;
    class?: string;
};

const NotificationManager = () => {
    // Form State
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [link, setLink] = useState('');
    const [targetType, setTargetType] = useState<'all' | 'class' | 'user'>('all');
    const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Data State
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [allClasses, setAllClasses] = useState<MultiSelectOption[]>([]);
    const [allStudents, setAllStudents] = useState<Student[]>([]);
    const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);
    const [isDataLoading, setIsDataLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const studentSearchRef = useRef<HTMLDivElement>(null);

    const targetOptions = [
        { value: 'all' as const, label: 'All Students', icon: mdiEarth },
        { value: 'class' as const, label: 'By Class', icon: mdiGoogleClassroom },
        { value: 'user' as const, label: 'By Student', icon: mdiAccount },
    ];

    // --- DATA FETCHING ---
    useEffect(() => {
        const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const fetchedNotifications = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
            setNotifications(fetchedNotifications);
            setIsLoadingNotifications(false);
        }, (err) => {
            console.error("Error fetching notifications: ", err);
            setError('Failed to fetch notifications.');
            setIsLoadingNotifications(false);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const fetchAuxiliaryData = async () => {
            try {
                const classesQuery = getDocs(collection(db, 'classes'));
                const studentsQuery = getDocs(query(collection(db, "students"), orderBy("fullName", "asc")));

                const [classesSnapshot, studentsSnapshot] = await Promise.all([classesQuery, studentsQuery]);

                const classOptions = classesSnapshot.docs
                    .map(doc => ({ value: doc.data().name, label: doc.data().name }))
                    .sort((a, b) => a.label.localeCompare(b.label));
                setAllClasses(classOptions);

                const studentsData = studentsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    fullName: doc.data().fullName,
                    authUid: doc.data().authUid,
                    class: doc.data().class,
                } as Student));
                setAllStudents(studentsData);

            } catch (error) {
                console.error("Error fetching class/student data: ", error);
                setError("Failed to load required data for targeting.");
            } finally {
                setIsDataLoading(false);
            }
        };

        fetchAuxiliaryData();
    }, []);

    // --- FORM LOGIC ---
    const resetForm = () => {
        setTitle('');
        setBody('');
        setLink('');
        setTargetType('all');
        setSelectedClasses([]);
        setSelectedStudents([]);
    };

    const handleCreateNotification = async (e: React.FormEvent) => {
        e.preventDefault();
        
        let finalTargetValue: string | string[] = 'all_students';
        let isTargetValid = true;

        if (targetType === 'all') {
            finalTargetValue = 'all_students';
        } else if (targetType === 'class') {
            if (selectedClasses.length === 0) isTargetValid = false;
            else finalTargetValue = selectedClasses;
        } else if (targetType === 'user') {
            if (selectedStudents.length === 0) isTargetValid = false;
            else finalTargetValue = selectedStudents;
        }

        if (!title.trim() || !body.trim() || !isTargetValid) {
            alert('Title, body, and a valid target are required.');
            return;
        }
        
        setIsSubmitting(true);
        try {
            await addDoc(collection(db, 'notifications'), {
                title, body,
                link: link.trim(),
                targetType,
                targetValue: finalTargetValue,
                totalRecipients: liveTargetCount,
                createdAt: serverTimestamp(),
                readCount: 0
            });
            toast.success('Notification sent successfully!');
            resetForm();
        } catch (err) {
            console.error("Error creating notification: ", err);
            alert('Failed to create notification.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- RENDER LOGIC ---
    const getStudentNameByUid = (uid: string) => allStudents.find(s => s.authUid === uid)?.fullName || uid;

    const renderTargetValue = (notif: Notification) => {
        if (notif.targetType === 'all') return 'All Students';
        
        const targetValues = Array.isArray(notif.targetValue) ? notif.targetValue : [notif.targetValue];

        if (notif.targetType === 'class') {
            return `Class: ${targetValues.join(', ')}`;
        }
        
        if (notif.targetType === 'user') {
            const count = targetValues.length;
            if (count <= 2) {
                return `User: ${targetValues.map(uid => getStudentNameByUid(uid)).join(', ')}`;
            }
            return `Users: ${count} selected`;
        }
        return 'Unknown';
    };
    
    const handleDeleteNotification = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this notification?')) {
            try {
                await deleteDoc(doc(db, 'notifications', id));
            } catch (err) {
                console.error("Error deleting notification: ", err);
                alert('Failed to delete notification.');
            }
        }
    };

    const studentOptions = useMemo(() => 
        allStudents.map(s => ({ value: s.authUid, label: s.fullName })), 
        [allStudents]
    );

    const studentNameMap = useMemo(() => {
        const map = new Map<string, string>();
        allStudents.forEach(s => map.set(s.authUid, s.fullName));
        return map;
    }, [allStudents]);

    const liveTargetCount = useMemo(() => {
        if (isDataLoading) return null;
        switch (targetType) {
            case 'all': return allStudents.length;
            case 'class': return allStudents.filter(s => selectedClasses.includes(s.class ?? '')).length;
            case 'user': return selectedStudents.length;
            default: return 0;
        }
    }, [targetType, selectedClasses, selectedStudents, allStudents, isDataLoading]);

    return (
        <SectionMain>
            <SectionTitleLineWithButton icon={mdiBellRing} title="Notification Manager" main />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <CardBox>
                        <form onSubmit={handleCreateNotification} className="flex flex-col h-full p-4">
                            <h2 className="text-xl font-semibold mb-4">Create Notification</h2>
                            <div className="space-y-6 flex-grow">
                                <FormField label="Title" labelFor='title'>
                                    {(fd) => <input type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)} required className={`${fd.className} font-bold`}/>}
                                </FormField>
                                <FormField label="Body" labelFor='body'>
                                    {(fd) => <textarea id="body" value={body} onChange={(e) => setBody(e.target.value)} required rows={4} className={fd.className}/>}
                                </FormField>
                                <FormField label="Link (Optional)" labelFor='link'>
                                    {(fd) => <input type="text" id="link" value={link} onChange={(e) => setLink(e.target.value)} placeholder="/student/schedule" className={fd.className}/>}
                                </FormField>
                                <FormField
                                    label="Target"
                                    help={liveTargetCount !== null ? `${liveTargetCount} students will be notified` : 'Calculating...'}
                                >
                                    {() => (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-3 gap-3">
                                                {targetOptions.map(option => (
                                                    <div
                                                        key={option.value}
                                                        onClick={() => setTargetType(option.value)}
                                                        className={`
                                                            flex flex-col items-center justify-center p-3 rounded-lg border-2 
                                                            cursor-pointer transition-all duration-200 text-center
                                                            ${
                                                                targetType === option.value
                                                                ? 'bg-company-purple border-company-purple-dark text-white shadow-lg'
                                                                : 'bg-gray-100 dark:bg-slate-700/60 border-transparent text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500'
                                                            }
                                                        `}
                                                    >
                                                        <Icon path={option.icon} size={24} className="mb-1" />
                                                        <span className="text-xs font-semibold">{option.label}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            
                                            {targetType === 'class' && (
                                                <CustomMultiSelectDropdown
                                                    id="class-select"
                                                    options={allClasses}
                                                    selectedValues={selectedClasses}
                                                    onChange={setSelectedClasses}
                                                    placeholder="Select classes..."
                                                />
                                            )}
                                            
                                            {targetType === 'user' && (
                                                <CustomMultiSelectDropdown
                                                    id="student-select"
                                                    options={studentOptions}
                                                    selectedValues={selectedStudents}
                                                    onChange={setSelectedStudents}
                                                    placeholder="Select students..."
                                                />
                                            )}
                                        </div>
                                    )}
                                </FormField>
                            </div>
                            <div className="mt-6">
                                <Button type="submit" label={isSubmitting ? 'Sending...' : 'Send Notification'} color="info" disabled={isSubmitting} className="w-full" />
                            </div>
                        </form>
                    </CardBox>
                </div>

                <div className="lg:col-span-2">
                    <CardBox>
                        <h2 className="text-xl font-semibold mb-4 p-6">Sent Notifications</h2>
                        {isLoadingNotifications || isDataLoading ? (
                            <p className="text-center p-8">Loading notifications...</p>
                        ) : error ? (
                            <p className="text-red-500 text-center p-8">{error}</p>
                        ) : (
                            <div className="space-y-3 max-h-[75vh] overflow-y-auto px-6 pb-6">
                                {notifications.length === 0 && <p className="text-center text-gray-500 py-8">No notifications sent yet.</p>}
                                {notifications.map(notif => {
                                    const unreadCount = (notif.totalRecipients ?? 0) - notif.readCount;
                                    return (
                                    <div key={notif.id} className="bg-white dark:bg-slate-800/50 p-4 rounded-lg flex flex-col border dark:border-slate-700 hover:border-slate-600 transition">
                                        <div className="flex justify-between items-start w-full">
                                            <div className="flex-1 pr-4">
                                                <h3 className="font-bold text-gray-800 dark:text-slate-100">{notif.title}</h3>
                                                <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">{notif.body}</p>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <div className="flex items-center justify-end gap-1.5 text-sm">
                                                    <Icon path={mdiEyeOutline} w="w-4 h-4" className="text-emerald-500"/>
                                                    <span className="font-semibold text-emerald-500">{notif.readCount}</span>
                                                    <span className="text-gray-400 text-xs">Reads</span>
                                                </div>
                                                 <div className="flex items-center justify-end gap-1.5 text-sm mt-1">
                                                    <Icon path={mdiEyeOffOutline} w="w-4 h-4" className="text-amber-500"/>
                                                    <span className="font-semibold text-amber-500">{unreadCount < 0 ? 0 : unreadCount}</span>
                                                    <span className="text-gray-400 text-xs">Unread</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="w-full border-t dark:border-slate-700 my-3"></div>
                                        <div className="flex justify-between items-end w-full">
                                             <div className="text-xs text-gray-500 dark:text-slate-400 space-y-1">
                                                <div>
                                                    <span className="font-semibold">Target:</span>
                                                    <span className="font-mono bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded ml-1">{renderTargetValue(notif)}</span>
                                                </div>
                                                {notif.link && 
                                                    <div>
                                                        <span className="font-semibold">Link:</span>
                                                        <span className="font-mono bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded ml-1">{notif.link}</span>
                                                    </div>
                                                }
                                                 <div className="text-gray-400 dark:text-slate-500 mt-1">
                                                    Sent: {notif.createdAt?.toDate().toLocaleString()}
                                                </div>
                                             </div>
                                            <Button color="danger" icon={mdiTrashCan} onClick={() => handleDeleteNotification(notif.id)} small outline/>
                                        </div>
                                    </div>
                                )})}
                            </div>
                        )}
                    </CardBox>
                </div>
            </div>
        </SectionMain>
    );
}

export default NotificationManager;

