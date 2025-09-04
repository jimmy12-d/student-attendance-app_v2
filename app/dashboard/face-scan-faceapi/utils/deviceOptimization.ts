/**
 * Device Optimization Utilities for Face Recognition
 * Optimizes performance for mobile devices and iPads
 */

// Device detection utilities
export const getDeviceInfo = () => {
  if (typeof window === 'undefined') {
    return {
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isIOS: false,
      isAndroid: false,
      devicePixelRatio: 1,
      screenWidth: 1920,
      screenHeight: 1080,
      supportsWebGL: false
    };
  }

  const userAgent = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  const isAndroid = /Android/.test(userAgent);
  const isMobile = /Mobi|Android/i.test(userAgent) && !(/iPad/.test(userAgent));
  const isTablet = /iPad/.test(userAgent) || (/Android/.test(userAgent) && !/Mobi/.test(userAgent));
  const isDesktop = !isMobile && !isTablet;

  // Check WebGL support
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  const supportsWebGL = !!gl;

  return {
    isMobile,
    isTablet,
    isDesktop,
    isIOS,
    isAndroid,
    devicePixelRatio: window.devicePixelRatio || 1,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    supportsWebGL,
    userAgent
  };
};

// Get optimized video constraints based on device
export const getOptimizedVideoConstraints = (selectedCamera?: string) => {
  const deviceInfo = getDeviceInfo();
  
  // Base constraints
  const baseConstraints = {
    facingMode: 'user',
    deviceId: selectedCamera ? { exact: selectedCamera } : undefined,
  };

  // Desktop/High-end device constraints
  if (deviceInfo.isDesktop || (!deviceInfo.isMobile && !deviceInfo.isTablet)) {
    return {
      ...baseConstraints,
      width: { ideal: 1280, max: 1920 },
      height: { ideal: 720, max: 1080 },
      frameRate: { ideal: 30, max: 60 }
    };
  }

  // Mobile device optimizations
  if (deviceInfo.isMobile) {
    return {
      ...baseConstraints,
      width: { ideal: 640, max: 1280 },
      height: { ideal: 480, max: 720 },
      frameRate: { ideal: 15, max: 20 } // Reduced for mobile
    };
  }

  // iPad/Tablet optimizations
  if (deviceInfo.isTablet) {
    return {
      ...baseConstraints,
      width: { ideal: 1024, max: 1280 },
      height: { ideal: 768, max: 720 },
      frameRate: { ideal: 20, max: 30 }
    };
  }

  // Fallback constraints
  return {
    ...baseConstraints,
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 }
  };
};

// Get optimized canvas resolution for face detection
export const getOptimizedCanvasSize = (videoElement?: HTMLVideoElement) => {
  const deviceInfo = getDeviceInfo();
  
  if (!videoElement) {
    // Default sizes based on device
    if (deviceInfo.isMobile) {
      return { width: 320, height: 240 };
    }
    if (deviceInfo.isTablet) {
      return { width: 640, height: 480 };
    }
    return { width: 1280, height: 720 };
  }

  const videoWidth = videoElement.videoWidth;
  const videoHeight = videoElement.videoHeight;

  // Mobile: Reduce canvas size for better performance
  if (deviceInfo.isMobile) {
    const scale = Math.min(320 / videoWidth, 240 / videoHeight, 0.5);
    return {
      width: Math.floor(videoWidth * scale),
      height: Math.floor(videoHeight * scale)
    };
  }

  // iPad: Moderate reduction
  if (deviceInfo.isTablet) {
    const scale = Math.min(640 / videoWidth, 480 / videoHeight, 0.75);
    return {
      width: Math.floor(videoWidth * scale),
      height: Math.floor(videoHeight * scale)
    };
  }

  // Desktop: Use full resolution or slightly reduced
  const scale = Math.min(1280 / videoWidth, 720 / videoHeight, 1.0);
  return {
    width: Math.floor(videoWidth * scale),
    height: Math.floor(videoHeight * scale)
  };
};

// Get frame processing interval based on device
export const getFrameProcessingInterval = () => {
  const deviceInfo = getDeviceInfo();
  
  // Mobile: Slower processing for battery life
  if (deviceInfo.isMobile) {
    return 2000; // 2 seconds
  }
  
  // iPad: Moderate processing
  if (deviceInfo.isTablet) {
    return 1500; // 1.5 seconds
  }
  
  // Desktop: Faster processing
  return 1000; // 1 second
};

