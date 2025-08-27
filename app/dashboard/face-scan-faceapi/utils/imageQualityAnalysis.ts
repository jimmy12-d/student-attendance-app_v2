// Image quality analysis utilities for face enrollment
let faceapi: any = null;
if (typeof window !== 'undefined') {
  faceapi = require('face-api.js');
}

export interface QualityAnalysisResult {
  pass: boolean;
  reason?: string;
  score: number;
}

// Image quality analysis for enrollment
export const analyzeImageQuality = async (imageElement: HTMLImageElement): Promise<QualityAnalysisResult> => {
  try {
    // Get face detection with landmarks
    const detection = await faceapi
      .detectSingleFace(imageElement)
      .withFaceLandmarks();

    if (!detection) {
      return { pass: false, reason: "No face detected in the image", score: 0 };
    }

    const { box } = detection.detection;
    const landmarks = detection.landmarks;
    
    let qualityScore = 100;
    const issues: string[] = [];

    // 1. Face size check - should be at least 120x120 pixels for good quality
    const faceSize = Math.min(box.width, box.height);
    if (faceSize < 120) {
      issues.push("Face is too small (move closer to camera)");
      qualityScore -= 25;
    } else if (faceSize < 80) {
      return { pass: false, reason: "Face is too small - please move closer to the camera", score: 0 };
    }

    // 2. Face position and angle analysis using landmarks
    if (landmarks) {
      // Get key facial points
      const leftEye = landmarks.getLeftEye();
      const rightEye = landmarks.getRightEye();
      const nose = landmarks.getNose();

      // Check if face is roughly frontal by examining eye positions
      const eyeDistance = Math.abs(leftEye[0].x - rightEye[0].x);
      const eyeLevel = Math.abs(leftEye[0].y - rightEye[0].y);
      
      // If eyes are not level (head is tilted), deduct points
      if (eyeLevel > eyeDistance * 0.15) {
        issues.push("Head appears tilted - please keep head straight");
        qualityScore -= 20;
      }

      // Check for profile view - if one eye is much closer to nose than the other
      const leftEyeToNose = Math.abs(leftEye[0].x - nose[0].x);
      const rightEyeToNose = Math.abs(rightEye[0].x - nose[0].x);
      const eyeDistanceRatio = Math.abs(leftEyeToNose - rightEyeToNose) / eyeDistance;
      
      if (eyeDistanceRatio > 0.3) {
        issues.push("Face not frontal - please look directly at camera");
        qualityScore -= 25;
      }
    }

    // 3. Face positioning in frame
    const imageWidth = imageElement.width || imageElement.naturalWidth;
    const imageHeight = imageElement.height || imageElement.naturalHeight;
    
    // Check if face is centered
    const faceCenterX = box.x + box.width / 2;
    const faceCenterY = box.y + box.height / 2;
    const imageCenterX = imageWidth / 2;
    const imageCenterY = imageHeight / 2;
    
    const offsetX = Math.abs(faceCenterX - imageCenterX) / imageWidth;
    const offsetY = Math.abs(faceCenterY - imageCenterY) / imageHeight;
    
    if (offsetX > 0.2 || offsetY > 0.2) {
      issues.push("Face not centered in frame");
      qualityScore -= 15;
    }

    // 4. Face takes up appropriate portion of image
    const faceArea = box.width * box.height;
    const imageArea = imageWidth * imageHeight;
    const faceRatio = faceArea / imageArea;
    
    if (faceRatio < 0.05) {
      issues.push("Face too small in frame - move closer");
      qualityScore -= 20;
    } else if (faceRatio > 0.6) {
      issues.push("Face too large in frame - move back slightly");
      qualityScore -= 15;
    }

    // 5. Basic image quality checks
    // Check if image is too small overall
    if (imageWidth < 200 || imageHeight < 200) {
      issues.push("Image resolution too low");
      qualityScore -= 30;
    }

    // 6. Determine pass/fail based on score and critical issues
    const criticalIssues = issues.filter(issue => 
      issue.includes("No face") || 
      issue.includes("too small") || 
      issue.includes("resolution too low")
    );

    if (qualityScore < 60 || criticalIssues.length > 0) {
      return { 
        pass: false, 
        reason: issues.length > 0 ? issues[0] : "Image quality insufficient for enrollment",
        score: qualityScore 
      };
    }

    // If there are minor issues but still passing
    if (issues.length > 0 && qualityScore >= 75) {
      console.log(`⚠️ Image quality warnings: ${issues.join(', ')} (Score: ${qualityScore})`);
    }

    return { 
      pass: true, 
      score: qualityScore,
      ...(issues.length > 0 && { reason: `Acceptable quality with minor issues: ${issues.join(', ')}` })
    };

  } catch (error) {
    console.error('Error analyzing image quality:', error);
    return { pass: false, reason: "Failed to analyze image quality", score: 0 };
  }
};

// Helper function to convert Google Drive URLs to proper direct access format
export const convertGoogleDriveUrl = (url: string): string => {
  if (!url || !url.includes('drive.google.com')) {
    return url;
  }

  // Extract file ID from different Google Drive URL formats
  let fileId = '';
  
  // Format 1: https://drive.google.com/open?id=FILE_ID
  const openMatch = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  if (openMatch) {
    fileId = openMatch[1];
  }
  
  // Format 2: https://drive.google.com/file/d/FILE_ID/view?usp=sharing
  const fileMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) {
    fileId = fileMatch[1];
  }
  
  // If we found a file ID, convert to the proper format
  if (fileId) {
    const convertedUrl = `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
    console.log(`🔄 Converted Google Drive URL: ${url} → ${convertedUrl}`);
    return convertedUrl;
  }
  
  // Return original URL if no conversion needed
  return url;
};
