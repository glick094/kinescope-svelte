<script lang="ts">
  import { loadCSVFile } from './lib/csvParser';
  import type { PoseProcessingResult } from './lib/poseProcessor';

  export let isProcessing: boolean;
  export let progress: number;
  export let onStartProcessing: () => void;
  export let onStopProcessing: () => void;
  export let onCSVUploaded: (result: PoseProcessingResult) => void;
  export let videoLoaded: boolean;
  export let videoElement: HTMLVideoElement | null = null;

  $: step2Enabled = videoLoaded;

  let csvFileInput: HTMLInputElement;
  let isUploadingCSV: boolean = false;
  let csvFileName: string = '';
  let processingComplete: boolean = false;

  // Track when processing is complete
  $: if (progress === 1.0 && !isProcessing) {
    processingComplete = true;
  }

  // Step status logic - when video is loaded but processing not complete, step 2 should be current
  $: step2Status = processingComplete || csvFileName ? 'completed' : (videoLoaded ? 'current' : 'future');

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
</script>

<div class="pose-processing-panel">
  <h3>Pose Detection</h3>
  
  <div class="controls">
    <div class="step-section">
      <div class="step-row">
        <span class="step-number {step2Status}">2</span>
        <div class="button-stack">
        <!-- Top position: Start/Stop/Progress/Filename -->
        <div class="top-slot">
          {#if isProcessing}
            <div class="progress-container">
              <div class="progress-bar">
                <div class="progress-fill" style="width: {progress * 100}%"></div>
              </div>
              <span class="progress-text">{Math.round(progress * 100)}%</span>
            </div>
            <button on:click={onStopProcessing} class="control-btn stop-btn">
              <i class="fas fa-stop"></i>
              Stop Processing
            </button>
          {:else if csvFileName}
            <div class="filename-display">
              <i class="fas fa-file-csv"></i>
              <span class="filename">{csvFileName}</span>
            </div>
          {:else}
            <button 
              on:click={onStartProcessing} 
              class="control-btn start-btn {step2Status}"
              class:disabled={!step2Enabled}
              disabled={!step2Enabled}
            >
              <i class="fas fa-play"></i>
              Start Pose Detection
            </button>
          {/if}
        </div>

        <!-- Bottom position: Upload CSV/Complete message -->
        <div class="bottom-slot">
          {#if processingComplete && !csvFileName}
            <div class="completion-message">
              <i class="fas fa-check-circle"></i>
              Pose detection completed!
            </div>
          {:else if isUploadingCSV}
            <div class="loading-message">
              <i class="fas fa-spinner fa-spin"></i>
              Loading CSV data...
            </div>
          {:else if !isProcessing}
            <button 
              on:click={triggerCSVUpload} 
              class="control-btn upload-btn {step2Status}"
              class:disabled={!step2Enabled}
              disabled={!step2Enabled}
            >
              <i class="fas fa-upload"></i>
              Upload CSV Data
            </button>
          {/if}
        </div>
      </div>
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
  .pose-processing-panel {
    background: transparent;
    border: none;
    border-radius: 0;
    padding: 0;
    margin: 0;
    width: auto;
  }

  .pose-processing-panel h3 {
    display: none;
  }

  .controls {
    display: flex;
    flex-direction: column;
    gap: 15px;
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

  .button-stack {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .top-slot, .bottom-slot {
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-height: 48px; /* Consistent height for buttons */
  }


  .progress-container {
    display: flex;
    align-items: center;
    gap: 15px;
  }

  .progress-bar {
    flex: 1;
    height: 20px;
    background-color: #e9ecef;
    border-radius: 10px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #28a745, #20c997);
    transition: width 0.3s ease;
  }

  .progress-text {
    font-weight: 600;
    color: #495057;
    min-width: 40px;
  }

  .control-btn {
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

  .start-btn.current {
    background: linear-gradient(135deg, #28a745, #20c997);
    color: white;
  }

  .start-btn.current:hover:not(.disabled) {
    background: linear-gradient(135deg, #218838, #1abc9c);
    transform: translateY(-1px);
  }

  .start-btn.completed {
    background: linear-gradient(135deg, #007bff, #0056b3);
    color: white;
  }

  .start-btn.completed:hover:not(.disabled) {
    background: linear-gradient(135deg, #0056b3, #004085);
    transform: translateY(-1px);
  }

  .start-btn.future {
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

  .completion-message {
    display: flex;
    align-items: center;
    gap: 10px;
    color: #28a745;
    font-weight: 500;
    background: #d4edda;
    border: 1px solid #c3e6cb;
    border-radius: 4px;
    padding: 10px;
  }

  .completion-message i {
    font-size: 16px;
  }

  .filename-display {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    background: #f8f9fa;
    border: 2px solid #e9ecef;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    color: #495057;
  }

  .filename-display i {
    color: #007bff;
  }

  .filename {
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .upload-btn.current {
    background: linear-gradient(135deg, #28a745, #20c997);
    color: white;
  }

  .upload-btn.current:hover:not(.disabled) {
    background: linear-gradient(135deg, #218838, #1abc9c);
    transform: translateY(-1px);
  }

  .upload-btn.completed {
    background: linear-gradient(135deg, #007bff, #0056b3);
    color: white;
  }

  .upload-btn.completed:hover:not(.disabled) {
    background: linear-gradient(135deg, #0056b3, #004085);
    transform: translateY(-1px);
  }

  .upload-btn.future {
    background: #6c757d;
    color: white;
  }

  .control-btn.disabled {
    background: #6c757d !important;
    cursor: not-allowed;
    opacity: 0.6;
  }

  .control-btn.disabled:hover {
    transform: none;
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

  .loading-message {
    display: flex;
    align-items: center;
    gap: 10px;
    color: #007bff;
    font-weight: 500;
    justify-content: center;
    padding: 10px;
  }
</style>