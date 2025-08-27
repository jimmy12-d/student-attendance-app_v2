import { Student, filterStudentsByShift } from './attendanceLogic';

// Import face-api.js for browser use only
let faceapi: any = null;
if (typeof window !== 'undefined') {
  faceapi = require('face-api.js');
}

export interface TrackedFace {
  id: string;
  box: { x: number; y: number; width: number; height: number };
  descriptor?: Float32Array;
  name?: string;
  status: 'detecting' | 'recognizing' | 'recognized' | 'unknown';
  confidence?: number;
  message?: string;
  firstSeen: number;
  lastSeen: number;
}

// Initialize face-api.js models
export const initializeFaceApi = async (): Promise<boolean> => {
  try {
    // Ensure we're in the browser and face-api is available
    if (typeof window === 'undefined' || !faceapi) {
      throw new Error('Face-api.js not available in browser context');
    }

    console.log('Loading face detection models...');
    
    // Load models from CDN
    const MODEL_URL = '/models';
    
    await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
    await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
    
    console.log('Face-api.js models loaded successfully');
    return true;
  } catch (error) {
    console.error('Failed to load face-api.js models:', error);
    return false;
  }
};

// Detect all faces in video/image
export const detectAllFaces = async (video: HTMLVideoElement) => {
  return await faceapi
    .detectAllFaces(video)
    .withFaceLandmarks()
    .withFaceDescriptors();
};

// Calculate distance between face descriptors
export const calculateFaceDistance = (descriptor1: Float32Array, descriptor2: Float32Array): number => {
  return faceapi.euclideanDistance(descriptor1, descriptor2);
};

// Generate face descriptor from image
export const generateFaceDescriptor = async (imageElement: HTMLImageElement): Promise<Float32Array | null> => {
  try {
    const detections = await faceapi
      .detectSingleFace(imageElement)
      .withFaceLandmarks()
      .withFaceDescriptor();
    
    return detections?.descriptor || null;
  } catch (error) {
    console.error('Error generating face descriptor:', error);
    return null;
  }
};

