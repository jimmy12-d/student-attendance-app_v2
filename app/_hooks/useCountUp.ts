import { useState, useEffect, useRef } from 'react';

function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

function useCountUp(end: number, duration: number = 3000, deps: any[] = []) {
  const [count, setCount] = useState(0);
  const frameRate = 1000 / 60;
  const totalFrames = Math.round(duration / frameRate);
  const animationFrameId = useRef<number | null>(null);

  useEffect(() => {
    let frame = 0;
    setCount(0); // Reset count whenever dependencies change

    const counter = () => {
      frame++;
      const progress = easeOutExpo(frame / totalFrames);
      const currentCount = Math.round(end * progress);
      setCount(currentCount);

      if (frame < totalFrames) {
        animationFrameId.current = requestAnimationFrame(counter);
      }
    };

    animationFrameId.current = requestAnimationFrame(counter);

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [end, duration, totalFrames, ...deps]);

  return count;
}

export default useCountUp; 