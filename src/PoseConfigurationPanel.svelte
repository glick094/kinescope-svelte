<script lang="ts">
  export let videoLoaded: boolean;
  export let poseMode: 'process' | 'upload' = 'process';
  export let setPoseMode: (mode: 'process' | 'upload') => void;
  export let mediapipeSettings: {
    modelComplexity: number;
    minDetectionConfidence: number;
    minTrackingConfidence: number;
    smoothLandmarks: boolean;
    selfieMode: boolean;
  };
  export let setMediapipeSettings: (settings: typeof mediapipeSettings) => void;
  export let configurationComplete: boolean = false;
  export let setConfigurationComplete: (complete: boolean) => void;

  let isOpen: boolean = false;

  $: step2Enabled = videoLoaded;
  $: step2Status = configurationComplete ? 'completed' : (step2Enabled ? 'current' : 'future');

  function togglePopup(): void {
    if (step2Enabled) {
      isOpen = !isOpen;
    }
  }

  function handleModeChange(mode: 'process' | 'upload'): void {
    setPoseMode(mode);
  }

  function updateMediapipeSettings(field: keyof typeof mediapipeSettings, value: any): void {
    setMediapipeSettings({
      ...mediapipeSettings,
      [field]: value
    });
  }


  function handleDetectionConfidenceChange(e: Event): void {
    const target = e.target as HTMLInputElement;
    updateMediapipeSettings('minDetectionConfidence', parseFloat(target.value));
  }

  function handleTrackingConfidenceChange(e: Event): void {
    const target = e.target as HTMLInputElement;
    updateMediapipeSettings('minTrackingConfidence', parseFloat(target.value));
  }

  function handleSmoothLandmarksChange(e: Event): void {
    const target = e.target as HTMLInputElement;
    updateMediapipeSettings('smoothLandmarks', target.checked);
  }

  function handleSelfieModeChange(e: Event): void {
    const target = e.target as HTMLInputElement;
    updateMediapipeSettings('selfieMode', target.checked);
  }

  function handleConfirm(): void {
    setConfigurationComplete(true);
    isOpen = false;
  }

  // Close popup when clicking outside
  function handleClickOutside(event: MouseEvent): void {
    const target = event.target as Element;
    const popup = document.querySelector('.config-popup');
    const button = document.querySelector('.config-button');
    
    if (popup && button && !popup.contains(target) && !button.contains(target)) {
      isOpen = false;
    }
  }
</script>

<svelte:window on:click={handleClickOutside} />

