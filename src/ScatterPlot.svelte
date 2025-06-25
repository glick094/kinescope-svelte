<script lang="ts">
  import { onMount } from 'svelte';
  import { Chart, registerables, type ChartConfiguration } from 'chart.js';

  Chart.register(...registerables);
  
  let zoomPluginLoaded = false;

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
  export let jointMask: JointMask;
  export let syncedTime: number;
  export let isLoading: boolean = false;

  let zoomLevel = 1;
  let panX = 0;
  let panY = 0;

  let canvasElement: HTMLCanvasElement;
  let chartInstance: Chart | null = null;

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

  // Color-blind friendly palette
  const colorPalette = [
    // '#d62728', // red
    // '#2ca02c', // green
    // '#1f77b4', // blue
    // '#ff7f0e', // orange
    // '#9467bd', // purple
    // '#8c564b', // brown
    // '#e377c2', // pink
    // '#7f7f7f', // gray
    // '#bcbd22', // olive
    // '#17becf'  // cyan
    '#cc6677', // rose
    '#332288', // indigo  
    '#ddcc77', // khaki
    '#117733', // forest green
    '#88ccee', // sky blue
    '#882255', // maroon
    '#44aa99', // teal
    '#999933', // olive green
    '#aa4499', // violet
    '#dddddd', // light gray
  ];

  function getTemporalColor(baseColor: string, frameIndex: number, currentFrameIndex: number): string {
    const distance = Math.abs(frameIndex - currentFrameIndex);
    
    if (distance === 0) {
      // Current frame - full opacity, larger size
      return baseColor;
    } else if (distance <= 10) {
      // Nearby frames - fade based on distance
      const opacity = Math.max(0.005, 1 - (distance * 0.15));
      return baseColor.replace('1)', `${opacity})`);
    } else {
      // Distant frames - low opacity
      return baseColor.replace('1)', '0.005)');
    }
  }

  function getPointRadius(frameIndex: number, currentFrameIndex: number): number {
    const distance = Math.abs(frameIndex - currentFrameIndex);
    
    if (distance === 0) {
      return 10; // Current frame
    } else if (distance <= 10) {
      return Math.max(1.5, 7 - distance);
    } else {
      return 1.5; // Default size
    }
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
      if (jointMask[key].includes("x") && jointMask[key].includes("y")) {
        acc.push(key);
      }
      return acc;
    }, []);

    let datasets = valid_joints.map((joint_name: string, index: number) => {
      const jointData = poseData.GetJoint2D(joint_name);
      const baseColor = colorPalette[index % colorPalette.length];
      const baseColorWithAlpha = baseColor.replace('#', '').match(/.{2}/g)?.map(x => parseInt(x, 16)).join(', ');
      const rgbaBaseColor = `rgba(${baseColorWithAlpha}, 1)`;
      
      // Find current frame index
      const tolerance = 0.1;
      const currentFrameIndex = jointData.findIndex(point => Math.abs(point.t - syncedTime) < tolerance);
      
      return {
        label: joint_name,
        data: jointData.map((point, frameIndex) => ({ 
          x: point.x, 
          y: point.y,
          radius: getPointRadius(frameIndex, currentFrameIndex)
        })),
        backgroundColor: jointData.map((_, frameIndex) => 
          getTemporalColor(rgbaBaseColor, frameIndex, currentFrameIndex)
        ),
        borderColor: rgbaBaseColor,
        borderWidth: 1,
        showLine: false,
        animation: {
          duration: 0
        }
      };
    });

    if (datasets.length == 0) {
      datasets = [{
        label: "", 
        data: [],
        backgroundColor: [],
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0)',
        showLine: false,
        animation: {
          duration: 0
        }
      }];
    }


    const data = { datasets: datasets };
    const ctx = canvasElement.getContext('2d')!;

    const config: ChartConfiguration = {
      type: 'scatter',
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false, 
        aspectRatio: 1,
        scales: {
          y: {
            min: Math.max(-0.05, (1.05 / zoomLevel) + panY),
            max: Math.min(1.05, (-0.05 / zoomLevel) + panY),
            reverse: false // Y=0 at top, Y=1 at bottom to match video
          },
          x: {
            min: Math.max(-0.05, (-0.05 / zoomLevel) + panX),
            max: Math.min(1.05, (1.05 / zoomLevel) + panX),
          }
        },
        elements: {
          point: {
            radius: (context: any) => {
              if (context.parsed) {
                return context.raw.radius || 2;
              }
              return 2;
            }
          }
        },
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: false,
            text: '2D Chart'
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
                mode: 'xy',
              },
              pan: {
                enabled: true,
                mode: 'xy',
              },
            }
          })
        }
      },
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

  $: if (canvasElement && (jointMask || syncedTime)) {
    createChart();
  }
</script>

<div class="scatter-container">
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
  
  {#if isLoading}
    <div class="loading-overlay">
      <div class="loading-spinner">
        <i class="fas fa-spinner fa-spin"></i>
      </div>
      <div class="loading-text">Processing pose data...</div>
    </div>
  {/if}
</div>

<style>
  .scatter-container {
    position: relative;
    width: 100%;
    height: 100%;
  }

  .zoom-controls {
    position: absolute;
    top: 10px;
    right: 10px;
    display: flex;
    flex-direction: column;
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

  .loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.9);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 20;
  }

  .loading-spinner {
    font-size: 2rem;
    color: #3498db;
    margin-bottom: 1rem;
  }

  .loading-text {
    color: #666;
    font-weight: 500;
  }
</style>