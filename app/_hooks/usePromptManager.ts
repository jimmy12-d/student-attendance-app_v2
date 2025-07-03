import { create } from 'zustand';

type PromptState = {
  activePrompt: string | null;
  setActivePrompt: (promptName: string | null) => void;
};

export const usePromptManager = create<PromptState>((set) => ({
  activePrompt: null,
  setActivePrompt: (promptName) => set({ activePrompt: promptName }),
})); 