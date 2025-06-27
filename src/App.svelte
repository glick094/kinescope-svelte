<script lang="ts">
  import { onMount } from 'svelte';
  import MenuBar from './MenuBar.svelte';
  import VideoPlayer from './VideoPlayer.svelte';
  import ScatterPlot from './ScatterPlot.svelte';
  import Timeline from './Timeline.svelte';
  import ConsoleComponent from './ConsoleComponent.svelte';
  import PoseProcessingPanel from './PoseProcessingPanel.svelte';
  import VideoUploader from './VideoUploader.svelte';
  import KeypointSelector from './KeypointSelector.svelte';
  import { PoseProcessor, type PoseProcessingResult } from './lib/poseProcessor';

  // Types
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

  interface JointMask {
    [jointName: string]: string[];
  }

  // State variables
  let videoSrc: string | null = null;
  let syncedTime: number = 0;
  let videoElement: HTMLVideoElement;
  let jointMask: JointMask = {};
  let poseProcessor: PoseProcessor;
  let isProcessingPose: boolean = false;
  let processingProgress: number = 0;

  // PoseData class
  class PoseData {
    joints: { [key: string]: JointData } = {};

    GetJoint1D(joint_name: string, dim_name: string): { x: number; y: number }[] {
      if (!this.joints.hasOwnProperty(joint_name)) return [];
      const time_synced = this.joints[joint_name].frames.map((frame: FrameData) => ({
        x: frame["t"],
        y: frame[dim_name as keyof FrameData] as number,
      }));
      return time_synced;
    }

    GetJointSpeed(joint_name: string): { x: number; y: number }[] {
      if (!this.joints.hasOwnProperty(joint_name)) return [];
      const frames = this.joints[joint_name].frames;
      if (frames.length < 2) return [];
      
      const speeds = frames.slice(1).map((frame: FrameData, i: number) => {
        const prev = frames[i];
        const dt = frame.t - prev.t;
        
        // Skip frames with zero or negative time difference
        if (dt <= 0) return null;
        
        const dx = frame.x - prev.x;
        const dy = frame.y - prev.y;
        const dz = frame.z !== undefined && prev.z !== undefined ? frame.z - prev.z : 0;
        
        // Calculate 3D speed if z-coordinate available, otherwise 2D speed
        const speed = dz !== 0 ? 
          Math.sqrt(dx * dx + dy * dy + dz * dz) / dt :
          Math.sqrt(dx * dx + dy * dy) / dt;
          
        return {x: frame.t, y: speed};
      }).filter(point => point !== null) as { x: number; y: number }[];
      
      return speeds;
    }

    GetJoint2D(joint_name: string): { t: number; x: number; y: number }[] {
      if (!this.joints.hasOwnProperty(joint_name)) return [];
      const time_synced = this.joints[joint_name].frames.map((frame: FrameData) => ({
        t: frame["t"],
        x: frame["x"],
        y: frame["y"],
      }));
      return time_synced;
    }

    GetJointColorDynamic(joint_name: string, window: number = 1, keypoint: number = 0): string[] {
      if (!this.joints.hasOwnProperty(joint_name)) return [];
      const colors = this.joints[joint_name].frames.map((frame: FrameData) => (
        `rgba(${this.joints[joint_name].color[0]},${this.joints[joint_name].color[1]},${this.joints[joint_name].color[2]},${Math.max(0, (window - Math.abs(frame.t - keypoint))/window)})`
      ));
      return colors;
    }

    GetJointColor(joint_name: string, opacity: number = 1): string {
      if (!this.joints.hasOwnProperty(joint_name)) return "rgba(0,0,0,255)";
      const colors = this.joints[joint_name].color;
      return `rgba(${colors[0]},${colors[1]},${colors[2]},${opacity})`
    }

    AddJointFrame(_joint_data: any): void {
      throw new Error("not implemented!");
    }

    LoadFromMediaPipeResult(result: PoseProcessingResult): void {
      console.log('LoadFromMediaPipeResult called with:', Object.keys(result.joints).length, 'joints');
      this.joints = result.joints;
      console.log('LoadFromMediaPipeResult finished, this.joints now has:', Object.keys(this.joints).length, 'joints');
    }
  }

  // Initialize pose data
  let poseData = new PoseData();

  // Initialize with empty data - sample data removed to avoid interference with MediaPipe
  onMount(() => {
    poseData.joints = {};
  });

  function setSyncedTime(newTime: number): void {
    syncedTime = newTime;
  }

  function setJointMaskHandler(newMask: JointMask): void {
    jointMask = newMask;
  }

  function setVideoSrcHandler(newSrc: string): void {
    videoSrc = newSrc;
  }

  async function startPoseProcessing(): Promise<void> {
    if (!videoElement || !videoSrc || isProcessingPose) {
      return;
    }

    isProcessingPose = true;
    processingProgress = 0;

    try {
      poseProcessor = new PoseProcessor({
        onProgress: (progress: number) => {
          processingProgress = progress;
        },
        onComplete: (result: PoseProcessingResult) => {
          console.log('MediaPipe processing completed, loading result:', result);
          console.log('Result joint count:', Object.keys(result.joints).length);
          console.log('Result joint names:', Object.keys(result.joints));
          console.log('First joint frames count:', result.joints[Object.keys(result.joints)[0]]?.frames.length);
          
          console.log('PoseData BEFORE loading:', Object.keys(poseData.joints).length, 'joints');
          poseData.LoadFromMediaPipeResult(result);
          console.log('PoseData AFTER loading:', Object.keys(poseData.joints).length, 'joints');
          console.log('PoseData joint names after loading:', Object.keys(poseData.joints));
          
          isProcessingPose = false;
          processingProgress = 1.0;
          
          // Force reactivity by reassigning the object
          const tempData = poseData;
          poseData = tempData;
          
          // Jump to frame 1 (time 0)
          if (videoElement) {
            videoElement.currentTime = 0;
          }
          syncedTime = 0;
          
          // Force a tick to ensure all reactive statements have run
          setTimeout(() => {
            syncedTime = syncedTime; // Force another reactivity update
            console.log('PoseData FINAL state:', Object.keys(poseData.joints).length, 'joints');
          }, 100);
          
          console.log('PoseData updated:', poseData);
        },
        onError: (error: string) => {
          console.error('Pose processing error:', error);
          isProcessingPose = false;
        }
      });

      await poseProcessor.processVideo(videoElement);
    } catch (error) {
      console.error('Failed to start pose processing:', error);
      isProcessingPose = false;
    }
  }

  function stopPoseProcessing(): void {
    if (poseProcessor) {
      poseProcessor.stopProcessing();
    }
    isProcessingPose = false;
  }

  function handleCSVUpload(result: PoseProcessingResult): void {
    poseData.LoadFromMediaPipeResult(result);
    // Trigger reactivity
    poseData = poseData;
    processingProgress = 1.0;
    // Jump to frame 1 (time 0)
    if (videoElement) {
      videoElement.currentTime = 0;
    }
    syncedTime = 0;
    console.log('CSV data loaded into poseData:', poseData);
  }

  function resetWorkflow(): void {
    // Stop any ongoing processing
    if (poseProcessor) {
      poseProcessor.stopProcessing();
    }
    
    // Clear all state
    videoSrc = null;
    syncedTime = 0;
    jointMask = {};
    isProcessingPose = false;
    processingProgress = 0;
    
    // Clear pose data
    poseData.joints = {};
    poseData = poseData; // Trigger reactivity
    
    // Clear video element if bound
    if (videoElement) {
      videoElement.src = '';
      videoElement.currentTime = 0;
    }
    
    console.log('Workflow reset');
  }
