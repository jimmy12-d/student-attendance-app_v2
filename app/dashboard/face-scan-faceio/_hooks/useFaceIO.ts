import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

declare global {
  var faceIO: any;
}

export const useFaceIO = () => {
  const [faceio, setFaceio] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Initializing FaceIO...');

  const initializeFaceIO = useCallback(async () => {
    try {
      setLoadingMessage('Loading FaceIO SDK...');
      
      if (typeof faceIO === 'undefined') {
        const existingScript = document.querySelector('script[src="https://cdn.faceio.net/fio.js"]');
        
        if (!existingScript) {
          const script = document.createElement('script');
          script.src = 'https://cdn.faceio.net/fio.js';
          script.async = true;
          document.head.appendChild(script);
          
          await new Promise((resolve, reject) => {
            script.onload = () => {
              const checkFaceIO = () => {
                if (typeof faceIO !== 'undefined') {
                  resolve(true);
                } else {
                  setTimeout(checkFaceIO, 100);
                }
              };
              checkFaceIO();
            };
            script.onerror = reject;
          });
        } else {
          await new Promise((resolve) => {
            const checkFaceIO = () => {
              if (typeof faceIO !== 'undefined') {
                resolve(true);
              } else {
                setTimeout(checkFaceIO, 100);
              }
            };
            checkFaceIO();
          });
        }
      }

      setLoadingMessage('Initializing FaceIO application...');
      
      if (typeof faceIO === 'undefined') {
        throw new Error('FaceIO library not loaded properly');
      }
      
      const faceioInstance = new faceIO(process.env.NEXT_PUBLIC_FACEIO_APP_ID);
      
      setFaceio(faceioInstance);
      setIsLoading(false);
      setLoadingMessage('');
      
      console.log('FaceIO initialized successfully');
      toast.success('FaceIO ready for use');
      
    } catch (error) {
      console.error('Failed to initialize FaceIO:', error);
      setLoadingMessage('Failed to initialize FaceIO');
      toast.error('Failed to initialize FaceIO');
    }
  }, []);

  useEffect(() => {
    initializeFaceIO();
  }, [initializeFaceIO]);

  return { faceio, isLoading, loadingMessage };
};
