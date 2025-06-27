<script lang="ts">
  import { loadCSVFile } from './lib/csvParser';
  import type { PoseProcessingResult } from './lib/poseProcessor';

  export let poseMode: 'process' | 'upload';
  export let isProcessing: boolean;
  export let progress: number;
  export let onStartProcessing: () => void;
  export let onStopProcessing: () => void;
  export let onCSVUploaded: (result: PoseProcessingResult) => void;
  export let videoLoaded: boolean;
  export let videoElement: HTMLVideoElement | null = null;
  export let configurationComplete: boolean;
  export let frameCount: number = 0;
  export let resetTrigger: number = 0;

  let csvFileInput: HTMLInputElement;
  let isUploadingCSV: boolean = false;
  let csvFileName: string = '';
  let processingComplete: boolean = false;

  // Track when processing is complete
  $: if (progress === 1.0 && !isProcessing) {
    processingComplete = true;
  }

  $: step3Enabled = videoLoaded && configurationComplete;
  $: step3Status = processingComplete || csvFileName ? 'completed' : (step3Enabled ? 'current' : 'future');

  async function handleCSVUpload(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (!file) return;
    
    if (!file.name.endsWith('.csv')) {
      alert('Please select a CSV file');
      return;
    }
    
    isUploadingCSV = true;
    
    try {
      const videoDuration = videoElement?.duration || 0;
      const result = await loadCSVFile(file, videoDuration);
      csvFileName = file.name;
      onCSVUploaded(result);
      console.log('CSV uploaded successfully:', result);
    } catch (error) {
      console.error('Failed to load CSV:', error);
      alert(`Failed to load CSV file: ${error}`);
    } finally {
      isUploadingCSV = false;
      // Reset the input so the same file can be uploaded again
      target.value = '';
    }
  }

  function triggerCSVUpload() {
    csvFileInput?.click();
  }

  function handleAction() {
    if (poseMode === 'process') {
      onStartProcessing();
    } else {
      triggerCSVUpload();
    }
  }

  // Reset state when mode changes
  $: if (poseMode) {
    csvFileName = '';
    processingComplete = false;
  }

  // Reset state when reset is triggered
  $: if (resetTrigger) {
    csvFileName = '';
    processingComplete = false;
    isUploadingCSV = false;
  }
</script>

<div class="action-panel">
  <div class="step-section">
    <div class="step-row">
      <span class="step-number {step3Status}">3</span>
      <div class="action-content">
        {#if isProcessing}
          <div class="progress-container">
            <div class="progress-info">
              <span class="progress-label">Processing pose data...</span>
              <span class="progress-percentage">{Math.round(progress * 100)}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: {progress * 100}%"></div>
            </div>
          </div>
          <button on:click={onStopProcessing} class="action-btn stop-btn">
            <i class="fas fa-stop"></i>
            Stop Processing
          </button>
        {:else if isUploadingCSV}
          <div class="loading-container">
            <i class="fas fa-spinner fa-spin"></i>
            <span>Loading CSV data...</span>
          </div>
        {:else if processingComplete && poseMode === 'process'}
          <div class="completion-box">
            <div class="completion-header">
              <i class="fas fa-check"></i>
              <span class="completion-title">Pose Detection Complete</span>
            </div>
            <div class="completion-details">
              <span class="frame-count">{frameCount} frames processed</span>
              <span class="success-indicator">✓ Ready for analysis</span>
            </div>
          </div>
        {:else if csvFileName && poseMode === 'upload'}
          <div class="completion-box">
            <div class="completion-header">
              <i class="fas fa-check"></i>
              <span class="completion-title">CSV Data Loaded</span>
            </div>
            <div class="completion-details">
              <span class="filename">{csvFileName}</span>
              <span class="frame-count">{frameCount} frames loaded</span>
              <span class="success-indicator">✓ Ready for analysis</span>
            </div>
          </div>
        {:else}
          <button 
            on:click={handleAction} 
            class="action-btn main-action {step3Status}"
            class:disabled={!step3Enabled}
            disabled={!step3Enabled}
          >
            {#if poseMode === 'process'}
              <i class="fas fa-play"></i>
              Start Pose Detection
            {:else}
              <i class="fas fa-upload"></i>
              Upload CSV Data
            {/if}
          </button>
        {/if}
      </div>
    </div>
  </div>
  
  <!-- Hidden file input for CSV upload -->
  <input 
    bind:this={csvFileInput}
    type="file" 
    accept=".csv" 
    on:change={handleCSVUpload}
    style="display: none;"
  />
</div>

<style>
  .action-panel {
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

  .action-content {
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 200px;
  }

  .action-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .main-action.current {
    background: linear-gradient(135deg, #28a745, #20c997);
    color: white;
  }

  .main-action.current:hover:not(.disabled) {
    background: linear-gradient(135deg, #218838, #1abc9c);
    transform: translateY(-1px);
  }

  .main-action.completed {
    background: linear-gradient(135deg, #007bff, #0056b3);
    color: white;
  }

  .main-action.future {
    background: #6c757d;
    color: white;
  }

  .stop-btn {
    background: linear-gradient(135deg, #dc3545, #e74c3c);
    color: white;
  }

  .stop-btn:hover {
    background: linear-gradient(135deg, #c82333, #c0392b);
    transform: translateY(-1px);
  }

  .action-btn.disabled {
    background: #6c757d !important;
    cursor: not-allowed;
    opacity: 0.6;
  }

  .action-btn.disabled:hover {
    transform: none;
  }

  .progress-container {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .progress-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .progress-label {
    font-size: 14px;
    font-weight: 500;
    color: #495057;
  }

  .progress-percentage {
    font-size: 14px;
    font-weight: 600;
    color: #28a745;
  }

  .progress-bar {
    height: 8px;
    background-color: #e9ecef;
    border-radius: 4px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #28a745, #20c997);
    transition: width 0.3s ease;
  }

  .completion-box {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 16px;
    background: #f8f9fa;
    border: 2px solid #28a745;
    border-radius: 8px;
    color: #495057;
  }

  .completion-header {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .completion-header i {
    color: #28a745;
    font-size: 18px;
  }

  .completion-title {
    font-weight: 600;
    font-size: 16px;
    color: #28a745;
  }

  .completion-details {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-left: 26px;
  }

  .frame-count {
    font-size: 14px;
    font-weight: 500;
    color: #495057;
  }

  .filename {
    font-size: 14px;
    font-weight: 500;
    color: #495057;
    font-family: monospace;
    background: #e9ecef;
    padding: 2px 6px;
    border-radius: 3px;
  }

  .success-indicator {
    font-size: 12px;
    color: #28a745;
    font-weight: 500;
  }

  .loading-container {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    background: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 6px;
    color: #495057;
    font-weight: 500;
  }

  .loading-container i {
    color: #007bff;
    font-size: 16px;
  }
</style>