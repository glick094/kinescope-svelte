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
  $: step3Status = selectedJoints.size > 0 ? 'completed' : (step3Enabled ? 'current' : 'future');

</script>

<div class="keypoint-selector">
  <div class="step-section">
    <div class="step-row">
      <span class="step-number {step3Status}">3</span>
      <button 
        class="selector-button {step3Status}" 
        on:click={toggleDropdown}
        disabled={!step3Enabled}
        class:disabled={!step3Enabled}
      >
        <i class="fas fa-crosshairs"></i>
        Select Keypoints
        <i class="fas fa-chevron-down" class:rotated={isOpen}></i>
      </button>
    </div>
  </div>
  
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
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
  }

  .selector-button.current {
    background: #28a745;
    color: white;
  }

  .selector-button.current:hover:not(.disabled) {
    background: #218838;
    transform: translateY(-1px);
  }

  .selector-button.completed {
    background: #007bff;
    color: white;
  }

  .selector-button.completed:hover:not(.disabled) {
    background: #0056b3;
    transform: translateY(-1px);
  }

  .selector-button.future {
    background: #6c757d;
    color: white;
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

  .step-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .step-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .step-number {
    font-size: 20px;
    font-weight: 600;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }

  .step-number.completed {
    background: transparent;
    color: #6c757d;
    border: 2px solid #6c757d;
  }

  .step-number.current {
    background: #28a745;
    color: white;
  }

  .step-number.future {
    background: transparent;
    color: #6c757d;
    border: 2px solid #6c757d;
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