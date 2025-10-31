// app/_stores/mainSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Define the User type to allow for null values, as Firebase User properties can be null
export interface User {
  name: string | null;
  email: string | null;
  avatar: string | null;
  uid?: string; // Optional: Store Firebase UID if needed
  studentDocId?: string | null; // Firestore document ID from 'students' collection
  role?: 'admin' | 'student' | 'teacher'; // Add teacher role
  subject?: string; // For teachers
  phone?: string; // For teachers
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  link?: string;
  createdAt: string; // Changed to string (ISO date) for serialization
  isRead: boolean;
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

type AllMockScores = { [mockName: string]: { [subject: string]: number } };

// Define a type for a single cache entry for the radar chart
type RadarChartCacheEntry = {
  data: AllMockScores;
  lastFetched: string;
};

// Define a type for the radar chart cache
type RadarChartCache = {
  [studentId: string]: RadarChartCacheEntry;
};

export interface MainState {
  userName: string | null;
  userEmail: string | null;
  userAvatar: string | null;
  userUid?: string | null; // Optional: For Firebase UID
  studentDocId?: string | null; // Firestore document ID
  userRole?: 'admin' | 'student' | 'teacher' | null; // Add teacher role to state
  userSubject?: string | string[] | null; // For teachers - can be string or array
  userPhone?: string | null; // For teachers
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
  isStudentDataLoaded: boolean;
  radarChartCache: RadarChartCache;
  studentClassType: string | null;
  isFieldAdmin: boolean;
  isAdmin: boolean;
  notifications: AppNotification[];
  unreadNotificationCount: number;
  isBottomNavVisible: boolean;
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
  userSubject: null,
  userPhone: null,
  mockExamCache: {},
  mockExamSettingsCache: {},
  progressCache: {},
  isStudentDataLoaded: false,
  radarChartCache: {},
  studentClassType: null,
  isFieldAdmin: false,
  isAdmin: false,
  notifications: [],
  unreadNotificationCount: 0,
  isBottomNavVisible: true,

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
        state.userSubject = action.payload.subject; // Store subject for teachers
        state.userPhone = action.payload.phone; // Store phone for teachers
      } else {
        // Reset user state on logout
        state.userName = null;
        state.userEmail = null;
        state.userAvatar = null;
        state.userUid = null;
        state.studentDocId = null;
        state.userRole = null;
        state.userSubject = null;
        state.userPhone = null;
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
    setRadarChartData: (state, action: PayloadAction<{ studentId: string; data: RadarChartCacheEntry }>) => {
      state.radarChartCache[action.payload.studentId] = action.payload.data;
    },
    setStudentDataLoaded: (state, action: PayloadAction<boolean>) => {
      state.isStudentDataLoaded = action.payload;
    },
    /* Field focus with ctrl+k (to register only once) */
    setFieldFocusRegistered: (state) => {
      state.isFieldFocusRegistered = true;
    },
    setStudentClassType: (state, action: PayloadAction<string>) => {
      state.studentClassType = action.payload;
    },
    setNotifications: (state, action: PayloadAction<AppNotification[]>) => {
      state.notifications = action.payload;
      state.unreadNotificationCount = action.payload.filter(n => !n.isRead).length;
    },
    addNotification: (state, action: PayloadAction<AppNotification>) => {
      state.notifications.unshift(action.payload);
      state.unreadNotificationCount++;
    },
    markNotificationAsRead: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find(n => n.id === action.payload);
      if (notification && !notification.isRead) {
        notification.isRead = true;
        state.unreadNotificationCount--;
      }
    },
    markAllNotificationsAsRead: (state) => {
      state.notifications.forEach(n => n.isRead = true);
      state.unreadNotificationCount = 0;
    },
    setUnreadNotificationCount: (state, action: PayloadAction<number>) => {
      state.unreadNotificationCount = action.payload;
    },
    setBottomNavVisible: (state, action: PayloadAction<boolean>) => {
      state.isBottomNavVisible = action.payload;
    }
  },
});

export const {
  setUser,
  setMockExamData,
  setMockExamSettings,
  setProgressData,
  setRadarChartData,
  setStudentDataLoaded,
  setFieldFocusRegistered,
  setStudentClassType,
  setNotifications,
  addNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  setUnreadNotificationCount,
  setBottomNavVisible,
} = mainSlice.actions;

export default mainSlice.reducer;