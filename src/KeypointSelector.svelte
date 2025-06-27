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

  // Define keypoint presets
  const presets = {
    'left_arm': {
      icon: 'fas fa-hand-point-left',
      // joints: ['left_shoulder', 'left_elbow', 'left_wrist', 'left_pinky', 'left_index', 'left_thumb']
      joints: ['left_shoulder', 'left_elbow', 'left_wrist']
    },
    'right_arm': {
      icon: 'fas fa-hand-point-right', 
      // joints: ['right_shoulder', 'right_elbow', 'right_wrist', 'right_pinky', 'right_index', 'right_thumb']
      joints: ['right_shoulder', 'right_elbow', 'right_wrist']
    },
    'left_leg': {
      icon: 'fas fa-shoe-prints',
      joints: ['left_hip', 'left_knee', 'left_ankle', 'left_heel', 'left_foot_index']
    },
    'right_leg': {
      icon: 'fas fa-shoe-prints',
      joints: ['right_hip', 'right_knee', 'right_ankle', 'right_heel', 'right_foot_index']
    },
    'hands': {
      icon: 'fas fa-hands',
      // joints: ['left_wrist', 'right_wrist', 'left_pinky', 'right_pinky', 'left_index', 'right_index', 'left_thumb', 'right_thumb']
      joints: ['left_wrist', 'right_wrist', 'left_index', 'right_index', 'left_thumb', 'right_thumb']
    },
    'feet': {
      icon: 'fas fa-walking',
      joints: ['left_ankle', 'right_ankle', 'left_heel', 'right_heel', 'left_foot_index', 'right_foot_index']
    },
    'torso': {
      icon: 'fas fa-male',
      joints: ['left_shoulder', 'right_shoulder', 'left_hip', 'right_hip']
    },
    'head_shoulders': {
      icon: 'fas fa-user',
      // joints: ['nose', 'left_eye_inner', 'left_eye', 'left_eye_outer', 'right_eye_inner', 'right_eye', 'right_eye_outer', 'left_ear', 'right_ear', 'mouth_left', 'mouth_right', 'left_shoulder', 'right_shoulder']
      joints: ['nose', 'left_eye', 'right_eye', 'mouth_left', 'mouth_right', 'left_shoulder', 'right_shoulder']
    }
  } as const;

  function handleToggle(jointName: string): void {
    if (selectedJoints.has(jointName)) {
      selectedJoints.delete(jointName);
    } else {
      selectedJoints.add(jointName);
    }
    selectedJoints = selectedJoints; // Trigger reactivity
    updateJointMask();
  }

  function selectPreset(presetKey: keyof typeof presets): void {
    const preset = presets[presetKey];
    if (preset) {
      // Add all joints from preset to selection
      preset.joints.forEach((joint: string) => {
        if (jointNames.includes(joint)) {
          selectedJoints.add(joint);
        }
      });
      selectedJoints = selectedJoints; // Trigger reactivity
      updateJointMask();
    }
  }

  function clearSelection(): void {
    selectedJoints.clear();
    selectedJoints = selectedJoints; // Trigger reactivity
    updateJointMask();
  }

  function updateJointMask(): void {
    // Create joint mask with x, y, and speed for selected joints
    const newMask: JointMask = {};
    selectedJoints.forEach(joint => {
      newMask[joint] = ['x', 'y', 'speed'];
    });
    setJointMask(newMask);
  }

  function togglePopup(): void {
    if (poseData) {
      isOpen = !isOpen;
    }
  }

  // Close popup when clicking outside
  function handleClickOutside(event: MouseEvent): void {
    const target = event.target as Element;
    const popup = document.querySelector('.popup-menu');
    const button = document.querySelector('.selector-button');
    
    if (popup && button && !popup.contains(target) && !button.contains(target)) {
      isOpen = false;
    }
  }

  $: jointNames = poseData && poseData.joints ? Object.keys(poseData.joints).sort() : [];
  $: hasData = poseData && jointNames.length > 0;
  $: step3Enabled = step2Completed && hasData;
  $: step3Status = selectedJoints.size > 0 ? 'completed' : (step3Enabled ? 'current' : 'future');

