<script lang="ts">
  import { onMount } from 'svelte';

  export let videoSrc: string;
  export let setSyncedTime: (time: number) => void;
  export let videoElement: HTMLVideoElement;

  let videoError: string = '';

  onMount(() => {
    if (videoElement) {
      videoElement.src = videoSrc;
      videoElement.onloadeddata = () => videoElement.pause();

      const updateTime = (): void => {
        setSyncedTime(videoElement.currentTime);
        console.log('SyncedTime:', videoElement.currentTime);
      };

      videoElement.addEventListener('timeupdate', updateTime);
      
      return () => {
        videoElement.removeEventListener('timeupdate', updateTime);
      };
    }
  });

  $: if (videoElement && videoSrc) {
    videoElement.src = videoSrc;
    videoElement.onloadeddata = () => videoElement.pause();
    videoError = ''; // Clear previous errors
  }

  function handleVideoError(event: Event) {
    const target = event.target as HTMLVideoElement;
    videoError = target.error ? `Error ${target.error.code}: ${target.error.message}` : 'Unknown video error';
    console.error('Video error:', videoError);
  }
</script>

<!-- Hide controls, as video is controlled in timeline console -->
<video bind:this={videoElement} class="video-player" on:error={handleVideoError}>
  <track kind="captions" label="No captions available" default />
  Your browser does not support the video tag.
</video>

{#if videoError}
  <div class="error-message">
    Error loading video: {videoError}
    <br>
    <small>Try a different video format (MP4, WebM recommended)</small>
  </div>
{/if}

<style>
  .video-player {
    width: 100%;
    height: auto;
    max-width: 500px;
    max-height: 400px;
    border: 2px solid #ddd;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  .error-message {
    color: #e74c3c;
    background-color: #fdf2f2;
    border: 1px solid #f5c6cb;
    border-radius: 4px;
    padding: 10px;
    margin-top: 10px;
    text-align: center;
    font-size: 14px;
  }
</style>