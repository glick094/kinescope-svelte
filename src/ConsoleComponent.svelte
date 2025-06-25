<script lang="ts">
  export let syncedTime: number;
  export let videoElement: HTMLVideoElement;

  let playing: boolean = false;

  function playVideo(): void {
    if (videoElement?.readyState != 4) {
      return;
    }
    videoElement?.play();
    playing = true;
  }

  function pauseVideo(): void {
    if (videoElement?.readyState != 4) {
      return;
    }
    videoElement?.pause();
    playing = false;
  }

  function advanceFrameAux(): void {
    let clamped_time = Math.floor(syncedTime * 30) / 30;
    videoElement.currentTime = clamped_time + (1.1/30);
  }

  function decreaseFrameAux(): void {
    let clamped_time = Math.floor(syncedTime * 30) / 30;
    videoElement.currentTime = clamped_time - (0.9/30);
  }
  
  function advanceFrame(): void {
    if (videoElement?.readyState != 4) {
      return;
    }
    videoElement?.pause();
    advanceFrameAux();
    playing = false;
  }

  function decreaseFrame(): void {
    if (videoElement?.readyState != 4) {
      return;
    }
    videoElement?.pause();
    decreaseFrameAux();
    playing = false;
  }

  function setLooping(): void {
    if (videoElement?.readyState != 4) {
      return;
    }
    videoElement.loop = !videoElement.loop;
  }

</script>

<div class="video-controls">
  <button on:click={decreaseFrame} class="control-btn step-back-btn" title="Step Backward" aria-label="Step Backward">
    <i class="fas fa-step-backward"></i>
  </button>
  {#if playing}
    <button on:click={pauseVideo} class="control-btn pause-btn" title="Pause" aria-label="Pause">
      <i class="fas fa-pause"></i>
    </button>
  {:else}
    <button on:click={playVideo} class="control-btn play-btn" title="Play" aria-label="Play">
      <i class="fas fa-play"></i>
    </button>
  {/if}
  <button on:click={advanceFrame} class="control-btn step-forward-btn" title="Step Forward" aria-label="Step Forward">
    <i class="fas fa-step-forward"></i>
  </button>
  <button on:click={setLooping} class="control-btn loop-btn" title="Loop" aria-label="Loop">
    <i class="fas fa-sync"></i>
  </button>
</div>

<style>
  .video-controls {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 15px;
    margin-top: 20px;
  }
  
  .control-btn {
    padding: 10px 20px;
    background-color: #2980b9;
    color: white;
    border: none;
    border-radius: 5px;
    font-size: 16px;
    cursor: pointer;
    transition: background-color 0.3s, transform 0.2s;
  }
  
  .control-btn:hover {
    background-color: #2980b9;
    transform: scale(1.1);
  }
  
  .control-btn:active {
    transform: scale(0.95);
  }
  
  .play-btn,
  .pause-btn,
  .step-back-btn,
  .step-forward-btn,
  .loop-btn {
    background-color: #3498db;
  }
</style>