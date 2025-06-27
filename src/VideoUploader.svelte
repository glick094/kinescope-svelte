<script lang="ts">
  export let setVideoSrc: (src: string) => void;
  export let videoLoaded: boolean = false;

  let fileInput: HTMLInputElement;

  // Step status logic  
  $: step1Status = videoLoaded ? 'completed' : 'current';

  function handleFileUpload(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoSrc(url);
    }
  }

  function triggerFileUpload() {
    fileInput?.click();
  }
</script>

<div class="step-section">
  <div class="step-row">
    <span class="step-number {step1Status}">1</span>
    <button class="upload-button {step1Status}" on:click={triggerFileUpload}>
      <i class="fas fa-upload"></i>
      Upload Video
    </button>
  </div>
</div>

<input 
  bind:this={fileInput}
  type="file" 
  accept="video/*" 
  on:change={handleFileUpload}
  style="display: none;"
/>

<style>
  .upload-button {
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

  .upload-button.current {
    background: #28a745;
    color: white;
  }

  .upload-button.current:hover {
    background: #218838;
    transform: translateY(-1px);
  }

  .upload-button.completed {
    background: #007bff;
    color: white;
  }

  .upload-button.completed:hover {
    background: #0056b3;
    transform: translateY(-1px);
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
</style>