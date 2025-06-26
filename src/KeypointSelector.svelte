<script lang="ts">
  interface JointData {
    frames: Array<{ t: number; x: number; y: number; z?: number }>;
    color: [number, number, number];
    units: string;
  }

  interface PoseData {
    joints: { [key: string]: JointData };
  }

  interface JointMask {
    [jointName: string]: string[];
  }

  export let poseData: PoseData | null = null;
  export let setJointMask: (mask: JointMask) => void;
  export let step2Completed: boolean = false;

  let isOpen: boolean = false;
  let selectedJoints: Set<string> = new Set();

  function handleToggle(jointName: string): void {
    if (selectedJoints.has(jointName)) {
      selectedJoints.delete(jointName);
    } else {
      selectedJoints.add(jointName);
    }
    selectedJoints = selectedJoints; // Trigger reactivity
    
    // Create joint mask with x, y, and speed for selected joints
    const newMask: JointMask = {};
    selectedJoints.forEach(joint => {
      newMask[joint] = ['x', 'y', 'speed'];
    });
    
    setJointMask(newMask);
  }

  function toggleDropdown(): void {
    if (poseData) {
      isOpen = !isOpen;
    }
  }

  $: jointNames = poseData && poseData.joints ? Object.keys(poseData.joints) : [];
  $: hasData = poseData && jointNames.length > 0;
  $: step3Enabled = step2Completed && hasData;
</script>

<div class="keypoint-selector">
  <button 
    class="selector-button" 
    on:click={toggleDropdown}
    disabled={!step3Enabled}
    class:disabled={!step3Enabled}
  >
    <span class="step-number">③</span>
    <i class="fas fa-crosshairs"></i>
    Select Keypoints
    <i class="fas fa-chevron-down" class:rotated={isOpen}></i>
  </button>
  
  {#if isOpen && step3Enabled}
    <div class="dropdown-menu">
      <div class="dropdown-header">
        <span>Joint</span><span>Display</span>
      </div>
      <div class="dropdown-content">
        {#each jointNames as name}
          <div class="dropdown-row">
            <span class="joint-name">{name}</span>
            <input
              type="checkbox"
              checked={selectedJoints.has(name)}
              on:change={() => handleToggle(name)}
            />
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .keypoint-selector {
    position: relative;
  }

  .selector-button {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: #17a2b8;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
  }

  .selector-button:hover:not(.disabled) {
    background: #138496;
    transform: translateY(-1px);
  }

  .selector-button.disabled {
    background: #6c757d;
    cursor: not-allowed;
    opacity: 0.6;
  }

  .selector-button i.fa-chevron-down {
    transition: transform 0.2s ease;
  }

  .selector-button i.fa-chevron-down.rotated {
    transform: rotate(180deg);
  }

  .dropdown-menu {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    min-width: 300px;
    background-color: #ffffff;
    border: 1px solid #ccc;
    border-radius: 8px;
    box-shadow: 0px 8px 16px rgba(0,0,0,0.2);
    z-index: 1000;
    margin-top: 4px;
    max-height: 400px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .dropdown-header,
  .dropdown-row {
    display: grid;
    grid-template-columns: 150px 60px;
    align-items: center;
    padding: 8px 12px;
    border-bottom: 1px solid #eee;
    flex-shrink: 0;
  }

  .step-number {
    font-size: 32px;
    font-weight: 600;
    /* background: rgba(255, 255, 255, 0.2); */
    border-radius: 50%;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .dropdown-header {
    font-weight: bold;
    background-color: #f8f9fa;
    font-size: 12px;
    text-transform: uppercase;
    color: #6c757d;
  }

  .dropdown-content {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
  }

  .dropdown-row:hover {
    background-color: #f8f9fa;
  }

  .joint-name {
    font-size: 13px;
    color: #495057;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  input[type="checkbox"] {
    cursor: pointer;
    transform: scale(1.1);
  }
</style>