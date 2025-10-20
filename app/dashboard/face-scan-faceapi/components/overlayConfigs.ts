import { OverlayConfig } from './OverlayTemplate';
import { 
  mdiAlertOctagon, 
  mdiClockAlert, 
  mdiAccountClock,
  mdiAccountCheck,
  mdiAlertCircle 
} from '@mdi/js';

/**
 * Centralized overlay configurations for different attendance conditions
 * Add new overlay conditions here and they'll automatically work in the system
 */

export const OVERLAY_CONFIGS: Record<string, OverlayConfig> = {
  // Condition 1: Send Home - Student arrived too late
  SEND_HOME: {
    id: 'send-home',
    enabled: true,
    type: 'error',
    title: '⚠️ TOO LATE',
    message: 'PLEASE GO HOME',
    subtitle: 'Late arrival limit exceeded',
    icon: mdiAlertOctagon,
    showHomeIcon: true,
    showPolicyNotice: true,
    policyText: 'According to school policy, students arriving after 30 minutes must return home.',
    dismissDelay: 3000,
    showDismissButton: true,
  },

  // Condition 2: Missed Quiz - Student missed quiz and needs to complete co-learning
  MISSED_QUIZ: {
    id: 'missed-quiz',
    enabled: true,
    type: 'warning',
    title: '📝 MISSED CO-LEARNING',
    message: 'FINISH YOUR CO-LEARNING',
    subtitle: 'You missed the co-learning on October 14, 2025',
    icon: mdiAlertCircle,
    showHomeIcon: false,
    showPolicyNotice: true,
    policyText: 'Students who missed the co-learning must complete their assignment. Please see your teacher.',
    dismissDelay: 3000,
    showDismissButton: true,
  },

  // Add more conditions as needed...
};

/**
 * Helper function to get overlay config by ID
 * Checks localStorage for enabled state
 */
export const getOverlayConfig = (id: string): OverlayConfig | null => {
  const config = OVERLAY_CONFIGS[id];
  if (!config) return null;
  
  // Check localStorage for enabled state (browser only)
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(`overlay-${id}`);
    if (saved !== null) {
      return {
        ...config,
        enabled: saved === 'true'
      };
    }
  }
  
  return config;
};

/**
 * Helper function to get enabled overlays
 * Checks localStorage for enabled state
 */
export const getEnabledOverlays = (): OverlayConfig[] => {
  return Object.keys(OVERLAY_CONFIGS)
    .map(key => getOverlayConfig(key))
    .filter(config => config !== null && config.enabled) as OverlayConfig[];
};

/**
 * Helper function to toggle overlay enabled state
 */
export const toggleOverlay = (id: string, enabled: boolean): void => {
  if (OVERLAY_CONFIGS[id]) {
    OVERLAY_CONFIGS[id].enabled = enabled;
  }
};
