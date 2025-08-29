// app/dashboard/_lib/statusStyles.ts
import { 
  mdiAccountCheckOutline, 
  mdiClockAlertOutline, 
  mdiAccountOffOutline, 
  mdiClockTimeThreeOutline 
} from "@mdi/js";

export interface StatusStyles {
  badge: string;
  cardBg: string;
  icon: string;
  textColor: string;
  tableCell: string;
  svg?: string; // Optional SVG path for inline SVG usage
}

/**
 * Get status styles for different attendance statuses
 * @param status - The attendance status (present, late, absent, etc.)
 * @param useSvg - Whether to include SVG path data (default: false)
 * @returns StatusStyles object with classes and optional SVG path
 * 
 * Usage examples:
 * - Basic: getStatusStyles('present') 
 * - With SVG: getStatusStyles('present', true)
 * - Table cell: <span className={getStatusStyles('present').tableCell}>
 * - Badge: <span className={getStatusStyles('present').badge}>
 * - With Icon component: <Icon path={getStatusStyles('present').icon} size={20} />
 * - With SVG: <svg><path d={getStatusStyles('present', true).svg} /></svg>
 */
export const getStatusStyles = (status: string, useSvg: boolean = false): StatusStyles => {
  const s = status.toLowerCase();
  switch (s) {
    case 'present':
      return { 
        badge: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800',
        cardBg: 'bg-gradient-to-br from-green-500 to-emerald-600',
        icon: mdiAccountCheckOutline,
        textColor: 'text-white',
        tableCell: 'bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200',
        svg: useSvg ? 'M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z' : undefined
      };
    case 'late':
      return { 
        badge: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-700',
        cardBg: 'bg-gradient-to-br from-yellow-500 to-orange-500',
        icon: mdiClockAlertOutline,
        textColor: 'text-white',
        tableCell: 'bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 border border-yellow-300 dark:border-yellow-600',
        svg: useSvg ? 'M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z' : undefined
      };
    case 'permission':
      return { 
        badge: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-700',
        cardBg: 'bg-gradient-to-br from-purple-500 to-indigo-600',
        icon: mdiAccountCheckOutline,
        textColor: 'text-white',
        tableCell: 'bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200',
        svg: useSvg ? 'M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zM4 7h12v9a1 1 0 01-1 1H5a1 1 0 01-1-1V7z M9 12a1 1 0 102 0V9a1 1 0 10-2 0v3z' : undefined
      };
    case 'pending':
      return {
        badge: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700',
        cardBg: 'bg-gradient-to-br from-blue-500 to-cyan-600',
        icon: mdiClockTimeThreeOutline,
        textColor: 'text-white',
        tableCell: 'bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200',
        svg: useSvg ? 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' : undefined
      };
    case 'requested':
      return {
        badge: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-700',
        cardBg: 'bg-gradient-to-br from-orange-500 to-amber-600',
        icon: mdiClockTimeThreeOutline,
        textColor: 'text-white',
        tableCell: 'bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-200',
        svg: useSvg ? 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' : undefined
      };
    case 'absent':
      return { 
        badge: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800',
        cardBg: 'bg-gradient-to-br from-red-500 to-rose-600',
        icon: mdiAccountOffOutline,
        textColor: 'text-white',
        tableCell: 'bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200',
        svg: useSvg ? 'M6 18L18 6M6 6l12 12' : undefined
      };
    case 'no school':
      return {
        badge: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800',
        cardBg: 'bg-gradient-to-br from-purple-500 to-indigo-600',
        icon: mdiAccountCheckOutline,
        textColor: 'text-white',
        tableCell: 'bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200',
        svg: useSvg ? 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' : undefined
      };
    case 'not yet enrolled':
      return {
        badge: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700',
        cardBg: 'bg-gradient-to-br from-gray-500 to-slate-600',
        icon: mdiAccountOffOutline,
        textColor: 'text-white',
        tableCell: 'bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200',
        svg: useSvg ? 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' : undefined
      };
    default:
      return { 
        badge: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700',
        cardBg: 'bg-gradient-to-br from-gray-500 to-slate-600',
        icon: mdiAccountOffOutline,
        textColor: 'text-white',
        tableCell: 'bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200',
        svg: useSvg ? 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' : undefined
      };
  }
};

// Helper function to render status badge with SVG
export const renderStatusBadge = (
  status: string, 
  displayText?: string, 
  showTime?: string,
  className?: string
) => {
  const styles = getStatusStyles(status, true);
  const text = displayText || status;
  
  return `
    <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${styles.badge} ${className || ''}">
      ${styles.svg ? `
        <svg 
          class="w-3 h-3 mr-1" 
          fill="${status.toLowerCase() === 'pending' ? 'none' : 'currentColor'}" 
          stroke="${status.toLowerCase() === 'pending' ? 'currentColor' : 'none'}" 
          viewBox="0 0 20 20"
        >
          <path 
            ${status.toLowerCase() !== 'pending' ? 'fill-rule="evenodd" clip-rule="evenodd"' : 'stroke-linecap="round" stroke-linejoin="round" stroke-width="2"'}
            d="${styles.svg}" 
          />
        </svg>
      ` : ''}
      ${text}
      ${showTime ? `<span class="ml-1 text-xs opacity-75">(${showTime})</span>` : ''}
    </span>
  `;
};
