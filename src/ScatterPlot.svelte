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

  // Visibility filter
  let visibilityThreshold: number = 0.5;
  let showVisibilityFilter: boolean = false;


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

  async function createPlaceholderChart(): Promise<void> {
    if (!canvasElement) return;

    const ctx = canvasElement.getContext('2d')!;

    const config: ChartConfiguration = {
      type: 'scatter',
      data: {
        datasets: [{
          label: 'No data available',
          data: [],
          backgroundColor: [],
          borderWidth: 1,
          borderColor: 'rgba(0,0,0,0)',
          showLine: false,
          animation: {
            duration: 0
          }
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false, 
        aspectRatio: 1,
        scales: {
          y: {
            min: -0.05,
            max: 1.05,
            reverse: false,
            title: {
              display: true,
              text: 'Y Position'
            }
          },
          x: {
            min: -0.05,
            max: 1.05,
            title: {
              display: true,
              text: 'X Position'
            }
          }
        },
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: true,
            text: 'Upload a video and select keypoints to see pose data',
            font: {
              size: 14
            },
            color: '#666'
          }
        }
      }
    };

    chartInstance = new Chart(ctx, config);
  }

  async function updateChartData(): Promise<void> {
    if (!chartInstance || !poseData) return;

    const valid_joints = Object.keys(jointMask).reduce((acc: string[], key: string) => {
      if (jointMask[key].includes("x") && jointMask[key].includes("y")) {
        acc.push(key);
      }
      return acc;
    }, []);

    let datasets = valid_joints.map((joint_name: string, index: number) => {
      const jointData = poseData.GetJoint2D(joint_name);
      
      // Filter data based on visibility threshold
      const filteredData = jointData.filter(point => {
        const frameData = poseData.joints[joint_name].frames.find(frame => 
          Math.abs(frame.t - point.t) < 0.033 // ~1 frame tolerance
        );
        const visibility = frameData?.visibility || 1.0;
        return visibility >= visibilityThreshold;
      });
      
      const baseColor = colorPalette[index % colorPalette.length];
      const baseColorWithAlpha = baseColor.replace('#', '').match(/.{2}/g)?.map(x => parseInt(x, 16)).join(', ');
      const rgbaBaseColor = `rgba(${baseColorWithAlpha}, 1)`;
      
      // Find current frame index in filtered data
      const tolerance = 0.1;
      const currentFrameIndex = filteredData.findIndex(point => Math.abs(point.t - syncedTime) < tolerance);
      
      return {
        label: joint_name,
        data: filteredData.map((point, frameIndex) => ({ 
          x: point.x, 
          y: point.y,
          radius: getPointRadius(frameIndex, currentFrameIndex)
        })),
        backgroundColor: filteredData.map((_, frameIndex) => 
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

    // Update chart data without destroying the chart
    chartInstance.data.datasets = datasets;
    chartInstance.update('none'); // 'none' prevents animation and preserves zoom
  }

  async function createChart(): Promise<void> {
    if (!canvasElement) return;

    // Load zoom plugin if not already loaded
    await loadZoomPlugin();

    // Destroy existing chart
    if (chartInstance) {
      chartInstance.destroy();
    }

    // If no pose data, create placeholder chart
    if (!poseData) {
      await createPlaceholderChart();
      return;
    }

    const valid_joints = Object.keys(jointMask).reduce((acc: string[], key: string) => {
      if (jointMask[key].includes("x") && jointMask[key].includes("y")) {
        acc.push(key);
      }
      return acc;
    }, []);

    let datasets = valid_joints.map((joint_name: string, index: number) => {
      const jointData = poseData.GetJoint2D(joint_name);
      
      // Filter data based on visibility threshold
      const filteredData = jointData.filter(point => {
        const frameData = poseData.joints[joint_name].frames.find(frame => 
          Math.abs(frame.t - point.t) < 0.033 // ~1 frame tolerance
        );
        const visibility = frameData?.visibility || 1.0;
        return visibility >= visibilityThreshold;
      });
      
      const baseColor = colorPalette[index % colorPalette.length];
      const baseColorWithAlpha = baseColor.replace('#', '').match(/.{2}/g)?.map(x => parseInt(x, 16)).join(', ');
      const rgbaBaseColor = `rgba(${baseColorWithAlpha}, 1)`;
      
      // Find current frame index in filtered data
      const tolerance = 0.1;
      const currentFrameIndex = filteredData.findIndex(point => Math.abs(point.t - syncedTime) < tolerance);
      
      return {
        label: joint_name,
        data: filteredData.map((point, frameIndex) => ({ 
          x: point.x, 
          y: point.y,
          radius: getPointRadius(frameIndex, currentFrameIndex)
        })),
        backgroundColor: filteredData.map((_, frameIndex) => 
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

  // Force chart updates when key data changes
  $: jointCount = poseData ? Object.keys(poseData.joints).length : 0;
  $: selectedJointCount = Object.keys(jointMask).length;
  
  // Create new chart when major changes occur (joint selection, pose data loading)
  $: if (canvasElement && (jointCount > 0 || selectedJointCount > 0)) {
    createChart();
  }
  
  // Update chart data only when time or visibility changes (preserves zoom)
  $: if (chartInstance && poseData && (syncedTime !== undefined || visibilityThreshold !== undefined)) {
    updateChartData();
  }
</script>

<div class="scatter-container">
  <div class="chart-controls">
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
  </div>
  
  <div class="visibility-controls">
    <button 
      on:click={() => showVisibilityFilter = !showVisibilityFilter} 
      class="visibility-btn {showVisibilityFilter ? 'active' : ''}" 
      title="Toggle Visibility Filter" 
      aria-label="Toggle Visibility Filter"
    >
      <i class="fas fa-eye"></i>
    </button>
    
    {#if showVisibilityFilter}
      <div class="visibility-slider-container">
        <label for="visibility-slider" class="slider-label">
          Min Visibility: {visibilityThreshold.toFixed(2)}
        </label>
        <input 
          id="visibility-slider"
          type="range" 
          min="0" 
          max="1" 
          step="0.05" 
          bind:value={visibilityThreshold}
          class="visibility-slider"
        />
      </div>
    {/if}
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

  .chart-controls {
    position: absolute;
    top: 10px;
    right: 10px;
    display: flex;
    flex-direction: column;
    gap: 5px;
    z-index: 10;
  }

  .zoom-controls {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .zoom-btn, .visibility-btn {
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

  .zoom-btn:hover, .visibility-btn:hover {
    background: rgba(255, 255, 255, 1);
    transform: scale(1.1);
  }

  .zoom-btn:active, .visibility-btn:active {
    transform: scale(0.95);
  }

  .visibility-btn.active {
    background: #3498db;
    color: white;
  }

  .visibility-controls {
    position: absolute;
    top: 125px;
    right: 10px;
    display: flex;
    flex-direction: column;
    gap: 5px;
    align-items: flex-end;
    z-index: 10;
  }

  .visibility-slider-container {
    background: rgba(255, 255, 255, 0.95);
    padding: 10px;
    border-radius: 6px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    min-width: 150px;
  }

  .slider-label {
    display: block;
    font-size: 12px;
    color: #333;
    margin-bottom: 5px;
    font-weight: 500;
  }

  .visibility-slider {
    width: 100%;
    height: 4px;
    border-radius: 2px;
    background: #ddd;
    outline: none;
    appearance: none;
    -webkit-appearance: none;
  }

  .visibility-slider::-webkit-slider-thumb {
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #3498db;
    cursor: pointer;
    border: 2px solid white;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  }

  .visibility-slider::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #3498db;
    cursor: pointer;
    border: 2px solid white;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
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