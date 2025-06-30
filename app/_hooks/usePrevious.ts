import { useEffect, useRef } from 'react';

export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>(value);
  useEffect(() => {
    ref.current = value;
  }); // Track value on every render
  return ref.current;
} 