<script lang="ts">
  import { onMount, afterUpdate } from 'svelte';
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

  function setTimeFromClick(event: ChartEvent): void {
    if (!chartInstance) return;

    const xScale = chartInstance.scales.x;
    let xValue = xScale.getValueForPixel((event as any).native.offsetX);
    if (xValue === null) return;
    
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

  function createChart(): void {
    if (!canvasElement || !poseData) return;

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

  onMount(() => {
    createChart();
  });

  $: if (canvasElement && jointMask) {
    createChart();
  }

  $: if (chartInstance && time !== undefined) {
    setPlayhead(time);
  }
</script>

<div id="TimeLine">
  <canvas bind:this={canvasElement}></canvas>
</div>

<style>
  #TimeLine {
    height: 15vh;
  }
</style>