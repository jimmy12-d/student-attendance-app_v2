// app/_stores/mainSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Define the User type to allow for null values, as Firebase User properties can be null
export interface User {
  name: string | null;
  email: string | null;
  avatar: string | null;
  uid?: string; // Optional: Store Firebase UID if needed
  studentDocId?: string; // Firestore document ID from 'students' collection
  role?: 'admin' | 'student'; // Add role property
}

// Define types for mock exam data
type ExamSettings = { [subject: string]: { maxScore: number } };
type ExamScores = { [subject: string]: number };

export interface ExamSettingsData {
  settings: ExamSettings;
  lastFetched: string; // ISO string to track cache age
}

export interface MockExamData {
  scores: ExamScores;
  lastFetched: string; // ISO string to track cache age
}

export interface ProgressData {
  status: string;
  seat: string | null;
  phone: string | null;
  lastFetched: string;
}

export interface MainState {
  userName: string | null;
  userEmail: string | null;
  userAvatar: string | null;
  userUid?: string | null; // Optional: For Firebase UID
  studentDocId?: string | null; // Firestore document ID
  userRole?: 'admin' | 'student' | null; // Add role to state
  isFieldFocusRegistered: boolean;
  mockExamCache: {
    [examName: string]: MockExamData;
  };
  mockExamSettingsCache: {
    [settingsKey: string]: ExamSettingsData; // e.g. key: "science-mock1"
  };
  progressCache: {
    [studentId: string]: ProgressData;
  };
  // You might add an isAuthenticated flag here, updated by onAuthStateChanged,
  // but usually checking userName or userUid is sufficient.
}

const initialState: MainState = {
  /* User */
  userName: null, // Default to null, indicating no user logged in
  userEmail: null,
  userAvatar: null,
  userUid: null,
  studentDocId: null,
  userRole: null, // Default role to null
  mockExamCache: {},
  mockExamSettingsCache: {},
  progressCache: {},

  /* Field focus with ctrl+k (to register only once) */
  isFieldFocusRegistered: false,
};

export const mainSlice = createSlice({
  name: 'main',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User | null>) => { // Allow setting user to null on logout
      if (action.payload) {
        state.userName = action.payload.name;
        state.userEmail = action.payload.email;
        state.userAvatar = action.payload.avatar;
        state.userUid = action.payload.uid; // Store UID if provided
        state.studentDocId = action.payload.studentDocId;
        state.userRole = action.payload.role; // Store role
      } else {
        // Reset user state on logout
        state.userName = null;
        state.userEmail = null;
        state.userAvatar = null;
        state.userUid = null;
        state.studentDocId = null;
        state.userRole = null;
      }
    },
    setMockExamData: (state, action: PayloadAction<{ examName: string; data: MockExamData }>) => {
      state.mockExamCache[action.payload.examName] = action.payload.data;
    },
    setMockExamSettings: (state, action: PayloadAction<{ settingsKey: string; data: ExamSettingsData }>) => {
      state.mockExamSettingsCache[action.payload.settingsKey] = action.payload.data;
    },
    setProgressData: (state, action: PayloadAction<{ studentId: string; data: ProgressData }>) => {
      state.progressCache[action.payload.studentId] = action.payload.data;
    },
    /* Field focus with ctrl+k (to register only once) */
    setFieldFocusRegistered: (state) => {
      state.isFieldFocusRegistered = true;
    },
  },
});

export const { setUser, setMockExamData, setMockExamSettings, setProgressData, setFieldFocusRegistered } = mainSlice.actions;

export default mainSlice.reducer;