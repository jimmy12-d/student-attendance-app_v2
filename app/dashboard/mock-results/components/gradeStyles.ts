/**
 * Grade Style Utilities
 * Functions for getting consistent grade colors and styles across the application
 */

// Get grade-dependent styles for badges
export const getGradeStyles = (grade: string): string => {
  switch (grade) {
    case 'A':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-600 dark:border-green-400';
    case 'B':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-600 dark:border-blue-400';
    case 'C':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-600 dark:border-yellow-400';
    case 'D':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-600 dark:border-purple-400';
    case 'E':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-600 dark:border-orange-400';
    case 'F':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-600 dark:border-red-400';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300 border-gray-600 dark:border-gray-400';
  }
};

// Get grade hover colors for text elements
export const getGradeHoverColor = (grade: string): string => {
  switch (grade) {
    case 'A':
      return 'text-green-600 dark:hover:text-green-400';
    case 'B':
      return 'text-blue-600 dark:hover:text-blue-400';
    case 'C':
      return 'text-yellow-600 dark:hover:text-yellow-400';
    case 'D':
      return 'text-purple-600 dark:hover:text-purple-400';
    case 'E':
      return 'text-orange-600 dark:hover:text-orange-400';
    case 'F':
      return 'text-red-600 dark:hover:text-red-400';
    default:
      return 'text-gray-600 dark:hover:text-gray-400';
  }
};

// Get grade colors for avatar-like elements
export const getGradeColor = (grade: string): string => {
  switch (grade) {
    case 'A':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'B':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'C':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'D':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    case 'E':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    case 'F':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }
};

// Get score colors based on performance
export const getScoreColor = (score: number, maxScore: number): string => {
  if (maxScore === 0) return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
  
  const percentage = score / maxScore;
  if (percentage >= 0.8) {
    return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
  } else if (percentage >= 0.6) {
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
  } else if (percentage >= 0.5) {
    return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
  } else {
    return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
  }
};
