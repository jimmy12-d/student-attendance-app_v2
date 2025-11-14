// app/_utils/inactivitySettings.ts
/**
 * Utility for managing inactivity timeout settings
 * Stores user preferences in localStorage
 */

export type InactivityTimeoutOption = 30 | 60 | 120; // seconds

export interface InactivitySettings {
  enabled: boolean;
  timeoutSeconds: InactivityTimeoutOption;
}

const STORAGE_KEY = 'inactivitySettings';

const DEFAULT_SETTINGS: InactivitySettings = {
  enabled: true,
  timeoutSeconds: 30,
};

/**
 * Get inactivity settings from localStorage
 */
export function getInactivitySettings(): InactivitySettings {
  if (typeof window === 'undefined') {
    return DEFAULT_SETTINGS;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return DEFAULT_SETTINGS;
    }

    const parsed = JSON.parse(stored) as InactivitySettings;
    
    // Validate the parsed data
    if (
      typeof parsed.enabled === 'boolean' &&
      typeof parsed.timeoutSeconds === 'number' &&
      [30, 60, 120].includes(parsed.timeoutSeconds)
    ) {
      return parsed;
    }

    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error('Error reading inactivity settings:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Save inactivity settings to localStorage
 */
export function saveInactivitySettings(settings: InactivitySettings): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving inactivity settings:', error);
  }
}

/**
 * Get timeout in milliseconds
 */
export function getTimeoutInMs(settings: InactivitySettings): number {
  return settings.enabled ? settings.timeoutSeconds * 1000 : 0;
}

/**
 * Format timeout for display
 */
export function formatTimeout(seconds: InactivityTimeoutOption): string {
  if (seconds < 60) {
    return `${seconds} seconds`;
  }
  return `${seconds / 60} minute${seconds > 60 ? 's' : ''}`;
}
