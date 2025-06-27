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

  // Color-blind friendly palette - same as ScatterPlot
  const colorPalette = [
    '#cc6677', // rose
    '#332288', // indigo  
    '#ddcc77', // khaki
    '#117733', // forest green
    '#88ccee', // sky blue
    '#882255', // maroon
    '#44aa99', // teal
    '#999933', // olive green
    '#aa4499', // violet
    '#dddddd', // light gray
  ];

  function getJointColor(jointName: string): [number, number, number] {
    // Get selected joints in order
    const selectedJoints = Object.keys(jointMask).filter(joint => 
      jointMask[joint].includes("x") && jointMask[joint].includes("y")
    );
    
    const jointIndex = selectedJoints.indexOf(jointName);
    if (jointIndex === -1) {
      // Fallback to original color if joint not selected
      return poseData?.joints[jointName]?.color || [128, 128, 128];
    }
    
    const paletteColor = colorPalette[jointIndex % colorPalette.length];
    // Convert hex to RGB
    const hex = paletteColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    return [r, g, b];
  }

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
      
      // Update canvas size when container is resized
      const resizeObserver = new ResizeObserver(() => {
        updateCanvasSize();
      });
      if (overlayCanvas.parentElement) {
        resizeObserver.observe(overlayCanvas.parentElement);
      }
      
      // Initialize overlay canvas
      setTimeout(() => {
        if (overlayCanvas) {
          overlayCtx = overlayCanvas.getContext('2d')!;
        }
      }, 100);
      
      return () => {
        videoElement.removeEventListener('timeupdate', updateTime);
        videoElement.removeEventListener('loadedmetadata', updateCanvasSize);
        resizeObserver.disconnect();
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
      // Size canvas to match the container, not the video intrinsic size
      const container = overlayCanvas.parentElement;
      if (container) {
        overlayCanvas.width = container.clientWidth;
        overlayCanvas.height = container.clientHeight;
      }
    }
  }

  function getVideoDisplayDimensions() {
    if (!videoElement || !overlayCanvas) return null;
    
    const container = overlayCanvas.parentElement;
    if (!container) return null;
    
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const videoAspectRatio = videoElement.videoWidth / videoElement.videoHeight;
    const containerAspectRatio = containerWidth / containerHeight;
    
    let displayWidth, displayHeight, offsetX, offsetY;
    
    if (videoAspectRatio > containerAspectRatio) {
      // Video is wider - fit to container width
      displayWidth = containerWidth;
      displayHeight = containerWidth / videoAspectRatio;
      offsetX = 0;
      offsetY = (containerHeight - displayHeight) / 2;
    } else {
      // Video is taller - fit to container height  
      displayHeight = containerHeight;
      displayWidth = containerHeight * videoAspectRatio;
      offsetX = (containerWidth - displayWidth) / 2;
      offsetY = 0;
    }
    
    return { displayWidth, displayHeight, offsetX, offsetY };
  }

  function drawPoseOverlay() {
    if (!overlayCtx || !poseData || !videoElement || !overlayCanvas) {
      return;
    }
    
    // Clear previous drawings
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    
    // Find pose data for current time with improved synchronization
    const currentTime = syncedTime;
    let hasAnyPoseData = false;
    
    // Get actual video display dimensions
    const videoDimensions = getVideoDisplayDimensions();
    if (!videoDimensions) return;
    
    // Draw pose landmarks
    Object.entries(poseData.joints).forEach(([jointName, jointData]: [string, JointData]) => {
      // Find the frame closest to current time using optimized search
      const frame = findClosestFrame(jointData.frames, currentTime);
      if (frame) {
        hasAnyPoseData = true;
        // Check if this joint is selected for display
        const isSelected = jointMask[jointName] && jointMask[jointName].length > 0;
        
        // Map pose coordinates to actual displayed video area
        const x = videoDimensions.offsetX + (frame.x * videoDimensions.displayWidth);
        const y = videoDimensions.offsetY + ((1 - frame.y) * videoDimensions.displayHeight);
        
        drawLandmark(x, y, jointName, getJointColor(jointName), isSelected, frame.visibility || 1.0);
      }
    });
    
    // Draw pose connections only if we have pose data
    if (hasAnyPoseData) {
      drawPoseConnections(currentTime);
    }
    
    // Draw status indicator
    drawPoseStatusIndicator(hasAnyPoseData, currentTime);
  }

  function drawPoseStatusIndicator(hasPoseData: boolean, currentTime: number) {
    if (!overlayCtx || !overlayCanvas) return;
    
    const videoDimensions = getVideoDisplayDimensions();
    if (!videoDimensions) return;
    
    const indicatorSize = 10;
    const margin = 15;
    // Position indicator relative to actual video display area
    const x = videoDimensions.offsetX + videoDimensions.displayWidth - margin - indicatorSize;
    const y = videoDimensions.offsetY + margin + indicatorSize;
    
    // Draw background circle
    overlayCtx.beginPath();
    overlayCtx.arc(x, y, indicatorSize, 0, 2 * Math.PI);
    overlayCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    overlayCtx.fill();
    
    // Draw status indicator
    overlayCtx.beginPath();
    overlayCtx.arc(x, y, indicatorSize - 3, 0, 2 * Math.PI);
    if (hasPoseData) {
      overlayCtx.fillStyle = '#28a745'; // Green for pose data available
    } else {
      overlayCtx.fillStyle = '#6c757d'; // Gray for no pose data
    }
    overlayCtx.fill();
    
    // Add text label
    overlayCtx.fillStyle = 'white';
    overlayCtx.font = '13px Arial';
    overlayCtx.textAlign = 'right';
    const statusText = hasPoseData ? 'POSE' : 'NO POSE';
    overlayCtx.fillText(statusText, x + indicatorSize + 35, y + 4);
    
    // Add timestamp
    overlayCtx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    overlayCtx.font = '12px Arial';
    overlayCtx.fillText(`${currentTime.toFixed(2)}s`, x + indicatorSize + 35, y + 18);
  }

  function findClosestFrame(frames: FrameData[], targetTime: number): FrameData | null {
    if (frames.length === 0) return null;
    
    // Use binary search for better performance with large datasets
    let left = 0;
    let right = frames.length - 1;
    let closest = frames[0];
    let minDiff = Math.abs(frames[0].t - targetTime);
    
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const frame = frames[mid];
      const diff = Math.abs(frame.t - targetTime);
      
      if (diff < minDiff) {
        minDiff = diff;
        closest = frame;
      }
      
      if (frame.t < targetTime) {
        left = mid + 1;
      } else if (frame.t > targetTime) {
        right = mid - 1;
      } else {
        return frame; // Exact match
      }
    }
    
    // Only show pose overlay when frame_time_ms actually matches current video time
    // Use strict tolerance: 33ms (approximately 1 frame at 30fps)
    const strictTolerance = 0.033;
    return minDiff <= strictTolerance ? closest : null;
  }

  function drawLandmark(x: number, y: number, jointName: string, color: [number, number, number], isSelected: boolean = false, visibility: number) {
    if (!overlayCtx) return;
    
    if (isSelected) {
      // Draw full colored landmark with label for selected joints
      overlayCtx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${visibility})`;
      overlayCtx.strokeStyle = `rgba(255, 255, 255, ${visibility})`;
      overlayCtx.lineWidth = 2;
      
      // Draw larger circle
      overlayCtx.beginPath();
      overlayCtx.arc(x, y, 6, 0, 2 * Math.PI);
      overlayCtx.fill();
      overlayCtx.stroke();
      
      // Draw label with visibility-based opacity
      overlayCtx.fillStyle = `rgba(255, 255, 255, ${visibility})`;
      overlayCtx.font = '14px Arial';
      overlayCtx.fillText(jointName.replace('_', ' '), x + 8, y - 8);
    } else {
      // Draw small white dot for unselected joints
      overlayCtx.fillStyle = `rgba(255, 255, 255, ${visibility})`;
      overlayCtx.strokeStyle = `rgba(255, 255, 255, ${visibility})`;
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
    
    const videoDimensions = getVideoDisplayDimensions();
    if (!videoDimensions) return;
    
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
      const frame1 = poseData!.joints[joint1] ? findClosestFrame(poseData!.joints[joint1].frames, currentTime) : null;
      const frame2 = poseData!.joints[joint2] ? findClosestFrame(poseData!.joints[joint2].frames, currentTime) : null;
      
      if (frame1 && frame2) {
        // Map coordinates to actual displayed video area
        const x1 = videoDimensions.offsetX + (frame1.x * videoDimensions.displayWidth);
        const y1 = videoDimensions.offsetY + ((1 - frame1.y) * videoDimensions.displayHeight);
        const x2 = videoDimensions.offsetX + (frame2.x * videoDimensions.displayWidth);
        const y2 = videoDimensions.offsetY + ((1 - frame2.y) * videoDimensions.displayHeight);
        
        overlayCtx.beginPath();
        overlayCtx.moveTo(x1, y1);
        overlayCtx.lineTo(x2, y2);
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
    height: 100%;
    border: 2px solid #ddd;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    aspect-ratio: 1;
  }

  .video-player {
    width: 100%;
    height: 100%;
    object-fit: contain;
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