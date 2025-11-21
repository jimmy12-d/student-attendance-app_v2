import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

interface KeyboardNavContextType {
  focusedPath: string[];
  setFocusedPath: (path: string[]) => void;
  focusNext: () => void;
  focusPrev: () => void;
  focusChild: () => void;
  focusParent: () => void;
  registerItem: (id: string, element: HTMLElement | null) => void;
  getMenuItems: () => Array<{ id: string; element: HTMLElement }>;
}

const KeyboardNavContext = createContext<KeyboardNavContextType | undefined>(undefined);

export const KeyboardNavProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [focusedPath, setFocusedPath] = useState<string[]>([]);
  const itemsRef = useRef<Map<string, HTMLElement>>(new Map());

  const registerItem = useCallback((id: string, element: HTMLElement | null) => {
    if (element) {
      itemsRef.current.set(id, element);
    } else {
      itemsRef.current.delete(id);
    }
  }, []);

  const getMenuItems = useCallback(() => {
    return Array.from(itemsRef.current.entries()).map(([id, element]) => ({ id, element }));
  }, []);

  const focusNext = useCallback(() => {
    const items = getMenuItems();
    if (items.length === 0) return;

    const currentIndex = items.findIndex(item => item.id === focusedPath[focusedPath.length - 1]);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % items.length;
    
    items[nextIndex].element.focus();
    setFocusedPath([items[nextIndex].id]);
  }, [focusedPath, getMenuItems]);

  const focusPrev = useCallback(() => {
    const items = getMenuItems();
    if (items.length === 0) return;

    const currentIndex = items.findIndex(item => item.id === focusedPath[focusedPath.length - 1]);
    const prevIndex = currentIndex === -1 ? items.length - 1 : (currentIndex - 1 + items.length) % items.length;
    
    items[prevIndex].element.focus();
    setFocusedPath([items[prevIndex].id]);
  }, [focusedPath, getMenuItems]);

  const focusChild = useCallback(() => {
    // This will be handled by individual components
    setFocusedPath(prev => [...prev]);
  }, []);

  const focusParent = useCallback(() => {
    // This will be handled by individual components
    setFocusedPath(prev => prev.slice(0, -1));
  }, []);

  return (
    <KeyboardNavContext.Provider value={{ focusedPath, setFocusedPath, focusNext, focusPrev, focusChild, focusParent, registerItem, getMenuItems }}>
      {children}
    </KeyboardNavContext.Provider>
  );
};

export const useKeyboardNav = () => {
  const context = useContext(KeyboardNavContext);
  if (!context) {
    throw new Error('useKeyboardNav must be used within KeyboardNavProvider');
  }
  return context;
};