</script>

<svelte:head>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
</svelte:head>

<div>
  <div class="header-bar">
    <MenuBar poseData={poseData} videoSrc={videoSrc} videoElement={videoElement}/>
    <div class="header-controls">
      {#if videoSrc}
        <button class="reset-button" on:click={resetWorkflow} title="Reset workflow">
          <i class="fas fa-undo"></i>
          Reset
        </button>
      {/if}
      <VideoUploader setVideoSrc={setVideoSrcHandler} videoLoaded={!!videoSrc}/>
      <PoseProcessingPanel 
        isProcessing={isProcessingPose}
        progress={processingProgress}
        onStartProcessing={startPoseProcessing}
        onStopProcessing={stopPoseProcessing}
        onCSVUploaded={handleCSVUpload}
        {videoElement}
        videoLoaded={!!videoSrc}
      />
      <KeypointSelector poseData={poseData} setJointMask={setJointMaskHandler} step2Completed={processingProgress >= 1.0 && !isProcessingPose && poseData && Object.keys(poseData.joints).length > 0}/>
    </div>
  </div>
  
  <div class="AppPanels">
    <div class="Scatter">
      {#if videoSrc}
        <ScatterPlot {poseData} {jointMask} {syncedTime} isLoading={isProcessingPose}/>
      {:else}
        <div class="placeholder">Select a video file to begin</div>
      {/if}
    </div>
    <div class="VideoSection">
      {#if videoSrc}
        <div class="video-container">
          <VideoPlayer {videoSrc} setSyncedTime={setSyncedTime} bind:videoElement poseData={poseData} {syncedTime} isLoading={isProcessingPose} {jointMask}/>
          <ConsoleComponent {syncedTime} {videoElement} />
        </div>
      {:else}
        <div class="video-placeholder">
          <div class="video-placeholder-area">
            <i class="fas fa-video placeholder-icon"></i>
            <div class="placeholder-text">Video Player</div>
            <div class="placeholder-subtext">Upload a video to begin</div>
          </div>
          <div class="console-placeholder">
            <div class="console-controls">
              <button class="control-btn disabled"><i class="fas fa-step-backward"></i></button>
              <button class="control-btn disabled"><i class="fas fa-play"></i></button>
              <button class="control-btn disabled"><i class="fas fa-step-forward"></i></button>
              <button class="control-btn disabled"><i class="fas fa-sync-alt"></i></button>
            </div>
          </div>
        </div>
      {/if}
    </div>
  </div>
  
  <div style="height: 3vh"></div>
  
  <div>
    {#if videoSrc}
      <Timeline {poseData} time={syncedTime} setTime={setSyncedTime} setVideoSrc={setVideoSrcHandler} {videoElement} {jointMask}/>
    {/if}
  </div>
</div>

<style>
  :global(body) {
    display: block;
    margin: 0px;
  }

  :global(.AppPanels) {
    display: flex;
    height: 55vh;
    gap: 20px;
    padding: 20px;
  }

  :global(.Scatter) {
    flex: 1;
    height: 100%;
    min-width: 400px;
  }

  :global(.VideoSection) {
    flex: 1;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 400px;
  }

  .placeholder {
    color: #666;
    font-style: italic;
    text-align: center;
    padding: 20px;
    border: 2px dashed #ccc;
    border-radius: 8px;
    background-color: #f9f9f9;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
  }

  .header-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 20px;
    background-color: #f8f9fa;
    border-bottom: 1px solid #dee2e6;
    position: relative;
    z-index: 100;
  }

  .header-controls {
    display: flex;
    align-items: center;
    gap: 15px;
  }

  .reset-button {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    background: #dc3545;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
  }

  .reset-button:hover {
    background: #c82333;
    transform: translateY(-1px);
  }

  .video-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    width: 100%;
    height: 100%;
  }

  .video-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    width: 100%;
    height: 100%;
  }

  .video-placeholder-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border: 2px dashed #ccc;
    border-radius: 8px;
    background-color: #f9f9f9;
    width: 100%;
    min-height: 200px;
  }

  .placeholder-icon {
    font-size: 3rem;
    color: #ccc;
    margin-bottom: 1rem;
  }

  .placeholder-text {
    font-size: 1.2rem;
    font-weight: 600;
    color: #666;
    margin-bottom: 0.5rem;
  }

  .placeholder-subtext {
    font-size: 0.9rem;
    color: #999;
    font-style: italic;
  }

  .console-placeholder {
    width: 100%;
    padding: 10px;
    background-color: #f8f9fa;
    border-radius: 6px;
  }

  .console-controls {
    display: flex;
    justify-content: center;
    gap: 10px;
  }

  .control-btn {
    padding: 8px 12px;
    border: none;
    border-radius: 4px;
    background-color: #e9ecef;
    color: #6c757d;
    cursor: not-allowed;
    font-size: 14px;
  }

  .control-btn.disabled {
    opacity: 0.6;
  }
</style>