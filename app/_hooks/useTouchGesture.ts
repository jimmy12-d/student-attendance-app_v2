import { useEffect, useRef } from 'react';

interface TouchGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onScroll?: (scrollLeft: number) => void;
  threshold?: number;
}

export const useTouchGesture = (options: TouchGestureOptions) => {
  const ref = useRef<HTMLDivElement>(null);
  const touchStart = useRef({ x: 0, y: 0 });
  const touchEnd = useRef({ x: 0, y: 0 });
  const { onSwipeLeft, onSwipeRight, onScroll, threshold = 50 } = options;

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    let isScrolling = false;
    let momentum = 0;

    const handleTouchStart = (e: TouchEvent) => {
      touchStart.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      };
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStart.current.x || !touchStart.current.y) return;

      touchEnd.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      };

      const deltaX = touchStart.current.x - touchEnd.current.x;
      const deltaY = touchStart.current.y - touchEnd.current.y;

      // If horizontal swipe is more dominant, prevent vertical scroll
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        e.preventDefault();
        
        // Apply smooth momentum scrolling
        if (!isScrolling) {
          isScrolling = true;
          momentum = deltaX * 0.8; // Adjust momentum factor
          
          const smoothScroll = () => {
            if (Math.abs(momentum) > 0.5) {
              element.scrollLeft += momentum;
              momentum *= 0.95; // Friction
              requestAnimationFrame(smoothScroll);
              onScroll?.(element.scrollLeft);
            } else {
              isScrolling = false;
            }
          };
          
          requestAnimationFrame(smoothScroll);
        }
      }
    };

    const handleTouchEnd = () => {
      if (!touchStart.current.x || !touchEnd.current.x) return;

      const deltaX = touchStart.current.x - touchEnd.current.x;
      const deltaY = touchStart.current.y - touchEnd.current.y;

      // Only trigger swipe if horizontal movement is dominant
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > threshold) {
        if (deltaX > 0) {
          onSwipeLeft?.();
        } else {
          onSwipeRight?.();
        }
      }

      // Reset values
      touchStart.current = { x: 0, y: 0 };
      touchEnd.current = { x: 0, y: 0 };
    };

    // Mouse wheel for desktop smooth scrolling
    const handleWheel = (e: WheelEvent) => {
      if (e.deltaX !== 0) {
        e.preventDefault();
        element.scrollLeft += e.deltaX * 0.5; // Smooth wheel scrolling
        onScroll?.(element.scrollLeft);
      }
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });
    element.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('wheel', handleWheel);
    };
  }, [onSwipeLeft, onSwipeRight, onScroll, threshold]);

  return ref;
};