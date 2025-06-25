<script lang="ts">
  interface JointData {
    frames: Array<{ t: number; x: number; y: number; z?: number }>;
    color: [number, number, number];
    units: string;
  }

  interface PoseData {
    joints: { [key: string]: JointData };
    GetJoint1D: (joint_name: string, dim_name: string) => Array<{ x: number; y: number }>;
    GetJointSpeed: (joint_name: string) => Array<{ x: number; y: number }>;
    GetJoint2D: (joint_name: string) => Array<{ t: number; x: number; y: number }>;
    GetJointColorDynamic: (joint_name: string, window?: number, keypoint?: number) => string[];
    GetJointColor: (joint_name: string, opacity?: number) => string;
  }

  export let poseData: PoseData | null = null;
  export let videoSrc: string | null = null;
  export let videoElement: HTMLVideoElement | null = null;

  let isOpen: boolean = false;

  function toggleMenu(): void {
    isOpen = !isOpen;
  }

  $: jointNames = poseData && poseData.joints ? Object.keys(poseData.joints) : [];
  $: totalFrames = poseData && jointNames.length > 0 ? 
    Math.max(...jointNames.map(name => poseData!.joints[name]?.frames?.length || 0)) : 0;
  $: videoDuration = videoElement?.duration && !isNaN(videoElement.duration) ? videoElement.duration : 0;
  $: videoFileName = videoSrc ? 
    (videoSrc.startsWith('blob:') ? 'Uploaded video file' : videoSrc.split('/').pop()?.split('?')[0] || 'Unknown') : null;
  $: hasVideoData = videoSrc !== null;
  $: hasPoseData = poseData && jointNames.length > 0;
</script>

<div class="MenuBar">
  <button class="MainButton" on:click={toggleMenu}> 
    <img class="Logo" src="ks.svg" alt="Hands Up"/>
    <span>kinescope</span>
  </button>
  
  {#if isOpen}
    <div class="DropdownMenu">
      <div class="info-section">
        <h4>Metadata</h4>
        
        <div class="info-group">
          <h5><i class="fas fa-video"></i> Video</h5>
          {#if hasVideoData}
            <div class="info-item">
              <span class="label">File:</span>
              <span class="value">{videoFileName}</span>
            </div>
            <div class="info-item">
              <span class="label">Duration:</span>
              <span class="value">{videoDuration > 0 ? videoDuration.toFixed(2) + 's' : 'Loading...'}</span>
            </div>
          {:else}
            <div class="info-item">
              <span class="no-data">No video loaded</span>
            </div>
          {/if}
        </div>

        <div class="info-group">
          <h5><i class="fas fa-running"></i> Pose Data</h5>
          {#if hasPoseData}
            <div class="info-item">
              <span class="label">Source:</span>
              <span class="value">Loaded from CSV/MediaPipe</span>
            </div>
            <div class="info-item">
              <span class="label">Joints:</span>
              <span class="value">{jointNames.length}</span>
            </div>
            <div class="info-item">
              <span class="label">Frames:</span>
              <span class="value">{totalFrames}</span>
            </div>
          {:else}
            <div class="info-item">
              <span class="no-data">No pose data loaded</span>
            </div>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .MenuBar {
    height: fit-content;
  }

  .MainButton {
    width: 300px;
    font-family: 'Tahoma';
    font-weight: bold;
    letter-spacing: 0.5em;
    display: inline-block;
    padding: 10px 20px 15px 20px;
    font-size: 2.5vh;
    color: #fff;
    background-color: #3498db;
    border: none;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s ease;
    border-top-left-radius: 5px;
    border-bottom-left-radius: 5px;
    border-top-right-radius: 50px;
    border-bottom-right-radius: 50px;
    transform-origin: left;
  }

  .MainButton:hover {
    background-color: #2980b9;
    transform: scaleX(1.1);
  }

  .Logo {
    height: 1.5em;
    padding-right: 1em;
    text-align: center;
  }

  .DropdownMenu {
    position: absolute;
    left: 0;
    width: max-content;
    background-color: #ffffff;
    border: 1px solid #ccc;
    border-radius: 10px;
    box-shadow: 0px 8px 16px rgba(0,0,0,0.2);
    animation: slideDown 0.3s ease-out forwards;
    transform-origin: top;
    z-index: 9999;
    overflow: hidden;
    height: 80vh;
    display: flex;
    flex-direction: column;
  }

  @keyframes slideDown {
    from {
      opacity: 1;
      height: 0%;
    } 
    to {
      opacity: 1;
      height: 80vh;
    }
  }

  .info-section {
    padding: 20px;
    flex: 1;
    overflow-y: auto;
  }

  .info-section h4 {
    margin: 0 0 20px 0;
    color: #2c3e50;
    font-size: 18px;
    font-weight: 600;
    border-bottom: 2px solid #3498db;
    padding-bottom: 8px;
  }

  .info-group {
    margin-bottom: 20px;
  }

  .info-group h5 {
    margin: 0 0 12px 0;
    color: #34495e;
    font-size: 14px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .info-group h5 i {
    color: #3498db;
    width: 16px;
  }

  .info-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 0;
    border-bottom: 1px solid #ecf0f1;
  }

  .info-item:last-child {
    border-bottom: none;
  }

  .label {
    font-weight: 500;
    color: #7f8c8d;
    font-size: 13px;
  }

  .value {
    font-weight: 600;
    color: #2c3e50;
    font-size: 13px;
    max-width: 150px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .no-data {
    color: #95a5a6;
    font-style: italic;
    font-size: 13px;
  }
</style>