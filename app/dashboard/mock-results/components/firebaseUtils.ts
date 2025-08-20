/**
 * Firebase Data Utilities
 * Functions for fetching and processing data from Firestore
 */

import { doc, getDoc, collection, getDocs, query, where, orderBy } from 'firebase/firestore';

// Fetch available mocks from examControls
export const fetchAvailableMocks = async (db: any): Promise<string[]> => {
  try {
    const availableMocksList: string[] = [];
    
    // Check mock1, mock2, mock3, mock4 from examControls
    const mockKeys = ['mock1', 'mock2', 'mock3', 'mock4'];
    
    for (const mockKey of mockKeys) {
      try {
        const controlDocRef = doc(db, 'examControls', mockKey);
        const docSnap = await getDoc(controlDocRef);
        if (docSnap.exists() && docSnap.data().isReady === true) {
          // Convert mockKey to underscore format for consistency
          const mockKeyFormatted = mockKey.replace('mock', 'mock_');
          availableMocksList.push(mockKeyFormatted);
        }
      } catch (error) {
        console.log(`No examControls found for ${mockKey}`);
      }
    }
    
    // If no mocks are available, fallback to mock_1
    if (availableMocksList.length === 0) {
      availableMocksList.push('mock_1');
    }
    
    return availableMocksList;
  } catch (error) {
    console.error('Error fetching available mocks:', error);
    // Fallback to mock_1 only
    return ['mock_1'];
  }
};

// Fetch exam settings for all mocks
export const fetchExamSettings = async (db: any): Promise<{ [mockName: string]: { [subject: string]: { maxScore: number } } }> => {
  try {
    const allSettings: { [mockName: string]: { [subject: string]: { maxScore: number } } } = {};
    const mockNames = ['mock1', 'mock2', 'mock3', 'mock4'];
    const classTypes = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11A', 'Grade 11E', 'Grade 12', 'Grade 12 Social'];
    
    for (const mockName of mockNames) {
      for (const classType of classTypes) {
        const settingsQuery = query(
          collection(db, "examSettings"),
          where("type", "==", classType),
          where("mock", "==", mockName)
        );
        const settingsSnapshot = await getDocs(settingsQuery);
        
        if (!settingsSnapshot.empty) {
          const mockSettings: { [subject: string]: { maxScore: number } } = {};
          settingsSnapshot.forEach(doc => {
            const data = doc.data();
            mockSettings[data.subject] = { maxScore: data.maxScore };
          });
          
          // Store settings with the class type as suffix to handle different class types
          allSettings[`${mockName}_${classType.replace(/\s+/g, '_')}`] = mockSettings;
        }
      }
    }

    return allSettings;
  } catch (error) {
    console.error('Error fetching exam settings:', error);
    return {};
  }
};

// Fetch students data from mockResults collection
export const fetchStudentsData = async (db: any) => {
  try {
    // Fetch from mockResults collection instead of students
    const studentsQuery = query(
      collection(db, 'mockResults'),
      orderBy('fullName')
    );
    
    const studentsSnapshot = await getDocs(studentsQuery);
    const studentsData: any[] = [];

    studentsSnapshot.forEach((doc) => {
      const data = doc.data();
      const mockResults = data.mockResults || {};
      
      // Calculate total and average scores for each mock
      const totalScores: { [key: string]: number } = {};
      const averageScores: { [key: string]: number } = {};
      
      ['mock_1', 'mock_2', 'mock_3', 'mock_4'].forEach(mockKey => {
        const mockData = mockResults[mockKey];
        if (mockData && typeof mockData === 'object') {
          const scores = Object.values(mockData).filter((score): score is number => 
            typeof score === 'number' && score >= 0
          );
          totalScores[mockKey] = scores.reduce((sum, score) => sum + score, 0);
          averageScores[mockKey] = scores.length > 0 ? totalScores[mockKey] / scores.length : 0;
        }
      });

      studentsData.push({
        id: doc.id,
        fullName: data.fullName || 'N/A',
        studentId: data.studentId || 'N/A',
        phone: data.phone || 'N/A',
        class: data.class || 'N/A',
        shift: data.shift || 'N/A',
        room: data.room || 0,
        roomLabel: data.roomLabel || 'N/A',
        seat: data.seat || 'N/A',
        mockResults: mockResults,
        totalScores,
        averageScores
      });
    });

    return studentsData;
  } catch (error) {
    console.error('Error fetching students data:', error);
    throw new Error('Failed to fetch students data');
  }
};
