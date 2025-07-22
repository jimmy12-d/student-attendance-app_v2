"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { mdiClipboardListOutline } from '@mdi/js';
import { db } from '../../../firebase-config';
import { collection, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import SectionMain from '../../_components/Section/Main';
import SectionTitleLineWithButton from '../../_components/Section/TitleLineWithButton';
import CardBox from '../../_components/CardBox';

// Define types for our data
type ExamSetting = {
  id: string;
  type: string;
  mock: string;
  subject: string;
  maxScore: number;
};

type GroupedSetting = {
  type: string;
  maxScore: number;
  subjects: string[];
}

type NavSettings = {
  [key: string]: boolean;
};

const MockExamManagementPage = () => {
  const [settings, setSettings] = useState<ExamSetting[]>([]);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isMock3Published, setIsMock3Published] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [navSettings, setNavSettings] = useState<NavSettings>({});
  const [isUpdatingNav, setIsUpdatingNav] = useState(false);
  const [isLoadingNav, setIsLoadingNav] = useState(true);


  // Define the relabeling map, same as in the student dashboard
  const SOCIAL_STUDIES_LABELS: { [key: string]: string } = useMemo(() => ({
    math: 'Khmer',
    khmer: 'Math',
    chemistry: 'History',
    physics: 'Moral',
    biology: 'Geometry',
    history: 'Earth',
    english: 'English',
  }), []);

  // Fetch all exam settings and the mock 3 status
  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingSettings(true);
      setError(null);
      try {
        // Fetch settings
        const settingsCollection = collection(db, 'examSettings');
        const settingsSnapshot = await getDocs(settingsCollection);
        const settingsList = settingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExamSetting));
        setSettings(settingsList);

        // Fetch mock 3 status
        const controlDocRef = doc(db, 'examControls', 'mock3');
        const docSnap = await getDoc(controlDocRef);
        if (docSnap.exists()) {
          setIsMock3Published(docSnap.data().isPublished);
        }
      } catch (err) {
        console.error("Error fetching page data:", err);
        setError("Failed to load page data. Please check console for details.");
      }
      setIsLoadingSettings(false);
    };

    const fetchNavSettings = async () => {
      setIsLoadingNav(true);
      try {
        const navSettingsRef = doc(db, 'appSettings', 'studentBottomNav');
        const docSnap = await getDoc(navSettingsRef);
        if (docSnap.exists() && docSnap.data().navItems) {
          setNavSettings(docSnap.data().navItems);
        } else {
          // Default settings if not present
          setNavSettings({
            'Home': true,
            'Attendance': true,
            'Mock Exam': true,
            'Account': true,
          });
        }
      } catch (err) {
        console.error("Error fetching nav settings:", err);
        setError((prev) => (prev ? `${prev} & Failed to load navigation settings.` : "Failed to load navigation settings."));
      }
      setIsLoadingNav(false);
    };

    fetchData();
    fetchNavSettings();
  }, []);

  const handleToggleMock3 = async () => {
    setIsUpdating(true);
    const newStatus = !isMock3Published;
    try {
      const controlDocRef = doc(db, 'examControls', 'mock3');
      await setDoc(controlDocRef, { isPublished: newStatus }, { merge: true });
      setIsMock3Published(newStatus);
    } catch (error) {
      console.error("Failed to update Mock 3 status:", error);
      setError("Failed to update status. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleNavItem = async (itemName: string) => {
    setIsUpdatingNav(true);
    const newSettings = { ...navSettings, [itemName]: !navSettings[itemName] };
    
    try {
      const navSettingsRef = doc(db, 'appSettings', 'studentBottomNav');
      await setDoc(navSettingsRef, { navItems: newSettings }, { merge: true });
      setNavSettings(newSettings);
    } catch (error) {
      console.error(`Failed to update ${itemName} status:`, error);
      setError("Failed to update navigation settings. Please try again.");
    } finally {
      setIsUpdatingNav(false);
    }
  };


  // Group settings by mock exam, then by type and maxScore
  const groupedSettings = useMemo(() => {
    const byMock = settings.reduce((acc, setting) => {
      const mockKey = setting.mock || 'undefined';
      if (!acc[mockKey]) {
        acc[mockKey] = [];
      }
      acc[mockKey].push(setting);
      return acc;
    }, {} as { [key: string]: ExamSetting[] });

    // This object will hold the final, grouped data structure.
    const finalGrouped: { [key: string]: GroupedSetting[] } = {};

    Object.keys(byMock).forEach(mockKey => {
      const settingsForMock = byMock[mockKey];
      const groupedByCriteria = settingsForMock.reduce((acc, setting) => {
        const groupKey = `${setting.type}|${setting.maxScore}`;
        if (!acc[groupKey]) {
          acc[groupKey] = {
            type: setting.type,
            maxScore: setting.maxScore,
            subjects: [],
          };
        }
        acc[groupKey].subjects.push(setting.subject);
        return acc;
      }, {} as { [key: string]: GroupedSetting });
      
      finalGrouped[mockKey] = Object.values(groupedByCriteria);
    });

    return finalGrouped;
  }, [settings]);

  const mockOrder = ['mock3', 'mock2', 'mock1'];
  const toggleableNavItems = ['Attendance', 'Mock Exam'];


  return (
    <SectionMain>
      <SectionTitleLineWithButton icon={mdiClipboardListOutline} title="Mock Exam Management" main />
      
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6">{error}</div>}

      <CardBox className="mb-6 p-2">
        <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Publish Mock 3 Results</h2>
        <div className="flex items-center">
          <label htmlFor="toggle-mock3" className="flex items-center cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                id="toggle-mock3"
                className="sr-only"
                checked={isMock3Published}
                onChange={handleToggleMock3}
                disabled={isUpdating}
              />
              <div className={`block w-14 h-8 rounded-full ${isMock3Published ? 'bg-indigo-600' : 'bg-gray-600'}`}></div>
              <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${isMock3Published ? 'translate-x-6' : ''}`}></div>
            </div>
            <div className="ml-3 text-gray-700 dark:text-gray-300 font-medium">
              {isMock3Published ? 'Published' : 'Unpublished'}
            </div>
          </label>
          {isUpdating && <div className="ml-4 text-sm text-gray-500 animate-pulse">Updating...</div>}
        </div>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          When published, students will be able to see their Mock 3 exam results.
        </p>
      </CardBox>

      <CardBox className="mb-6 p-4">
        <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Student Navigation</h2>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          Control which pages appear in the student's bottom navigation bar.
        </p>
        {isLoadingNav ? (
          <div className="text-center p-4">Loading settings...</div>
        ) : (
          <div className="space-y-4">
            {toggleableNavItems.map((itemName) => (
              <div key={itemName} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800/50 rounded-lg">
                <span className="font-medium text-gray-800 dark:text-gray-200">{itemName}</span>
                <label htmlFor={`toggle-${itemName}`} className="flex items-center cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      id={`toggle-${itemName}`}
                      className="sr-only"
                      checked={navSettings[itemName] ?? false}
                      onChange={() => handleToggleNavItem(itemName)}
                      disabled={isUpdatingNav}
                    />
                    <div className={`block w-14 h-8 rounded-full transition-colors ${navSettings[itemName] ? 'bg-indigo-600' : 'bg-gray-600'}`}></div>
                    <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${navSettings[itemName] ? 'translate-x-6' : ''}`}></div>
                  </div>
                </label>
              </div>
            ))}
            {isUpdatingNav && <div className="text-sm text-gray-500 animate-pulse text-center pt-2">Updating...</div>}
          </div>
        )}
      </CardBox>

      {isLoadingSettings ? (
        <CardBox><p className="text-center p-4">Loading settings...</p></CardBox>
      ) : (
        mockOrder.map(mockKey => (
          groupedSettings[mockKey] && (
            <CardBox key={mockKey} className="mb-6" hasTable>
              <h2 className="text-xl font-bold p-4 text-gray-800 dark:text-white">Mock {mockKey.replace('mock', '')} Settings</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-slate-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Class Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Subjects</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Max Score per Subject</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-gray-800">
                    {groupedSettings[mockKey].map((group, index) => (
                      <tr key={`${mockKey}-${index}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{group.type}</td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300">
                          {group.subjects.map(subject => {
                            const label = group.type === 'Grade 12S'
                              ? SOCIAL_STUDIES_LABELS[subject.toLowerCase()] || subject
                              : subject;
                            return label.charAt(0).toUpperCase() + label.slice(1);
                          }).join(', ')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{group.maxScore}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBox>
          )
        ))
      )}
    </SectionMain>
  );
};

export default MockExamManagementPage; 