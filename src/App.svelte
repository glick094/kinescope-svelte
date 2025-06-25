<script lang="ts">
  import { onMount } from 'svelte';
  import MenuBar from './MenuBar.svelte';
  import VideoPlayer from './VideoPlayer.svelte';
  import ScatterPlot from './ScatterPlot.svelte';
  import Timeline from './Timeline.svelte';
  import ConsoleComponent from './ConsoleComponent.svelte';
  import PoseProcessingPanel from './PoseProcessingPanel.svelte';
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

  // Generate sample data
  onMount(() => {
    const positions = Array.from({ length: 100 }, (_, i) => ({
      t: i-1,
      x: .1 * Math.sin(i / 5) + .5 * Math.sin(i/12) + Math.sin(i/100),
      y: .1 * Math.cos(i / 5) + .5 * Math.cos(i/12) + Math.cos(i/100),
    }));
    
    const times = Array.from({ length: 100 }, (_, i) => i*2);

    poseData.joints = { 
      "right_hand": {
        frames: times.map((_, index) => ({
          t: positions[index].t,
          x: positions[index].x,
          y: positions[index].y,
        })),
        color: [255, 99, 132],
        units: "px",
      },
      "left_hand": {
        frames: times.map((_, index) => ({
          t: positions[index].t,
          x: -positions[index].x * .9,
          y: positions[index].y * .7,
        })),
        color: [99, 255, 132],
        units: "px",
      }
    };
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
          poseData.LoadFromMediaPipeResult(result);
          isProcessingPose = false;
          processingProgress = 1.0;
          // Trigger reactivity
          poseData = poseData;
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
  <MenuBar {poseData} setJointMask={setJointMaskHandler}/>
  
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
          <PoseProcessingPanel 
            isProcessing={isProcessingPose}
            progress={processingProgress}
            onStartProcessing={startPoseProcessing}
            onStopProcessing={stopPoseProcessing}
            onCSVUploaded={handleCSVUpload}
            videoLoaded={!!videoSrc}
          />
          <VideoPlayer {videoSrc} setSyncedTime={setSyncedTime} bind:videoElement poseData={poseData} {syncedTime} isLoading={isProcessingPose}/>
          <ConsoleComponent {syncedTime} setSyncedTime={setSyncedTime} setVideoSrc={setVideoSrcHandler} {videoElement} />
        </div>
      {:else}
        <div class="placeholder">
          <div>Video will appear here</div>
          <ConsoleComponent {syncedTime} setSyncedTime={setSyncedTime} setVideoSrc={setVideoSrcHandler} {videoElement} />
        </div>
      {/if}
    </div>
  </div>
  
  <div style="height: 10vh"></div>
  
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
    align-items: center;
    display: flex;
    justify-content: center;
    height: 100%;
    gap: 20px;
  }

  :global(.Scatter) {
    height: 50%;
    width: 50%;
  }

  :global(.VideoSection) {
    height: 50%;
    width: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
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

  .video-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    width: 100%;
  }
</style>