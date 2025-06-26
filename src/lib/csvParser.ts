import type { PoseProcessingResult } from './poseProcessor';

// Define MediaPipe pose landmark mappings
const POSE_LANDMARKS = {
  0: 'nose',
  1: 'left_eye_inner',
  2: 'left_eye',
  3: 'left_eye_outer',
  4: 'right_eye_inner',
  5: 'right_eye',
  6: 'right_eye_outer',
  7: 'left_ear',
  8: 'right_ear',
  9: 'mouth_left',
  10: 'mouth_right',
  11: 'left_shoulder',
  12: 'right_shoulder',
  13: 'left_elbow',
  14: 'right_elbow',
  15: 'left_wrist',
  16: 'right_wrist',
  17: 'left_pinky',
  18: 'right_pinky',
  19: 'left_index',
  20: 'right_index',
  21: 'left_thumb',
  22: 'right_thumb',
  23: 'left_hip',
  24: 'right_hip',
  25: 'left_knee',
  26: 'right_knee',
  27: 'left_ankle',
  28: 'right_ankle',
  29: 'left_heel',
  30: 'right_heel',
  31: 'left_foot_index',
  32: 'right_foot_index'
};

// Generate colors for each landmark
function generateLandmarkColor(index: number): [number, number, number] {
  // Use HSV to generate diverse colors
  const hue = (index * 137.508) % 360; // Golden angle approximation
  const saturation = 70 + (index % 3) * 10; // Vary saturation slightly
  const value = 80 + (index % 2) * 20; // Vary brightness slightly
  
  return hsvToRgb(hue / 360, saturation / 100, value / 100);
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const c = v * s;
  const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
  const m = v - c;
  
  let r = 0, g = 0, b = 0;
  
  if (h < 1/6) { r = c; g = x; b = 0; }
  else if (h < 2/6) { r = x; g = c; b = 0; }
  else if (h < 3/6) { r = 0; g = c; b = x; }
  else if (h < 4/6) { r = 0; g = x; b = c; }
  else if (h < 5/6) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255)
  ];
}

export function parseCSVToPoseData(csvContent: string): PoseProcessingResult {
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',');
  
  // Find column indices
  const frameTimeIndex = headers.indexOf('frame_time_ms');
  
  // Initialize pose data structure
  const joints: { [key: string]: any } = {};
  
  // Initialize all pose landmarks
  for (let i = 0; i <= 32; i++) {
    const landmarkName = POSE_LANDMARKS[i as keyof typeof POSE_LANDMARKS];
    if (landmarkName) {
      joints[landmarkName] = {
        frames: [],
        color: generateLandmarkColor(i),
        units: 'normalized'
      };
    }
  }
  
  // Process each data row
  for (let rowIndex = 1; rowIndex < lines.length; rowIndex++) {
    const values = lines[rowIndex].split(',');
    
    if (values.length < headers.length) continue; // Skip incomplete rows
    
    // Get frame time in seconds
    const frameTimeMs = parseFloat(values[frameTimeIndex]);
    const frameTimeSeconds = frameTimeMs / 1000;
    
    // Process pose landmarks
    for (let poseIndex = 0; poseIndex <= 32; poseIndex++) {
      const landmarkName = POSE_LANDMARKS[poseIndex as keyof typeof POSE_LANDMARKS];
      if (!landmarkName) continue;
      
      const xIndex = headers.indexOf(`pose_${poseIndex}_x`);
      const yIndex = headers.indexOf(`pose_${poseIndex}_y`);
      const zIndex = headers.indexOf(`pose_${poseIndex}_z`);
      const visibilityIndex = headers.indexOf(`pose_${poseIndex}_visibility`);
      
      if (xIndex === -1 || yIndex === -1 || zIndex === -1 || visibilityIndex === -1) continue;
      
      const x = parseFloat(values[xIndex]);
      const y = parseFloat(values[yIndex]);
      const z = parseFloat(values[zIndex]);
      const visibility = parseFloat(values[visibilityIndex]);
      
      // Only add frame if landmark is visible and has valid coordinates
      if (!isNaN(x) && !isNaN(y) && !isNaN(z) && visibility > 0.5) {
        joints[landmarkName].frames.push({
          t: frameTimeSeconds,
          x: x,
          y: 1 - y, // Flip Y coordinate so 0 is at bottom, 1 is at top
          z: z
        });
      }
    }
  }
  
  // Add some composite landmarks that are commonly used
  const compositeJoints = {
    'left_hand': joints['left_wrist'],
    'right_hand': joints['right_wrist'],
    'center_hip': {
      frames: [] as Array<{ t: number; x: number; y: number; z: number }>,
      color: [128, 128, 128] as [number, number, number],
      units: 'normalized'
    }
  };
  
  // Calculate center hip as midpoint between left and right hip
  if (joints['left_hip'] && joints['right_hip']) {
    const leftHipFrames = joints['left_hip'].frames;
    const rightHipFrames = joints['right_hip'].frames;
    
    for (const leftFrame of leftHipFrames) {
      const rightFrame = rightHipFrames.find((f: any) => Math.abs(f.t - leftFrame.t) < 0.1);
      if (rightFrame) {
        compositeJoints['center_hip'].frames.push({
          t: leftFrame.t,
          x: (leftFrame.x + rightFrame.x) / 2,
          y: (leftFrame.y + rightFrame.y) / 2,
          z: (leftFrame.z + rightFrame.z) / 2
        });
      }
    }
  }
  
  // Add composite joints to main joints object
  Object.assign(joints, compositeJoints);
  
  console.log('Parsed CSV data:', {
    totalLandmarks: Object.keys(joints).length,
    sampleJoint: joints['nose'] ? `${joints['nose'].frames.length} frames` : 'no nose data',
    frameRange: joints['nose'] && joints['nose'].frames.length > 0 ? 
      `${joints['nose'].frames[0].t}s - ${joints['nose'].frames[joints['nose'].frames.length - 1].t}s` : 'no data'
  });
  
  return { 
    joints,
    processingComplete: true,
    progress: 1.0
  };
}

