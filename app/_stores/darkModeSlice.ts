// File: app/_stores/darkModeSlice.ts

import { createSlice, PayloadAction } from "@reduxjs/toolkit";

// The interface is correct
export interface DarkModeState {
  isEnabled: boolean;
}

// =================================================================
// THIS IS THE CORRECTED LOGIC
// =================================================================

// 1. We create a variable to hold our initial state. We default to 'true' (dark mode).
let initialDarkModeState = true;

// 2. We check if we are in the browser and if a setting is saved in localStorage.
if (typeof window !== "undefined") {
  const storedValue = localStorage.getItem("darkMode");
  // If a value was found, use it. Otherwise, we stick with the default 'true'.
  if (storedValue !== null) {
    initialDarkModeState = JSON.parse(storedValue);
  }
}

// 3. Set the initial state based on the logic above.
const initialState: DarkModeState = {
  isEnabled: initialDarkModeState,
};


// =================================================================
// THE REST OF THE FILE IS UPDATED TO USE THIS LOGIC
// =================================================================

export const styleSlice = createSlice({
  name: "darkMode",
  initialState,
  reducers: {
    // This action handles toggling or setting the dark mode
    setDarkMode: (state, action: PayloadAction<boolean | null>) => {
      // If the action payload is null, toggle the current state. Otherwise, set it.
      state.isEnabled = action.payload ?? !state.isEnabled;

      // This is the important part for persisting the choice
      if (typeof window !== "undefined") {
        // Save the new setting to localStorage for the user's next visit
        localStorage.setItem('darkMode', JSON.stringify(state.isEnabled));

        // Apply the 'dark' class to the main <html> element
        if (state.isEnabled) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    },
  },
});

// Action creators are generated for each case reducer function
export const { setDarkMode } = styleSlice.actions;

export default styleSlice.reducer;