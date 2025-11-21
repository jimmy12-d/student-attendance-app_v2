/**
 * Utility functions for counting words in Khmer and English text
 * Uses split-khmer for proper Khmer syllable detection
 */

import { split } from 'split-khmer';

/**
 * Count total words in mixed Khmer/English text
 * For Khmer: uses split-khmer to count syllables (treats each syllable as a word)
 * For English: splits by spaces
 * For mixed: uses split-khmer which handles both
 */
export function countWords(text: string): {
  total: number;
} {
  if (!text) {
    return { total: 0 };
  }
  
  // Check if text contains Khmer characters
  const hasKhmer = /[\u1780-\u17FF]/.test(text);
  
  if (hasKhmer) {
    // Use split-khmer for Khmer text - it properly splits syllables
    const syllables = split(text);
    return { total: syllables.length };
  } else {
    // For English-only text, split by spaces
    const words = text.trim().split(/\s+/).filter(Boolean);
    return { total: words.length };
  }
}

/**
 * Check if answer meets minimum word count requirement
 */
export function meetsWordCountRequirement(
  text: string,
  minimumWords: number
): {
  meets: boolean;
  count: number;
  required: number;
} {
  const counts = countWords(text);
  
  return {
    meets: counts.total >= minimumWords,
    count: counts.total,
    required: minimumWords
  };
}

/**
 * Format word count for display
 */
export function formatWordCountMessage(
  count: number,
  required: number
): string {
  return `Words: ${count}/${required}`;
}
