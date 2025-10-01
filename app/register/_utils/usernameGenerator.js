import { db } from '../../../firebase-config';
import { collection, query, where, getDocs } from 'firebase/firestore';

/**
 * Generate a unique username for a student
 * @param {string} fullName - Student's full name
 * @returns {Promise<string>} - Unique username
 */
export const generateUniqueUsername = async (fullName) => {
  if (!fullName) {
    throw new Error('Full name is required to generate username');
  }

  // Clean and format the name for username base
  const cleanName = fullName
    .toLowerCase()
    .replace(/[^a-z\s]/g, '') // Remove non-alphabetic characters except spaces
    .trim()
    .replace(/\s+/g, '_'); // Replace spaces with underscores

  // Start with just the clean name
  let baseUsername = cleanName;
  
  // If the name is too long, take first and last word
  if (baseUsername.length > 15) {
    const words = cleanName.split('_');
    if (words.length >= 2) {
      baseUsername = `${words[0]}_${words[words.length - 1]}`;
    } else {
      baseUsername = cleanName.substring(0, 15);
    }
  }

  // Function to check if username exists
  const checkUsernameExists = async (username) => {
    const studentsRef = collection(db, 'students');
    const q = query(studentsRef, where('username', '==', username));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  };

  // Try the base username first
  let candidateUsername = baseUsername;
  let counter = 1;

  // Keep trying until we find a unique username
  while (await checkUsernameExists(candidateUsername)) {
    candidateUsername = `${baseUsername}${counter}`;
    counter++;
    
    // Safety check to prevent infinite loop
    if (counter > 9999) {
      // If we can't find a unique username after 9999 attempts, add timestamp
      candidateUsername = `${baseUsername}_${Date.now().toString().slice(-4)}`;
      break;
    }
  }

  return candidateUsername;
};