</script>

<svelte:window on:click={handleClickOutside} />

<div class="keypoint-selector">
  <div class="step-section">
    <div class="step-row">
      <span class="step-number {step3Status}">3</span>
      <button 
        class="selector-button {step3Status}" 
        on:click={togglePopup}
        disabled={!step3Enabled}
        class:disabled={!step3Enabled}
      >
        <i class="fas fa-crosshairs"></i>
        Select Keypoints
        <span class="selection-count">({selectedJoints.size})</span>
        <i class="fas fa-chevron-down" class:rotated={isOpen}></i>
      </button>
    </div>
  </div>
  
  {#if isOpen && step3Enabled}
    <div class="popup-menu">
      <!-- Preset Buttons Section -->
      <div class="preset-section">
        <div class="section-header">
          <span>Quick Select</span>
          <button class="clear-btn" on:click={clearSelection}>
            <i class="fas fa-times"></i> Clear All
          </button>
        </div>
        <div class="preset-buttons">
          {#each Object.entries(presets) as [key, preset]}
            <button 
              class="preset-btn" 
              on:click={() => selectPreset(key)}
              title={key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            >
              <i class="{preset.icon}"></i>
              <span>{key.replace('_', ' ')}</span>
            </button>
          {/each}
        </div>
      </div>
      
      <!-- Individual Keypoints Section -->
      <div class="keypoints-section">
        <div class="section-header">
          <span>Individual Keypoints</span>
        </div>
        <div class="keypoints-list">
          {#each jointNames as name}
            <label class="keypoint-item">
              <input
                type="checkbox"
                checked={selectedJoints.has(name)}
                on:change={() => handleToggle(name)}
              />
              <span class="keypoint-name">{name.replace(/_/g, ' ')}</span>
            </label>
          {/each}
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .keypoint-selector {
    position: relative;
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

  .selection-count {
    font-size: 12px;
    opacity: 0.8;
  }

  .selector-button i.fa-chevron-down {
    transition: transform 0.2s ease;
  }

  .selector-button i.fa-chevron-down.rotated {
    transform: rotate(180deg);
  }

  .popup-menu {
    position: absolute;
    top: 100%;
    right: 0;
    width: 400px;
    max-width: calc(100vw - 20px);
    background-color: #ffffff;
    border: 1px solid #ccc;
    border-radius: 8px;
    box-shadow: 0px 8px 16px rgba(0,0,0,0.2);
    z-index: 1000;
    margin-top: 4px;
    max-height: 500px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .preset-section {
    border-bottom: 1px solid #eee;
    padding: 16px;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    font-weight: 600;
    font-size: 14px;
    color: #495057;
  }

  .clear-btn {
    background: #dc3545;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 12px;
    cursor: pointer;
    transition: background 0.2s ease;
  }

  .clear-btn:hover {
    background: #c82333;
  }

  .preset-buttons {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 8px;
  }

  .preset-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 12px 8px;
    border: 1px solid #dee2e6;
    border-radius: 6px;
    background: #f8f9fa;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 11px;
    text-transform: capitalize;
  }

  .preset-btn:hover {
    background: #e9ecef;
    border-color: #3498db;
    transform: translateY(-1px);
  }

  .preset-btn i {
    font-size: 16px;
    color: #3498db;
  }

  .keypoints-section {
    padding: 16px;
    flex: 1;
  }

  .keypoints-list {
    max-height: 200px;
    overflow-y: auto;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 8px;
  }

  .keypoint-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.2s ease;
    font-size: 13px;
  }

  .keypoint-item:hover {
    background: #f8f9fa;
  }

  .keypoint-name {
    color: #495057;
    text-transform: capitalize;
  }

  input[type="checkbox"] {
    cursor: pointer;
    transform: scale(1.1);
  }
</style>