// Face detection and recognition
export const detectFaces = async (
  video: HTMLVideoElement,
  students: Student[],
  selectedShift: string,
  recognitionThreshold: number,
  minFaceSize: number,
  maxFaceSize: number,
  trackedFaces: TrackedFace[],
  DWELL_TIME_BEFORE_RECOGNIZE: number,
  RECOGNITION_COOLDOWN: number,
  markAttendanceCallback: (student: Student) => void
): Promise<TrackedFace[]> => {
  if (video.readyState !== 4) return trackedFaces;

  try {
    const detections = await faceapi
      .detectAllFaces(video)
      .withFaceLandmarks()
      .withFaceDescriptors();

    // Filter detections by face size (distance approximation)
    const filteredDetections = detections.filter(detection => {
      const { width, height } = detection.detection.box;
      const faceSize = Math.max(width, height);
      
      const isValidSize = faceSize >= minFaceSize && faceSize <= maxFaceSize;
      
      if (!isValidSize) {
        console.log(`👁️ Face filtered out: size=${faceSize.toFixed(0)}px (range: ${minFaceSize}-${maxFaceSize}px)`);
      }
      
      return isValidSize;
    });

    console.log(`📊 Face detection: ${detections.length} total, ${filteredDetections.length} within size range`);

    const now = Date.now();
    const nextFaces: TrackedFace[] = [];
    const unmatchedDetections = [...filteredDetections];

    // Try to match existing faces with new detections
    for (const prevFace of trackedFaces) {
      let bestMatch: { detection: any, distance: number, index: number } | null = null;

      for (let i = 0; i < unmatchedDetections.length; i++) {
        const detection = unmatchedDetections[i];
        const box = detection.detection.box;
        
        // Calculate distance between face centers
        const prevCenter = {
          x: prevFace.box.x + prevFace.box.width / 2,
          y: prevFace.box.y + prevFace.box.height / 2
        };
        const newCenter = {
          x: box.x + box.width / 2,
          y: box.y + box.height / 2
        };
        
        const distance = Math.sqrt(
          Math.pow(prevCenter.x - newCenter.x, 2) + 
          Math.pow(prevCenter.y - newCenter.y, 2)
        );

        if (distance < 100 && (!bestMatch || distance < bestMatch.distance)) {
          bestMatch = { detection, distance, index: i };
        }
      }

      if (bestMatch) {
        const detection = bestMatch.detection;
        const box = detection.detection.box;
        
        nextFaces.push({
          ...prevFace,
          box: { x: box.x, y: box.y, width: box.width, height: box.height },
          descriptor: detection.descriptor,
          lastSeen: now
        });
        
        unmatchedDetections.splice(bestMatch.index, 1);
      } else {
        // Keep face for a short time after it disappears
        if (now - prevFace.lastSeen < 2000) {
          nextFaces.push(prevFace);
        }
      }
    }

    // Add new faces
    for (const detection of unmatchedDetections) {
      const box = detection.detection.box;
      nextFaces.push({
        id: `face_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        box: { x: box.x, y: box.y, width: box.width, height: box.height },
        descriptor: detection.descriptor,
        status: 'detecting',
        firstSeen: now,
        lastSeen: now,
        message: 'Hold position...'
      });
    }

    // Process faces for recognition
    return nextFaces.map(face => {
      // Check if face has been stable long enough
      if (now - face.firstSeen < DWELL_TIME_BEFORE_RECOGNIZE) {
        return { ...face, status: 'detecting', message: 'Hold position...' };
      }

      // Skip if already recognized recently
      if (face.status === 'recognized' && now - face.firstSeen < RECOGNITION_COOLDOWN) {
        return face;
      }

      // Perform recognition
      if (face.descriptor && face.status !== 'recognized') {
        // Filter students by shift using helper function
        const targetStudents = filterStudentsByShift(students.filter(s => s.faceDescriptor), selectedShift || 'All');

        console.log(`🔍 Recognition pool: ${targetStudents.length} students for shift "${selectedShift || 'All'}"`);

        let bestMatch: { student: Student, distance: number } | null = null;

        for (const student of targetStudents) {
          if (!student.faceDescriptor) continue;
          
          const storedDescriptor = new Float32Array(student.faceDescriptor);
          const distance = faceapi.euclideanDistance(face.descriptor, storedDescriptor);
          const confidence = (1 - distance) * 100;
          const requiredConfidence = (1 - recognitionThreshold) * 100;
          
          console.log(`Comparing with ${student.fullName}: distance=${distance.toFixed(3)}, confidence=${confidence.toFixed(1)}%, required=${requiredConfidence.toFixed(0)}%`);
          
          // Check if confidence meets the threshold
          if (confidence >= requiredConfidence && (!bestMatch || distance < bestMatch.distance)) {
            console.log(`✅ Valid match: ${student.fullName} with ${confidence.toFixed(1)}% confidence (need ${requiredConfidence.toFixed(0)}%+)`);
            bestMatch = { student, distance };
          } else if (confidence < requiredConfidence) {
            console.log(`❌ Below threshold: ${student.fullName} with ${confidence.toFixed(1)}% confidence (need ${requiredConfidence.toFixed(0)}%+)`);
          }
        }

        if (bestMatch) {
          const finalConfidence = (1 - bestMatch.distance) * 100;
          const requiredConfidence = (1 - recognitionThreshold) * 100;
          console.log(`🎯 Final recognition: ${bestMatch.student.fullName} with ${finalConfidence.toFixed(1)}% confidence`);
          
          // Double-check confidence threshold before marking attendance
          if (finalConfidence >= requiredConfidence) {
            // Mark attendance for the recognized student
            markAttendanceCallback(bestMatch.student);
            
            return {
              ...face,
              status: 'recognized',
              name: bestMatch.student.fullName,
              confidence: finalConfidence,
              message: `Recognized: ${bestMatch.student.fullName} (${finalConfidence.toFixed(1)}%)`
            };
          } else {
            console.log(`⚠️ Best match still below threshold, marking as unknown`);
            return {
              ...face,
              status: 'unknown',
              message: `Low confidence (${finalConfidence.toFixed(1)}% < ${requiredConfidence.toFixed(0)}%)`
            };
          }
        } else {
          console.log('❌ No valid matches found above threshold');
          return {
            ...face,
            status: 'unknown',
            message: 'No matches above confidence threshold'
          };
        }
      }

      return face;
    });
  } catch (error) {
    console.error('Face detection error:', error);
    return trackedFaces;
  }
};
