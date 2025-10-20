"use client";

import { useEffect, useState } from 'react';
import Icon from '../../../_components/Icon';
import { 
  mdiAlertOctagon, 
  mdiHome, 
  mdiClockAlert, 
  mdiCheckCircle, 
  mdiInformation,
  mdiAlertCircle,
  mdiAlert
} from '@mdi/js';

export type OverlayType = 'error' | 'warning' | 'success' | 'info';

export interface OverlayConfig {
  id: string;                    // Unique identifier for this overlay condition
  enabled: boolean;              // Enable/disable this specific overlay
  type: OverlayType;            // Visual style
  title: string;                // Main title
  message: string;              // Main message
  subtitle?: string;            // Additional details
  icon?: string;                // Custom MDI icon path
  showHomeIcon?: boolean;       // Show "Return Home" icon section
  showPolicyNotice?: boolean;   // Show policy notice
  policyText?: string;          // Custom policy text
  dismissDelay?: number;        // Delay before showing dismiss button (ms)
  showDismissButton?: boolean;  // Whether dismiss button appears
  autoHideDelay?: number;       // Auto-hide after X milliseconds (optional)
}

interface OverlayTemplateProps {
  isVisible: boolean;
  config: OverlayConfig | null;
  studentName?: string;
  onDismiss?: () => void;
}

// Color scheme configurations
const colorSchemes: Record<OverlayType, {
  gradient: string;
  border: string;
  iconBg: string;
  iconColor: string;
  textColor: string;
  subtitleColor: string;
  contentBg: string;
  contentBorder: string;
  policyBg: string;
  policyBorder: string;
  policyText: string;
}> = {
  error: {
    gradient: 'from-red-600 via-red-700 to-red-800',
    border: 'border-red-400/50',
    iconBg: 'bg-red-400',
    iconColor: 'text-red-600',
    textColor: 'text-white',
    subtitleColor: 'text-red-100',
    contentBg: 'bg-red-900/50',
    contentBorder: 'border-red-400/30',
    policyBg: 'bg-red-900/60',
    policyBorder: 'border-red-400/30',
    policyText: 'text-red-100'
  },
  warning: {
    gradient: 'from-orange-500 via-orange-600 to-orange-700',
    border: 'border-orange-400/50',
    iconBg: 'bg-orange-400',
    iconColor: 'text-orange-600',
    textColor: 'text-white',
    subtitleColor: 'text-orange-100',
    contentBg: 'bg-orange-900/50',
    contentBorder: 'border-orange-400/30',
    policyBg: 'bg-orange-900/60',
    policyBorder: 'border-orange-400/30',
    policyText: 'text-orange-100'
  },
  success: {
    gradient: 'from-green-600 via-green-700 to-green-800',
    border: 'border-green-400/50',
    iconBg: 'bg-green-400',
    iconColor: 'text-green-600',
    textColor: 'text-white',
    subtitleColor: 'text-green-100',
    contentBg: 'bg-green-900/50',
    contentBorder: 'border-green-400/30',
    policyBg: 'bg-green-900/60',
    policyBorder: 'border-green-400/30',
    policyText: 'text-green-100'
  },
  info: {
    gradient: 'from-blue-600 via-blue-700 to-blue-800',
    border: 'border-blue-400/50',
    iconBg: 'bg-blue-400',
    iconColor: 'text-blue-600',
    textColor: 'text-white',
    subtitleColor: 'text-blue-100',
    contentBg: 'bg-blue-900/50',
    contentBorder: 'border-blue-400/30',
    policyBg: 'bg-blue-900/60',
    policyBorder: 'border-blue-400/30',
    policyText: 'text-blue-100'
  }
};

// Default icons for each type
const defaultIcons: Record<OverlayType, string> = {
  error: mdiAlertOctagon,
  warning: mdiAlert,
  success: mdiCheckCircle,
  info: mdiInformation
};

export const OverlayTemplate = ({ 
  isVisible, 
  config,
  studentName,
  onDismiss 
}: OverlayTemplateProps) => {
  const [showDismissButton, setShowDismissButton] = useState(false);

  // Handle dismiss button timing
  useEffect(() => {
    if (isVisible && config?.enabled && config?.showDismissButton) {
      const timer = setTimeout(() => {
        setShowDismissButton(true);
      }, config.dismissDelay || 3000);
      return () => clearTimeout(timer);
    } else {
      setShowDismissButton(false);
    }
  }, [isVisible, config]);

  // Handle auto-hide
  useEffect(() => {
    if (isVisible && config?.enabled && config?.autoHideDelay && onDismiss) {
      const timer = setTimeout(() => {
        onDismiss();
      }, config.autoHideDelay);
      return () => clearTimeout(timer);
    }
  }, [isVisible, config, onDismiss]);

  // Don't render if not visible, not enabled, or no config
  if (!isVisible || !config?.enabled || !config) return null;

  const colors = colorSchemes[config.type];
  const iconPath = config.icon || defaultIcons[config.type];

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      {/* Main Content */}
      <div className={`relative bg-gradient-to-br ${colors.gradient} rounded-3xl shadow-2xl p-8 max-w-2xl w-full mx-4 border-4 ${colors.border} animate-in zoom-in-95 duration-500`}>
        {/* Pulsing Icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className={`absolute inset-0 ${colors.iconBg} rounded-full opacity-50 animate-ping`}></div>
            <div className="relative bg-white rounded-full p-6">
              <svg width="48" height="48" viewBox="0 0 24 24" className={colors.iconColor}>
                <path d={iconPath} />
              </svg>
            </div>
          </div>
        </div>

        {/* Main Message */}
        <div className="text-center space-y-4 mb-8">
          <h1 className={`text-4xl md:text-5xl font-bold ${colors.textColor} drop-shadow-lg`}>
            {config.title}
          </h1>
          
          {studentName && (
            <p className={`text-2xl md:text-3xl font-semibold ${colors.subtitleColor}`}>
              {studentName}
            </p>
          )}
          
          <div className={`${colors.contentBg} rounded-2xl p-6 border-2 ${colors.contentBorder}`}>
            <p className={`text-xl md:text-2xl ${colors.textColor} font-medium mb-2`}>
              {config.message}
            </p>
            
            {config.subtitle && (
              <p className={`text-lg ${colors.subtitleColor} flex items-center justify-center gap-2`}>
                <Icon path={mdiClockAlert} size={16} />
                {config.subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Home Icon Row - Optional */}
        {config.showHomeIcon && (
          <div className="flex justify-center items-center gap-8 mb-8">
            <div className="flex flex-col items-center">
              <div className="bg-white/20 rounded-full p-4 mb-2">
                <Icon path={mdiHome} size={24} className="text-white" />
              </div>
              <p className="text-white font-semibold text-lg">Return Home</p>
            </div>
          </div>
        )}

        {/* Policy Notice - Optional */}
        {config.showPolicyNotice && config.policyText && (
          <div className={`${colors.policyBg} rounded-xl p-4 border ${colors.policyBorder}`}>
            <p className={`text-center ${colors.policyText} text-sm md:text-base`}>
              {config.policyText}
            </p>
          </div>
        )}

        {/* Dismiss Button */}
        {showDismissButton && onDismiss && (
          <button
            onClick={onDismiss}
            className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white font-semibold px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
};
