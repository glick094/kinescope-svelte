import type { FrameData, JointData } from '../types';

// Define Results interface locally to avoid SSR issues
interface Results {
  poseLandmarks?: Array<{x: number, y: number, z: number, visibility: number}>;
}

export interface PoseProcessingResult {
  joints: { [key: string]: JointData };
  processingComplete: boolean;
  progress: number;
}

export interface PoseProcessorOptions {
  mediapipeSettings?: {
    modelComplexity?: number;
    minDetectionConfidence?: number;
    minTrackingConfidence?: number;
    smoothLandmarks?: boolean;
    selfieMode?: boolean;
  };
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
      console.log('Initializing MediaPipe Pose...');
      
      // Dynamic import to avoid SSR issues
      const { Pose } = await import('@mediapipe/pose');
      
      this.pose = new Pose({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
        }
      });

      // Use provided settings or defaults
      const settings = this.options.mediapipeSettings || {};
      this.pose.setOptions({
        modelComplexity: settings.modelComplexity ?? 1,
        smoothLandmarks: settings.smoothLandmarks ?? true,
        enableSegmentation: false,
        smoothSegmentation: false,
        minDetectionConfidence: settings.minDetectionConfidence ?? 0.5,
        minTrackingConfidence: settings.minTrackingConfidence ?? 0.5,
        selfieMode: settings.selfieMode ?? false
      });
      
      // Wait for pose to initialize
      await this.pose.initialize();
      console.log('MediaPipe Pose initialized successfully');
      
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

    // Wait for video to be fully loaded
    if (videoElement.readyState < 3) {
      console.log('Video not fully loaded, waiting...');
      await new Promise<void>((resolve) => {
        const loadHandler = () => {
          videoElement.removeEventListener('canplay', loadHandler);
          console.log('Video is now ready for processing');
          resolve();
        };
        videoElement.addEventListener('canplay', loadHandler);
        
        // Timeout after 5 seconds
        setTimeout(() => {
          videoElement.removeEventListener('canplay', loadHandler);
          console.log('Video load timeout, proceeding anyway');
          resolve();
        }, 5000);
      });
    }

    console.log(`Video readyState: ${videoElement.readyState}, duration: ${videoElement.duration}`);
    console.log(`Video dimensions: ${videoElement.videoWidth}x${videoElement.videoHeight}`);

    // Pause video for processing
    const wasPlaying = !videoElement.paused;
    videoElement.pause();

    this.isProcessing = true;
    const duration = videoElement.duration;
    const frameRate = 30; // Process every frame at 30fps
    const frameCount = Math.floor(duration * frameRate);
    
    // Pre-size canvas once
    this.canvas.width = videoElement.videoWidth || 640;
    this.canvas.height = videoElement.videoHeight || 480;
    
    const joints: { [key: string]: JointData } = {};
    
    // Initialize joint data structures
    Object.keys(POSE_LANDMARKS).forEach(jointName => {
      joints[jointName] = {
        frames: [],
        color: JOINT_COLORS[jointName] || [128, 128, 128],
        units: 'normalized'
      };
    });

    console.log(`Starting MediaPipe processing: ${frameCount} frames at ${frameRate}fps`);
    
    try {
      // Start video playback and capture frames as they play
      videoElement.currentTime = 0;
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait for seek to complete
      
      videoElement.playbackRate = 0.25; // Slow down playback for better frame capture
      videoElement.play();
      
      let frameIndex = 0;
      let lastProcessedTime = -1;
      const frameInterval = 1 / frameRate; // Time between frames we want to process
      
      const processCurrentFrame = async () => {
        if (!this.isProcessing || frameIndex >= frameCount) {
          return;
        }
        
        const currentTime = videoElement.currentTime;
        const expectedTime = frameIndex * frameInterval;
        
        // Only process if we're close to the expected time for this frame
        if (currentTime >= expectedTime && currentTime > lastProcessedTime + frameInterval * 0.5) {
          console.log(`Processing frame ${frameIndex + 1}/${frameCount} (${((frameIndex + 1) / frameCount * 100).toFixed(1)}%) at time ${currentTime.toFixed(3)}s`);
          
          // Capture and process frame
          const frameData = await this.captureCurrentFrame(videoElement, frameIndex);
          
          if (frameData) {
            this.processResults(frameData, joints, currentTime);
          }
          
          lastProcessedTime = currentTime;
          frameIndex++;
          
          // Update progress
          const progress = frameIndex / frameCount;
          this.options.onProgress?.(progress);
        }
        
        // Schedule next frame check
        if (frameIndex < frameCount && this.isProcessing) {
          requestAnimationFrame(() => processCurrentFrame());
        } else {
          videoElement.pause();
          if (wasPlaying) {
            videoElement.play();
          }
        }
      };
      
      // Start processing
      processCurrentFrame();
      
      // Wait for all frames to be processed
      while (frameIndex < frameCount && this.isProcessing) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Restore video state
      if (wasPlaying) {
        videoElement.play();
      }
      
      this.isProcessing = false;
      const result: PoseProcessingResult = {
        joints,
        processingComplete: true,
        progress: 1.0
      };
      
      console.log('MediaPipe processing complete:', result);
      console.log('Total frames processed:', Object.keys(joints).length > 0 ? joints[Object.keys(joints)[0]].frames.length : 0);
      
      this.options.onComplete?.(result);
      return result;
      
    } catch (error) {
      // Restore video state
      if (wasPlaying) {
        videoElement.play();
      }
      
      this.isProcessing = false;
      console.error('Processing failed:', error);
      this.options.onError?.(error.toString());
      throw error;
    }
  }

  private async captureCurrentFrame(videoElement: HTMLVideoElement, frameIndex: number): Promise<Results | null> {
    return new Promise<Results | null>((resolve) => {
      try {
        // Ensure video is ready to draw
        if (videoElement.readyState < 2) {
          console.warn(`Frame ${frameIndex}: Video not ready (readyState: ${videoElement.readyState})`);
          resolve(null);
          return;
        }
        
        // Clear and draw to canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(videoElement, 0, 0, this.canvas.width, this.canvas.height);
        
        // Set up one-time result handler
        const resultHandler = (results: Results) => {
          this.pose.onResults(() => {}); // Clear the handler
          resolve(results);
        };
        
        // Set up timeout
        const timeoutId = setTimeout(() => {
          this.pose.onResults(() => {}); // Clear the handler
          console.warn(`Frame ${frameIndex}: MediaPipe processing timeout`);
          resolve(null);
        }, 1000);
        
        // Set result handler and send frame
        this.pose.onResults((results: Results) => {
          clearTimeout(timeoutId);
          resultHandler(results);
        });
        
        this.pose.send({ image: this.canvas });
        
      } catch (error) {
        console.error(`Frame ${frameIndex}: Error processing frame:`, error);
        resolve(null);
      }
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
            y: 1 - landmark.y, // Flip Y coordinate to match CSV processing
            z: landmark.z,
            visibility: landmark.visibility || 1.0
          };
          joints[jointName].frames.push(frameData);
        }
      }
    }
  }

  private cleanup() {
    // Clear canvas
    if (this.canvas && this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }



  stopProcessing() {
    this.isProcessing = false;
    this.cleanup();
    console.log('Pose processing stopped and cleaned up');
  }

  isCurrentlyProcessing(): boolean {
    return this.isProcessing;
  }
}