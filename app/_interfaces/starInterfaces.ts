import { Timestamp } from "firebase/firestore";

// Star Reward Interface
export interface StarReward {
  id: string; // Firestore document ID
  name: string; // e.g., "Early Bird Star"
  color: 'white' | 'pink' | 'orange' | 'blue'; // Color options
  amount: number; // Number of stars awarded
  setLimit: number; // Maximum times this reward can be claimed
  isActive: boolean; // Whether the reward is currently active
  createdAt: Timestamp;
  createdBy: string; // Admin who created it
  updatedAt?: Timestamp;
  updatedBy?: string;
}

// Claimed Star Interface (sub-collection under students)
export interface ClaimedStar {
  id: string; // Firestore document ID
  starRewardId: string; // Reference to starRewards collection
  starRewardName: string; // For easy display
  starRewardColor: 'white' | 'pink' | 'orange' | 'blue';
  amount: number; // Stars earned
  claimedAt: Timestamp;
  claimedBy: string; // Admin who granted it
  reason?: string; // Optional reason for granting
}

// Student with star totals (for UI display)
export interface StudentWithStars {
  id: string;
  fullName: string;
  class: string;
  shift: string;
  totalStars: number; // Calculated from claimedStars sub-collection
  claimedStars?: ClaimedStar[]; // Array of claimed stars
}
