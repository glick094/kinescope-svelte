import type { FrameData, JointData } from '../types';

// Define Results interface locally to avoid SSR issues
interface Results {
  poseLandmarks?: Array<{x: number, y: number, z: number}>;
}

export interface PoseProcessingResult {
  joints: { [key: string]: JointData };
  processingComplete: boolean;
  progress: number;
}

export interface PoseProcessorOptions {
  onProgress?: (progress: number) => void;
  onComplete?: (result: PoseProcessingResult) => void;
  onError?: (error: string) => void;
}

// MediaPipe pose landmark indices and names
const POSE_LANDMARKS = {
  'nose': 0,
  'left_eye_inner': 1,
  'left_eye': 2,
  'left_eye_outer': 3,
  'right_eye_inner': 4,
  'right_eye': 5,
  'right_eye_outer': 6,
  'left_ear': 7,
  'right_ear': 8,
  'mouth_left': 9,
  'mouth_right': 10,
  'left_shoulder': 11,
  'right_shoulder': 12,
  'left_elbow': 13,
  'right_elbow': 14,
  'left_wrist': 15,
  'right_wrist': 16,
  'left_pinky': 17,
  'right_pinky': 18,
  'left_index': 19,
  'right_index': 20,
  'left_thumb': 21,
  'right_thumb': 22,
  'left_hip': 23,
  'right_hip': 24,
  'left_knee': 25,
  'right_knee': 26,
  'left_ankle': 27,
  'right_ankle': 28,
  'left_heel': 29,
  'right_heel': 30,
  'left_foot_index': 31,
  'right_foot_index': 32
};

// Colors for different joint groups
const JOINT_COLORS: { [key: string]: [number, number, number] } = {
  'nose': [255, 255, 0],
  'left_eye_inner': [0, 255, 255],
  'left_eye': [0, 255, 255],
  'left_eye_outer': [0, 255, 255],
  'right_eye_inner': [255, 0, 255],
  'right_eye': [255, 0, 255],
  'right_eye_outer': [255, 0, 255],
  'left_ear': [0, 255, 255],
  'right_ear': [255, 0, 255],
  'mouth_left': [128, 255, 128],
  'mouth_right': [128, 255, 128],
  'left_shoulder': [0, 255, 0],
  'right_shoulder': [255, 0, 0],
  'left_elbow': [0, 255, 0],
  'right_elbow': [255, 0, 0],
  'left_wrist': [0, 255, 0],
  'right_wrist': [255, 0, 0],
  'left_pinky': [0, 200, 0],
  'right_pinky': [200, 0, 0],
  'left_index': [0, 200, 0],
  'right_index': [200, 0, 0],
  'left_thumb': [0, 200, 0],
  'right_thumb': [200, 0, 0],
  'left_hip': [0, 150, 255],
  'right_hip': [255, 150, 0],
  'left_knee': [0, 150, 255],
  'right_knee': [255, 150, 0],
  'left_ankle': [0, 150, 255],
  'right_ankle': [255, 150, 0],
  'left_heel': [0, 100, 255],
  'right_heel': [255, 100, 0],
  'left_foot_index': [0, 100, 255],
  'right_foot_index': [255, 100, 0]
};

export class PoseProcessor {
  private pose: any;
  private isProcessing: boolean = false;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private options: PoseProcessorOptions;

  constructor(options: PoseProcessorOptions = {}) {
    this.options = options;
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    this.pose = null;
  }

  private async initializePose() {
    if (typeof window === 'undefined') return;
    
    try {
      // Dynamic import to avoid SSR issues
      const { Pose } = await import('@mediapipe/pose');
      
      this.pose = new Pose({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
        }
      });

      this.pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });
    } catch (error) {
      console.error('Failed to initialize MediaPipe Pose:', error);
      throw error;
    }
  }

  async processVideo(videoElement: HTMLVideoElement): Promise<PoseProcessingResult> {
    if (this.isProcessing) {
      throw new Error('Pose processing already in progress');
    }

    // Initialize pose if not already done
    if (!this.pose) {
      await this.initializePose();
    }

    this.isProcessing = true;
    const duration = videoElement.duration;
    const frameRate = 30; // Assume 30 fps, can be made configurable
    const frameCount = Math.floor(duration * frameRate);
    
    const joints: { [key: string]: JointData } = {};
    
    // Initialize joint data structures
    Object.keys(POSE_LANDMARKS).forEach(jointName => {
      joints[jointName] = {
        frames: [],
        color: JOINT_COLORS[jointName] || [128, 128, 128],
        units: 'normalized'
      };
    });

    let processedFrames = 0;
    
    return new Promise((resolve, reject) => {
      this.pose.onResults((results: Results) => {
        this.processResults(results, joints, videoElement.currentTime);
        processedFrames++;
        
        const progress = processedFrames / frameCount;
        this.options.onProgress?.(progress);
        
        if (processedFrames >= frameCount) {
          this.isProcessing = false;
          const result: PoseProcessingResult = {
            joints,
            processingComplete: true,
            progress: 1.0
          };
          this.options.onComplete?.(result);
          resolve(result);
        } else {
          // Process next frame
          this.processNextFrame(videoElement, frameRate, processedFrames);
        }
      });

      // Start processing
      this.processNextFrame(videoElement, frameRate, 0);
    });
  }

  private async processNextFrame(videoElement: HTMLVideoElement, frameRate: number, frameIndex: number) {
    const timeToSeek = frameIndex / frameRate;
    
    return new Promise<void>((resolve) => {
      const seekHandler = () => {
        videoElement.removeEventListener('seeked', seekHandler);
        
        // Draw current frame to canvas
        this.canvas.width = videoElement.videoWidth;
        this.canvas.height = videoElement.videoHeight;
        this.ctx.drawImage(videoElement, 0, 0);
        
        // Send frame to MediaPipe
        this.pose.send({ image: this.canvas });
        resolve();
      };
      
      videoElement.addEventListener('seeked', seekHandler);
      videoElement.currentTime = timeToSeek;
    });
  }

  private processResults(results: Results, joints: { [key: string]: JointData }, timestamp: number) {
    if (results.poseLandmarks) {
      for (const [jointName, landmarkIndex] of Object.entries(POSE_LANDMARKS) as [string, number][]) {
        const landmark = results.poseLandmarks![landmarkIndex];
        if (landmark) {
          const frameData: FrameData = {
            t: timestamp,
            x: landmark.x,
            y: landmark.y,
            z: landmark.z
          };
          joints[jointName].frames.push(frameData);
        }
      }
    }
  }

  stopProcessing() {
    this.isProcessing = false;
  }

  isCurrentlyProcessing(): boolean {
    return this.isProcessing;
  }
}