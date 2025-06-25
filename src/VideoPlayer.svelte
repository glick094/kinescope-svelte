<script lang="ts">
  import { onMount } from 'svelte';

  interface FrameData {
    t: number;
    x: number;
    y: number;
    z?: number;
  }

  interface JointData {
    frames: FrameData[];
    color: [number, number, number];
    units: string;
  }
  
  interface PoseData {
    joints: { [key: string]: JointData };
  }

  interface JointMask {
    [jointName: string]: string[];
  }

  export let videoSrc: string;
  export let setSyncedTime: (time: number) => void;
  export let videoElement: HTMLVideoElement;
  export let poseData: PoseData | null = null;
  export let syncedTime: number = 0;
  export let isLoading: boolean = false;
  export let jointMask: JointMask = {};

  let videoError: string = '';
  let overlayCanvas: HTMLCanvasElement;
  let overlayCtx: CanvasRenderingContext2D;

  onMount(() => {
    if (videoElement) {
      videoElement.src = videoSrc;
      videoElement.onloadeddata = () => {
        videoElement.pause();
        updateCanvasSize();
      };

      const updateTime = (): void => {
        setSyncedTime(videoElement.currentTime);
        drawPoseOverlay();
      };

      videoElement.addEventListener('timeupdate', updateTime);
      videoElement.addEventListener('loadedmetadata', updateCanvasSize);
      
      // Initialize overlay canvas
      setTimeout(() => {
        if (overlayCanvas) {
          overlayCtx = overlayCanvas.getContext('2d')!;
        }
      }, 100);
      
      return () => {
        videoElement.removeEventListener('timeupdate', updateTime);
        videoElement.removeEventListener('loadedmetadata', updateCanvasSize);
      };
    }
    return () => {};
  });

  $: if (videoElement && videoSrc) {
    videoElement.src = videoSrc;
    videoElement.onloadeddata = () => videoElement.pause();
    videoError = ''; // Clear previous errors
  }

  function handleVideoError(event: Event) {
    const target = event.target as HTMLVideoElement;
    videoError = target.error ? `Error ${target.error.code}: ${target.error.message}` : 'Unknown video error';
    console.error('Video error:', videoError);
  }

  function updateCanvasSize() {
    if (overlayCanvas && videoElement) {
      overlayCanvas.width = videoElement.videoWidth;
      overlayCanvas.height = videoElement.videoHeight;
    }
  }

  function drawPoseOverlay() {
    if (!overlayCtx || !poseData || !videoElement || !overlayCanvas) {
      return;
    }
    
    // Clear previous drawings
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    
    // Find pose data for current time
    const currentTime = syncedTime;
    const tolerance = 0.1; // 100ms tolerance
    
    // Draw pose landmarks
    Object.entries(poseData.joints).forEach(([jointName, jointData]: [string, JointData]) => {
      // Find the frame closest to current time
      const frame = jointData.frames.find((f: FrameData) => Math.abs(f.t - currentTime) < tolerance);
      if (frame) {
        // Check if this joint is selected for display
        const isSelected = jointMask[jointName] && jointMask[jointName].length > 0;
        drawLandmark(
          frame.x * overlayCanvas.width, 
          frame.y * overlayCanvas.height, 
          jointName, 
          jointData.color,
          isSelected
        );
      }
    });
    
    // Draw pose connections
    drawPoseConnections(currentTime);
  }

  function drawLandmark(x: number, y: number, jointName: string, color: [number, number, number], isSelected: boolean = false) {
    if (!overlayCtx) return;
    
    if (isSelected) {
      // Draw full colored landmark with label for selected joints
      overlayCtx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
      overlayCtx.strokeStyle = 'white';
      overlayCtx.lineWidth = 2;
      
      // Draw larger circle
      overlayCtx.beginPath();
      overlayCtx.arc(x, y, 6, 0, 2 * Math.PI);
      overlayCtx.fill();
      overlayCtx.stroke();
      
      // Draw label
      overlayCtx.fillStyle = 'white';
      overlayCtx.font = '12px Arial';
      overlayCtx.fillText(jointName.replace('_', ' '), x + 8, y - 8);
    } else {
      // Draw small white dot for unselected joints
      overlayCtx.fillStyle = 'white';
      overlayCtx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      overlayCtx.lineWidth = 1;
      
      // Draw smaller circle
      overlayCtx.beginPath();
      overlayCtx.arc(x, y, 3, 0, 2 * Math.PI);
      overlayCtx.fill();
      overlayCtx.stroke();
    }
  }

  function drawPoseConnections(currentTime: number) {
    if (!overlayCtx || !poseData) return;
    
    const tolerance = 0.1;
    const connections = [
      // Arms
      ['left_shoulder', 'left_elbow'],
      ['left_elbow', 'left_wrist'],
      ['right_shoulder', 'right_elbow'],
      ['right_elbow', 'right_wrist'],
      // Body
      ['left_shoulder', 'right_shoulder'],
      ['left_shoulder', 'left_hip'],
      ['right_shoulder', 'right_hip'],
      ['left_hip', 'right_hip'],
      // Legs
      ['left_hip', 'left_knee'],
      ['left_knee', 'left_ankle'],
      ['right_hip', 'right_knee'],
      ['right_knee', 'right_ankle']
    ];
    
    overlayCtx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    overlayCtx.lineWidth = 3;
    
    connections.forEach(([joint1, joint2]) => {
      const frame1 = poseData!.joints[joint1]?.frames.find((f: FrameData) => Math.abs(f.t - currentTime) < tolerance);
      const frame2 = poseData!.joints[joint2]?.frames.find((f: FrameData) => Math.abs(f.t - currentTime) < tolerance);
      
      if (frame1 && frame2) {
        overlayCtx.beginPath();
        overlayCtx.moveTo(frame1.x * overlayCanvas.width, frame1.y * overlayCanvas.height);
        overlayCtx.lineTo(frame2.x * overlayCanvas.width, frame2.y * overlayCanvas.height);
        overlayCtx.stroke();
      }
    });
  }

  // Reactive statement to redraw when pose data or synced time changes
  $: if (poseData && syncedTime !== undefined) {
    drawPoseOverlay();
  }
