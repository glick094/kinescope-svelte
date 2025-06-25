<script lang="ts">
  import { loadCSVFile } from './lib/csvParser';
  import type { PoseProcessingResult } from './lib/poseProcessor';

  export let isProcessing: boolean;
  export let progress: number;
  export let onStartProcessing: () => void;
  export let onStopProcessing: () => void;
  export let onCSVUploaded: (result: PoseProcessingResult) => void;
  export let videoLoaded: boolean;

  let csvFileInput: HTMLInputElement;
  let isUploadingCSV: boolean = false;

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
      const result = await loadCSVFile(file);
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
    {#if !videoLoaded}
      <div class="info-message">
        <i class="fas fa-info-circle"></i>
        Load a video file to begin pose detection
      </div>
    {:else if isProcessing}
      <div class="processing-info">
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
      </div>
    {:else if isUploadingCSV}
      <div class="processing-info">
        <div class="loading-message">
          <i class="fas fa-spinner fa-spin"></i>
          Loading CSV data...
        </div>
      </div>
    {:else}
      <div class="button-group">
        <button on:click={onStartProcessing} class="control-btn start-btn">
          <i class="fas fa-play"></i>
          Start Pose Detection
        </button>
        <div class="divider">OR</div>
        <button on:click={triggerCSVUpload} class="control-btn upload-btn">
          <i class="fas fa-upload"></i>
          Upload CSV Data
        </button>
      </div>
    {/if}
  </div>
  
  <!-- Hidden file input for CSV upload -->
  <input 
    bind:this={csvFileInput}
    type="file" 
    accept=".csv" 
    on:change={handleCSVUpload}
    style="display: none;"
  />
  
  {#if progress > 0 && !isProcessing}
    <div class="completion-message">
      <i class="fas fa-check-circle"></i>
      Pose detection completed!
    </div>
  {/if}
</div>

<style>
  .pose-processing-panel {
    background: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 8px;
    padding: 12px;
    margin: 5px 0;
    width: 100%;
    max-width: 500px;
  }

  .pose-processing-panel h3 {
    margin-top: 0;
    margin-bottom: 10px;
    color: #495057;
    font-size: 16px;
    font-weight: 600;
  }

  .controls {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .info-message {
    display: flex;
    align-items: center;
    gap: 10px;
    color: #6c757d;
    font-style: italic;
  }

  .processing-info {
    display: flex;
    flex-direction: column;
    gap: 15px;
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

  .start-btn {
    background: linear-gradient(135deg, #28a745, #20c997);
    color: white;
  }

  .start-btn:hover {
    background: linear-gradient(135deg, #218838, #1abc9c);
    transform: translateY(-1px);
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

  .button-group {
    display: flex;
    flex-direction: column;
    gap: 10px;
    align-items: center;
  }

  .divider {
    color: #6c757d;
    font-size: 12px;
    font-weight: 500;
    text-align: center;
    padding: 5px 0;
  }

  .upload-btn {
    background: linear-gradient(135deg, #007bff, #0056b3);
    color: white;
  }

  .upload-btn:hover {
    background: linear-gradient(135deg, #0056b3, #004085);
    transform: translateY(-1px);
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