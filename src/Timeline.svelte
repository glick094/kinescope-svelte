<script lang="ts">
  import { onMount } from 'svelte';
  import { Chart, registerables, type ChartConfiguration, type ChartEvent } from 'chart.js';
  import annotationPlugin from 'chartjs-plugin-annotation';

  Chart.register(...registerables);
  Chart.register(annotationPlugin);

  interface JointData {
    frames: Array<{ t: number; x: number; y: number; z?: number }>;
    color: [number, number, number];
    units: string;
  }

  interface PoseData {
    joints: { [key: string]: JointData };
    GetJoint1D: (joint_name: string, dim_name: string) => Array<{ x: number; y: number }>;
    GetJointSpeed: (joint_name: string) => Array<{ x: number; y: number }>;
    GetJoint2D: (joint_name: string) => Array<{ t: number; x: number; y: number }>;
    GetJointColorDynamic: (joint_name: string, window?: number, keypoint?: number) => string[];
    GetJointColor: (joint_name: string, opacity?: number) => string;
  }

  interface JointMask {
    [jointName: string]: string[];
  }

  export let poseData: PoseData;
  export let time: number;
  export let setTime: (time: number) => void;
  export let setVideoSrc: (src: string) => void;
  export let videoElement: HTMLVideoElement;
  export let jointMask: JointMask;

  let canvasElement: HTMLCanvasElement;
  let chartInstance: Chart | null = null;
  let zoomPluginLoaded = false;

  async function loadZoomPlugin() {
    if (typeof window !== 'undefined' && !zoomPluginLoaded) {
      try {
        const zoomPlugin = await import('chartjs-plugin-zoom');
        Chart.register(zoomPlugin.default);
        zoomPluginLoaded = true;
      } catch (error) {
        console.warn('Failed to load zoom plugin:', error);
      }
    }
  }

  function setTimeFromClick(event: ChartEvent): void {
    if (!chartInstance) return;

    const xScale = chartInstance.scales.x;
    let xValue = xScale.getValueForPixel((event as any).native.offsetX);
    if (xValue === null || xValue === undefined) return;
    
    xValue = Math.max(0, xValue);
    const xFloor = Math.floor(xValue);
    
    if (videoElement) {
      videoElement.currentTime = xValue;
    }
    
    setTime(xFloor);
    setPlayhead(xValue);
  }

  function setPlayhead(time: number): void {
    if (!chartInstance) return;
    (chartInstance.options.plugins as any).annotation.annotations.playhead.xMin = time;
    (chartInstance.options.plugins as any).annotation.annotations.playhead.xMax = time;
    chartInstance.update();
  }

  async function createChart(): Promise<void> {
    if (!canvasElement || !poseData) return;

    // Load zoom plugin if not already loaded
    await loadZoomPlugin();

    // Destroy existing chart
    if (chartInstance) {
      chartInstance.destroy();
    }

    const valid_joints = Object.keys(jointMask).reduce((acc: string[], key: string) => {
      if (jointMask[key].includes("speed")) {
        acc.push(key);
      }
      return acc;
    }, []);

    const datasets = valid_joints.map((joint_name: string) => ({
      label: joint_name,
      data: poseData.GetJointSpeed(joint_name),
      borderColor: poseData.GetJointColor(joint_name),
      fill: false,
      animation: {
        duration: 0
      },
    }));

    let chartData = {
      datasets: datasets,
    };

    let annotation = {
      type: 'line' as const,
      mode: 'vertical' as const,
      borderColor: '#3498db',
      borderWidth: 2,
      xMin: time,
      xMax: time,
    };

    const options = {
      animation: {
        duration: 500,
      },
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { type: 'linear' as const, position: 'top' as const },
        y: { beginAtZero: true },
      },
      elements: {
        point: {
          radius: 0
        }
      },
      onClick: (event: ChartEvent) => {
        setTimeFromClick(event);
      },
      plugins: {
        annotation: {
          drawTime: 'afterDatasetsDraw' as const,
          annotations: {'playhead': annotation},
        },
        ...(zoomPluginLoaded && {
          zoom: {
            zoom: {
              wheel: {
                enabled: true,
              },
              pinch: {
                enabled: true
              },
              mode: 'x' as const,
            },
            pan: {
              enabled: true,
              mode: 'x' as const,
            },
          }
        })
      },
    };

    const ctx = canvasElement.getContext('2d')!;

    const config: ChartConfiguration = {
      type: 'line',
      data: chartData,
      options: options,
    };

    chartInstance = new Chart(ctx, config);
  }

  function zoomIn() {
    if (chartInstance && zoomPluginLoaded) {
      chartInstance.zoom(1.2);
    }
  }

  function zoomOut() {
    if (chartInstance && zoomPluginLoaded) {
      chartInstance.zoom(0.8);
    }
  }

  function resetZoom() {
    if (chartInstance && zoomPluginLoaded) {
      chartInstance.resetZoom();
    }
  }

  onMount(async () => {
    await createChart();
  });

  $: if (canvasElement && jointMask) {
    createChart();
  }

  $: if (chartInstance && time !== undefined) {
    setPlayhead(time);
  }
</script>

<div id="TimeLine">
  <div class="timeline-container">
    <div class="zoom-controls">
      <button on:click={zoomIn} class="zoom-btn" title="Zoom In" aria-label="Zoom In">
        <i class="fas fa-search-plus"></i>
      </button>
      <button on:click={zoomOut} class="zoom-btn" title="Zoom Out" aria-label="Zoom Out">
        <i class="fas fa-search-minus"></i>
      </button>
      <button on:click={resetZoom} class="zoom-btn" title="Reset Zoom" aria-label="Reset Zoom">
        <i class="fas fa-expand-arrows-alt"></i>
      </button>
    </div>
    <canvas bind:this={canvasElement}></canvas>
  </div>
</div>

<style>
  #TimeLine {
    height: 12vh;
  }

  .timeline-container {
    position: relative;
    width: 100%;
    height: 100%;
  }

  .zoom-controls {
    position: absolute;
    top: 10px;
    right: 10px;
    display: flex;
    gap: 5px;
    z-index: 10;
  }

  .zoom-btn {
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.9);
    color: #333;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    transition: all 0.2s ease;
  }

  .zoom-btn:hover {
    background: rgba(255, 255, 255, 1);
    transform: scale(1.1);
  }

  .zoom-btn:active {
    transform: scale(0.95);
  }
</style>