</script>

<!-- Video player with pose overlay -->
<div class="video-container">
  <video bind:this={videoElement} class="video-player" on:error={handleVideoError}>
    <track kind="captions" label="No captions available" default />
    Your browser does not support the video tag.
  </video>
  <canvas bind:this={overlayCanvas} class="pose-overlay"></canvas>
  
  {#if isLoading}
    <div class="video-loading-overlay">
      <div class="loading-spinner">
        <i class="fas fa-spinner fa-spin"></i>
      </div>
      <div class="loading-text">Processing pose landmarks...</div>
    </div>
  {/if}
</div>

{#if videoError}
  <div class="error-message">
    Error loading video: {videoError}
    <br>
    <small>Try a different video format (MP4, WebM recommended)</small>
  </div>
{/if}

<style>
  .video-container {
    position: relative;
    width: 100%;
    max-width: 500px;
    max-height: 400px;
    border: 2px solid #ddd;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }

  .video-player {
    width: 100%;
    height: auto;
    display: block;
  }

  .pose-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 1;
  }

  .video-loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 10;
    color: white;
  }

  .video-loading-overlay .loading-spinner {
    font-size: 2rem;
    margin-bottom: 1rem;
  }

  .video-loading-overlay .loading-text {
    font-weight: 500;
    text-align: center;
  }

  .error-message {
    color: #e74c3c;
    background-color: #fdf2f2;
    border: 1px solid #f5c6cb;
    border-radius: 4px;
    padding: 10px;
    margin-top: 10px;
    text-align: center;
    font-size: 14px;
  }
</style>