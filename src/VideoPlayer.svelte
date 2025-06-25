<script lang="ts">
  import { onMount } from 'svelte';

  export let videoSrc: string;
  export let setSyncedTime: (time: number) => void;
  export let videoElement: HTMLVideoElement;

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
  }
</script>

<!-- Hide controls, as video is controlled in timeline console -->
<video bind:this={videoElement}></video>