export async function loadCSVFile(file: File, videoDuration?: number): Promise<PoseProcessingResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const csvContent = event.target?.result as string;
        const result = parseCSVToPoseData(csvContent);
        
        // Validate against video duration if provided
        if (videoDuration && videoDuration > 0) {
          const validation = validateCSVAgainstVideo(result, videoDuration);
          if (!validation.isValid) {
            console.warn('CSV validation warnings:', validation.warnings);
            // Still resolve but log warnings
          }
        }
        
        resolve(result);
      } catch (error) {
        reject(new Error(`Failed to parse CSV: ${error}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
}

interface ValidationResult {
  isValid: boolean;
  warnings: string[];
  csvDuration?: number;
  videoDuration?: number;
  frameCountMismatch?: boolean;
}

function validateCSVAgainstVideo(result: PoseProcessingResult, videoDuration: number): ValidationResult {
  const warnings: string[] = [];
  let isValid = true;
  
  // Get sample joint to check time range
  const sampleJoint = Object.values(result.joints).find(joint => joint.frames.length > 0);
  if (!sampleJoint) {
    return { isValid: false, warnings: ['No valid pose data found in CSV'] };
  }
  
  const frames = sampleJoint.frames;
  const minTime = Math.min(...frames.map(f => f.t));
  const maxTime = Math.max(...frames.map(f => f.t));
  const csvDuration = maxTime - minTime;
  
  // Check if CSV duration is significantly different from video duration
  const durationDifference = Math.abs(csvDuration - videoDuration);
  const tolerancePercent = 0.1; // 10% tolerance
  
  if (durationDifference > videoDuration * tolerancePercent) {
    warnings.push(
      `Duration mismatch: CSV data spans ${csvDuration.toFixed(2)}s but video is ${videoDuration.toFixed(2)}s`
    );
    isValid = false;
  }
  
  // Check if CSV starts significantly after video start
  if (minTime > 0.5) {
    warnings.push(`CSV data starts at ${minTime.toFixed(2)}s, not at video start (0s)`);
  }
  
  // Check if CSV ends before video ends
  if (maxTime < videoDuration - 0.5) {
    warnings.push(`CSV data ends at ${maxTime.toFixed(2)}s but video ends at ${videoDuration.toFixed(2)}s`);
  }
  
  return {
    isValid,
    warnings,
    csvDuration,
    videoDuration,
    frameCountMismatch: durationDifference > videoDuration * tolerancePercent
  };
}