<div class="configuration-panel">
  <div class="step-section">
    <div class="step-row">
      <span class="step-number {step2Status}">2</span>
      <button 
        class="config-button {step2Status}" 
        on:click={togglePopup}
        disabled={!step2Enabled}
        class:disabled={!step2Enabled}
      >
        <i class="fas fa-cog"></i>
        Configure Processing
        <!-- <span class="mode-indicator">({poseMode === 'process' ? 'Detect' : 'Upload'})</span> -->
        <i class="fas fa-chevron-down" class:rotated={isOpen}></i>
      </button>
    </div>
  </div>
  
  {#if isOpen && step2Enabled}
    <div class="config-popup">
      <!-- Mode Selection -->
      <div class="mode-section">
        <div class="section-header">
          <span>Data Source</span>
        </div>
        <div class="radio-group">
          <label class="radio-option">
            <input 
              type="radio" 
              bind:group={poseMode} 
              value="process"
              on:change={() => handleModeChange('process')}
            />
            <span class="radio-label">
              <i class="fas fa-video"></i>
              Process Pose Data
            </span>
            <span class="radio-description">Use MediaPipe to detect poses from video</span>
          </label>
          
          <label class="radio-option">
            <input 
              type="radio" 
              bind:group={poseMode} 
              value="upload"
              on:change={() => handleModeChange('upload')}
            />
            <span class="radio-label">
              <i class="fas fa-file-csv"></i>
              Upload Pose Data
            </span>
            <span class="radio-description">Load pre-processed pose data from CSV file</span>
          </label>
        </div>
      </div>
      
      {#if poseMode === 'process'}
        <!-- MediaPipe Settings -->
        <div class="settings-section">
          <div class="section-header">
            <span>MediaPipe Settings</span>
          </div>
          <div class="settings-scroll">
            <div class="setting-group">
              <span class="setting-label">Model Complexity</span>
              <div class="radio-group-horizontal">
                <label class="radio-option-large">
                  <input 
                    type="radio" 
                    bind:group={mediapipeSettings.modelComplexity} 
                    value={0}
                    on:change={() => updateMediapipeSettings('modelComplexity', 0)}
                  />
                  <span class="radio-label-large">Lite</span>
                  <span class="radio-description-small">0 - Fastest</span>
                </label>
                <label class="radio-option-large">
                  <input 
                    type="radio" 
                    bind:group={mediapipeSettings.modelComplexity} 
                    value={1}
                    on:change={() => updateMediapipeSettings('modelComplexity', 1)}
                  />
                  <span class="radio-label-large">Full</span>
                  <span class="radio-description-small">1 - Balanced</span>
                </label>
                <label class="radio-option-large">
                  <input 
                    type="radio" 
                    bind:group={mediapipeSettings.modelComplexity} 
                    value={2}
                    on:change={() => updateMediapipeSettings('modelComplexity', 2)}
                  />
                  <span class="radio-label-large">Heavy</span>
                  <span class="radio-description-small">2 - Most Accurate</span>
                </label>
              </div>
            </div>
            
            <div class="setting-group">
              <label for="detection-confidence">Detection Confidence</label>
              <div class="slider-group">
                <input 
                  id="detection-confidence"
                  type="range" 
                  min="0.1" 
                  max="1" 
                  step="0.1"
                  bind:value={mediapipeSettings.minDetectionConfidence}
                  on:input={handleDetectionConfidenceChange}
                />
                <span class="slider-value">{mediapipeSettings.minDetectionConfidence.toFixed(1)}</span>
              </div>
            </div>
            
            <div class="setting-group">
              <label for="tracking-confidence">Tracking Confidence</label>
              <div class="slider-group">
                <input 
                  id="tracking-confidence"
                  type="range" 
                  min="0.1" 
                  max="1" 
                  step="0.1"
                  bind:value={mediapipeSettings.minTrackingConfidence}
                  on:input={handleTrackingConfidenceChange}
                />
                <span class="slider-value">{mediapipeSettings.minTrackingConfidence.toFixed(1)}</span>
              </div>
            </div>
            
            <div class="setting-group">
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  bind:checked={mediapipeSettings.smoothLandmarks}
                  on:change={handleSmoothLandmarksChange}
                />
                <span>Smooth Landmarks</span>
              </label>
            </div>
            
            <div class="setting-group">
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  bind:checked={mediapipeSettings.selfieMode}
                  on:change={handleSelfieModeChange}
                />
                <span>Selfie Mode</span>
              </label>
            </div>
          </div>
        </div>
      {:else}
        <!-- Upload Information -->
        <div class="upload-info-section">
          <div class="section-header">
            <span>CSV File Format</span>
          </div>
          <div class="format-info">
            <p>Expected CSV format includes:</p>
            <ul>
              <li>Timestamp columns: <code>unix_timestamp_ms, frame_time_ms</code></li>
              <li>Pose landmarks: <code>pose_0_x, pose_0_y, pose_0_z, pose_0_visibility</code> (for 33 pose points)</li>
              <li>Hand landmarks: <code>left_hand_0_x, left_hand_0_y, left_hand_0_z</code> (for 21 points each hand)</li>
              <li>Face landmarks: <code>face_0_x, face_0_y, face_0_z</code> (for 468 face points)</li>
              <li>Coordinates normalized between 0-1, visibility between 0-1</li>
            </ul>
            <div class="example">
              <strong>Example file:</strong> <code>pose_data_P6981_2025-06-20T15-29-16.csv</code>
            </div>
          </div>
        </div>
      {/if}
      
      <!-- Confirm Button -->
      <div class="confirm-section">
        <button class="confirm-button" on:click={handleConfirm}>
          <i class="fas fa-check"></i>
          Confirm Configuration
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .configuration-panel {
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

  .config-button {
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

  .config-button.current {
    background: #28a745;
    color: white;
  }

  .config-button.current:hover:not(.disabled) {
    background: #218838;
    transform: translateY(-1px);
  }

  .config-button.completed {
    background: #007bff;
    color: white;
  }

  .config-button.completed:hover:not(.disabled) {
    background: #0056b3;
    transform: translateY(-1px);
  }

  .config-button.future {
    background: #6c757d;
    color: white;
  }

  .config-button.disabled {
    background: #6c757d;
    cursor: not-allowed;
    opacity: 0.6;
  }

  .mode-indicator {
    font-size: 12px;
    opacity: 0.8;
  }

  .config-button i.fa-chevron-down {
    transition: transform 0.2s ease;
  }

  .config-button i.fa-chevron-down.rotated {
    transform: rotate(180deg);
  }

  .config-popup {
    position: absolute;
    top: 100%;
    right: 0;
    width: 450px;
    max-width: calc(100vw - 20px);
    background-color: #ffffff;
    border: 1px solid #ccc;
    border-radius: 8px;
    box-shadow: 0px 8px 16px rgba(0,0,0,0.2);
    z-index: 1000;
    margin-top: 4px;
    max-height: 600px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }

  .mode-section, .settings-section, .upload-info-section {
    padding: 16px;
    border-bottom: 1px solid #eee;
  }

  .upload-info-section {
    border-bottom: none;
  }

  .section-header {
    font-weight: 600;
    font-size: 14px;
    color: #495057;
    margin-bottom: 12px;
  }

  .radio-group {
    display: flex;
    flex-direction: row;
    gap: 12px;
  }

  .radio-option {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 12px;
    border: 1px solid #dee2e6;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
    flex: 1;
  }

  .radio-option:hover {
    border-color: #3498db;
    background: #f8f9fa;
  }

  .radio-option input[type="radio"] {
    margin-right: 8px;
  }

  .radio-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 500;
    color: #495057;
  }

  .radio-label i {
    color: #3498db;
  }

  .radio-description {
    font-size: 12px;
    color: #6c757d;
    margin-left: 24px;
  }

  .settings-scroll {
    display: flex;
    flex-direction: column;
    gap: 16px;
    max-height: 300px;
    overflow-y: auto;
    padding-right: 8px;
  }

  .settings-scroll::-webkit-scrollbar {
    width: 4px;
  }

  .settings-scroll::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 2px;
  }

  .settings-scroll::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 2px;
  }

  .settings-scroll::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
  }

  .setting-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .setting-group label,
  .setting-group .setting-label {
    font-size: 13px;
    font-weight: 500;
    color: #495057;
  }


  .slider-group {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .slider-group input[type="range"] {
    flex: 1;
    height: 4px;
    border-radius: 2px;
    background: #ddd;
    outline: none;
    appearance: none;
    -webkit-appearance: none;
  }

  .slider-group input[type="range"]::-webkit-slider-thumb {
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #3498db;
    cursor: pointer;
    border: 2px solid white;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  }

  .slider-value {
    font-size: 12px;
    font-weight: 500;
    color: #495057;
    min-width: 30px;
    text-align: center;
  }


  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
  }

  .checkbox-label input[type="checkbox"] {
    transform: scale(1.1);
  }

  .radio-group-horizontal {
    display: flex;
    flex-direction: row;
    gap: 8px;
  }

  .radio-option-large {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 12px;
    border: 1px solid #dee2e6;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
    flex: 1;
  }

  .radio-option-large:hover {
    border-color: #3498db;
    background: #f8f9fa;
  }

  .radio-option-large input[type="radio"] {
    margin: 0 8px 0 0;
    align-self: flex-start;
  }

  .radio-label-large {
    font-weight: 500;
    color: #495057;
    font-size: 14px;
  }

  .radio-description-small {
    font-size: 12px;
    color: #6c757d;
  }

  .format-info {
    font-size: 13px;
    color: #495057;
  }

  .format-info ul {
    margin: 8px 0;
    padding-left: 20px;
  }

  .format-info li {
    margin-bottom: 4px;
  }

  .format-info code {
    background: #f8f9fa;
    padding: 2px 4px;
    border-radius: 3px;
    font-family: monospace;
    font-size: 12px;
  }

  .example {
    margin-top: 12px;
    padding: 8px;
    background: #f8f9fa;
    border-radius: 4px;
    border-left: 3px solid #3498db;
  }

  .example code {
    background: #e9ecef;
  }

  .confirm-section {
    padding: 16px;
    border-top: 1px solid #eee;
    display: flex;
    justify-content: center;
  }

  .confirm-button {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 24px;
    background: #28a745;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .confirm-button:hover {
    background: #218838;
    transform: translateY(-1px);
  }
</style>