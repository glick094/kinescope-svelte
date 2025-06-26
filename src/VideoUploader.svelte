<script lang="ts">
  export let setVideoSrc: (src: string) => void;

  let fileInput: HTMLInputElement;

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

<button class="upload-button" on:click={triggerFileUpload}>
  <span class="step-number">①</span>
  <i class="fas fa-upload"></i>
  Upload Video
</button>

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
    background: #28a745;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
  }

  .upload-button:hover {
    background: #218838;
    transform: translateY(-1px);
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
</style>