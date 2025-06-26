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
      this.joints = result.joints;
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
          poseData.LoadFromMediaPipeResult(result);
          isProcessingPose = false;
          processingProgress = 1.0;
          // Trigger reactivity
          poseData = poseData;
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
    console.log('CSV data loaded into poseData:', poseData);
  }
</script>

<svelte:head>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
</svelte:head>

<div>
  <div class="header-bar">
    <MenuBar poseData={poseData} videoSrc={videoSrc} videoElement={videoElement}/>
    <div class="header-controls">
      <VideoUploader setVideoSrc={setVideoSrcHandler}/>
      <PoseProcessingPanel 
        isProcessing={isProcessingPose}
        progress={processingProgress}
        onStartProcessing={startPoseProcessing}
        onStopProcessing={stopPoseProcessing}
        onCSVUploaded={handleCSVUpload}
        {videoElement}
        videoLoaded={!!videoSrc}
      />
      <KeypointSelector poseData={poseData} setJointMask={setJointMaskHandler} step2Completed={processingProgress > 0 && !isProcessingPose}/>
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
        <div class="placeholder">
          <div>Upload a video to begin</div>
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
    height: 70vh;
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

  .video-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    width: 100%;
    height: 100%;
  }
</style>