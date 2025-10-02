"use client";

import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/_stores/hooks';
import { setNotifications, markNotificationAsRead, markAllNotificationsAsRead, AppNotification } from '@/app/_stores/mainSlice';
import { db } from '@/firebase-config';
import { collection, query, where, getDocs, doc, setDoc, writeBatch, QuerySnapshot, DocumentData, orderBy, onSnapshot } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { usePWANavigation } from '@/app/_hooks/usePWANavigation';
import Icon from '@/app/_components/Icon';
import { mdiCheckAll } from '@mdi/js';
import TimeAgo from 'react-timeago';

const NotificationSkeleton = () => (
    <div className="p-3 border-b border-slate-700/50">
        <div className="animate-pulse flex items-start space-x-4">
            <div className="flex-1 space-y-3 py-1">
                <div className="h-3 bg-slate-700 rounded w-3/4"></div>
                <div className="space-y-2">
                    <div className="h-2 bg-slate-700 rounded"></div>
                    <div className="h-2 bg-slate-700 rounded w-5/6"></div>
                </div>
                 <div className="h-2 bg-slate-700 rounded w-1/4"></div>
            </div>
        </div>
    </div>
);


const NotificationsPanel = ({ isVisible, onClose }: { isVisible: boolean, onClose: () => void }) => {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const { navigateWithinPWA } = usePWANavigation();
    const { notifications, userUid, unreadNotificationCount, studentClassType } = useAppSelector((state) => ({
        notifications: state.main.notifications,
        userUid: state.main.userUid,
        unreadNotificationCount: state.main.unreadNotificationCount,
        studentClassType: state.main.studentClassType,
    }));
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchNotifications = async () => {
            if (!userUid) {
                dispatch(setNotifications([]));
                return;
            };

            setIsLoading(true);

            const notificationPromises: Promise<QuerySnapshot<DocumentData>>[] = [];

            // Query for notifications targeted at the specific user
            const userQuery = query(
                collection(db, "notifications"), 
                where('targetType', '==', 'user'), 
                where('targetValue', 'array-contains', userUid),
                orderBy('createdAt', 'desc')
            );
            notificationPromises.push(getDocs(userQuery));
            
            // Query for notifications targeted at everyone
            const allUsersQuery = query(
                collection(db, "notifications"), 
                where('targetType', '==', 'all'),
                where('targetValue', '==', 'all_students'),
                orderBy('createdAt', 'desc')
            );
            notificationPromises.push(getDocs(allUsersQuery));

            // Query for notifications targeted at the user's class
            if (studentClassType) {
                const classQuery = query(
                    collection(db, "notifications"), 
                    where('targetType', '==', 'class'), 
                    where('targetValue', 'array-contains', studentClassType),
                    orderBy('createdAt', 'desc')
                );
                notificationPromises.push(getDocs(classQuery));
            }

            try {
                const snapshots = await Promise.all(notificationPromises);
                
                const fetchedNotificationsMap = new Map<string, AppNotification>();

                snapshots.forEach(snapshot => {
                    snapshot.forEach(doc => {
                        if (!fetchedNotificationsMap.has(doc.id)) {
                            fetchedNotificationsMap.set(doc.id, { id: doc.id, ...doc.data() } as AppNotification);
                        }
                    });
                });

                // Check read status
                const userNotifsRef = collection(db, `users/${userUid}/notifications`);
                const readStatusSnapshot = await getDocs(userNotifsRef);
                const readIds = new Set(readStatusSnapshot.docs.map(d => d.id));

                const finalNotifications = Array.from(fetchedNotificationsMap.values()).map(n => ({
                    ...n,
                    isRead: readIds.has(n.id)
                }));

                // Sort by creation date
                const sortedNotifications = finalNotifications.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());

                dispatch(setNotifications(sortedNotifications));
            } catch (error) {
                console.error("Failed to fetch notifications:", error);
                // Optionally dispatch an action to show an error state
            } finally {
                setIsLoading(false);
            }
        };

        // Set up real-time listener - ALWAYS active, not just when panel is open
        if (userUid) {
            const notificationQueries: any[] = [];
            
            // Real-time listener for user-specific notifications
            notificationQueries.push(
                query(
                    collection(db, "notifications"), 
                    where('targetType', '==', 'user'), 
                    where('targetValue', 'array-contains', userUid)
                )
            );
            
            // Real-time listener for all students notifications
            notificationQueries.push(
                query(
                    collection(db, "notifications"), 
                    where('targetType', '==', 'all'),
                    where('targetValue', '==', 'all_students')
                )
            );

            // Real-time listener for class notifications
            if (studentClassType) {
                notificationQueries.push(
                    query(
                        collection(db, "notifications"), 
                        where('targetType', '==', 'class'), 
                        where('targetValue', 'array-contains', studentClassType)
                    )
                );
            }

            const unsubscribes = notificationQueries.map(q => 
                onSnapshot(q, (snapshot) => {
                    console.log('[NotificationsPanel] Notification change detected, refreshing...');
                    // Refresh notifications when any changes occur
                    fetchNotifications();
                }, (error) => {
                    console.error("Error listening to notifications:", error);
                })
            );

            // Initial fetch
            fetchNotifications();

            return () => {
                unsubscribes.forEach(unsubscribe => unsubscribe());
            };
        }
    }, [userUid, studentClassType, dispatch]); // Removed isVisible from dependencies
    
    const markSingleNotificationAsRead = async (notification: AppNotification) => {
        if (!userUid || notification.isRead) return;

        // Optimistically update UI
        dispatch(markNotificationAsRead(notification.id));
        
        // Update backend using set with merge to ensure doc is created
        await setDoc(doc(db, `users/${userUid}/notifications`, notification.id), {
            isRead: true,
        }, { merge: true });
    };

    const handleNotificationClick = async (notification: AppNotification) => {
        await markSingleNotificationAsRead(notification);
        if (notification.link) {
            navigateWithinPWA(notification.link);
        }
        onClose();
    };
    
    const handleMarkAsReadClick = (e: React.MouseEvent, notification: AppNotification) => {
        e.stopPropagation();
        markSingleNotificationAsRead(notification);
    };

    const handleMarkAllAsRead = async () => {
        if (!userUid || unreadNotificationCount === 0) return;

        const batch = writeBatch(db);
        const unread = notifications.filter(n => !n.isRead);
        
        unread.forEach(notif => {
            const notifRef = doc(db, `users/${userUid}/notifications`, notif.id);
            batch.set(notifRef, { isRead: true }, { merge: true });
        });

        await batch.commit();
        dispatch(markAllNotificationsAsRead());
    };

    if (!isVisible) return null;

    return (
        <div className="absolute top-16 right-0 w-80 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl z-50 text-white">
            <div className="p-3 flex justify-between items-center border-b border-slate-700">
                <h3 className="font-bold">Notifications</h3>
                {unreadNotificationCount > 0 && (
                    <button onClick={handleMarkAllAsRead} className="text-xs text-company-purple hover:underline flex items-center gap-1">
                        <Icon path={mdiCheckAll} size={16} />
                        Mark all as read
                    </button>
                )}
            </div>
            <div className="max-h-96 overflow-y-auto">
                {isLoading ? (
                    <>
                        <NotificationSkeleton />
                        <NotificationSkeleton />
                        <NotificationSkeleton />
                    </>
                ) : notifications.length === 0 ? (
                    <p className="text-center text-slate-400 py-8">No new notifications.</p>
                ) : (
                    notifications.map(notif => (
                        <div key={notif.id} onClick={() => handleNotificationClick(notif)}
                             className={`p-3 border-b border-slate-700/50 cursor-pointer hover:bg-slate-700/50 ${!notif.isRead ? 'bg-slate-700' : ''}`}>
                            <div className="flex justify-between items-start">
                                <p className="font-semibold text-sm flex-grow pr-2">{notif.title}</p>
                                {!notif.isRead && (
                                    <button 
                                        onClick={(e) => handleMarkAsReadClick(e, notif)}
                                        className="p-2 -mr-2 -mt-1 ml-2 group"
                                        aria-label="Mark as read"
                                    >
                                        <div className="w-3 h-3 bg-company-purple rounded-full transition-transform group-hover:scale-125"></div>
                                    </button>
                                )}
                            </div>
                            <p className="text-xs text-slate-300 mt-1">{notif.body}</p>
                            <p className="text-xs text-slate-500 mt-2">
                                <TimeAgo date={notif.createdAt.toDate()} live={false} />
                            </p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default NotificationsPanel; 