// Get face detection options based on device
export const getOptimizedFaceDetectionOptions = () => {
  const deviceInfo = getDeviceInfo();
  
  // Base options for face-api.js
  const baseOptions = {
    inputSize: 512,
    scoreThreshold: 0.5
  };

  // Mobile: Use smaller input size for better performance
  if (deviceInfo.isMobile) {
    return {
      ...baseOptions,
      inputSize: 320, // Smaller for mobile
      scoreThreshold: 0.6 // Slightly higher threshold
    };
  }

  // iPad: Moderate settings
  if (deviceInfo.isTablet) {
    return {
      ...baseOptions,
      inputSize: 416,
      scoreThreshold: 0.55
    };
  }

  // Desktop: Full quality
  return {
    ...baseOptions,
    inputSize: 512,
    scoreThreshold: 0.5
  };
};

// Frame skipping optimization for mobile
export const shouldSkipFrame = (() => {
  let frameCount = 0;
  
  return () => {
    const deviceInfo = getDeviceInfo();
    frameCount++;
    
    // Mobile: Skip every other frame
    if (deviceInfo.isMobile) {
      return frameCount % 2 !== 0;
    }
    
    // iPad: Skip every 3rd frame
    if (deviceInfo.isTablet) {
      return frameCount % 3 !== 0;
    }
    
    // Desktop: Process all frames
    return false;
  };
})();

// Memory management utilities
export const performGarbageCollection = () => {
  if (typeof window !== 'undefined' && 'gc' in window) {
    try {
      // Force garbage collection if available (Chrome with --enable-precise-memory-info)
      (window as any).gc();
    } catch (e) {
      // Silently fail if gc is not available
    }
  }
};

// Canvas optimization for mobile
export const optimizeCanvasForDevice = (canvas: HTMLCanvasElement) => {
  const deviceInfo = getDeviceInfo();
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return;

  // Mobile optimizations
  if (deviceInfo.isMobile) {
    // Disable image smoothing for better performance
    ctx.imageSmoothingEnabled = false;
    
    // Use lower quality for mobile
    ctx.imageSmoothingQuality = 'low';
  } else if (deviceInfo.isTablet) {
    // Medium quality for tablets
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'medium';
  } else {
    // High quality for desktop
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
  }
};

// Battery optimization detection
export const isBatteryOptimizationNeeded = async (): Promise<boolean> => {
  if (typeof navigator === 'undefined' || !('getBattery' in navigator)) {
    return false;
  }

  try {
    const battery = await (navigator as any).getBattery();
    // Enable battery optimization if battery is low or not charging
    return battery.level < 0.3 || !battery.charging;
  } catch (e) {
    return false;
  }
};

// Performance monitoring
export class PerformanceMonitor {
  private frameCount = 0;
  private startTime = Date.now();
  private lastFrameTime = Date.now();
  
  recordFrame() {
    this.frameCount++;
    this.lastFrameTime = Date.now();
  }
  
  getFPS(): number {
    const elapsed = (Date.now() - this.startTime) / 1000;
    return elapsed > 0 ? this.frameCount / elapsed : 0;
  }
  
  getAverageFrameTime(): number {
    const elapsed = Date.now() - this.startTime;
    return this.frameCount > 0 ? elapsed / this.frameCount : 0;
  }
  
  shouldReduceQuality(): boolean {
    const fps = this.getFPS();
    const deviceInfo = getDeviceInfo();
    
    // Different thresholds for different devices
    if (deviceInfo.isMobile && fps < 10) return true;
    if (deviceInfo.isTablet && fps < 15) return true;
    if (deviceInfo.isDesktop && fps < 20) return true;
    
    return false;
  }
  
  reset() {
    this.frameCount = 0;
    this.startTime = Date.now();
    this.lastFrameTime = Date.now();
  }
}

// Adaptive quality settings
export interface QualitySettings {
  canvasScale: number;
  processingInterval: number;
  skipFrames: boolean;
  inputSize: number;
  enableImageSmoothing: boolean;
}

export const getAdaptiveQualitySettings = (performanceMonitor: PerformanceMonitor): QualitySettings => {
  const deviceInfo = getDeviceInfo();
  const shouldReduce = performanceMonitor.shouldReduceQuality();
  
  if (deviceInfo.isMobile || shouldReduce) {
    return {
      canvasScale: 0.5,
      processingInterval: 2000,
      skipFrames: true,
      inputSize: 320,
      enableImageSmoothing: false
    };
  }
  
  if (deviceInfo.isTablet) {
    return {
      canvasScale: 0.75,
      processingInterval: 1500,
      skipFrames: true,
      inputSize: 416,
      enableImageSmoothing: true
    };
  }
  
  return {
    canvasScale: 1.0,
    processingInterval: 1000,
    skipFrames: false,
    inputSize: 512,
    enableImageSmoothing: true
  };
};

// Export device info for external use
export { getDeviceInfo as default };
