<script lang="ts">
  import { onMount, afterUpdate } from 'svelte';
  import { Chart, registerables, type ChartConfiguration } from 'chart.js';

  Chart.register(...registerables);

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

  let canvasElement: HTMLCanvasElement;
  let chartInstance: Chart | null = null;

  function createChart(): void {
    if (!canvasElement || !poseData) return;

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

    let datasets = valid_joints.map((joint_name: string) => ({
      label: joint_name,
      data: poseData.GetJoint2D(joint_name),
      backgroundColor: poseData.GetJointColor(joint_name, 1.0),
      pointBackgroundColor: poseData.GetJointColorDynamic(joint_name, 20, syncedTime),
      animation: {
        duration: 0
      }
    }));

    if (datasets.length == 0) datasets = [{label: "", data: []}];

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
            min: -2,
            max: 2,
          },
          x: {
            min: -2,
            max: 2,
          }
        },
        elements: {
          point: {
            radius: 2
          }
        },
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: false,
            text: '2D Chart'
          }
        }
      },
    };

    chartInstance = new Chart(ctx, config);
  }

  onMount(() => {
    createChart();
  });

  $: if (canvasElement && (jointMask || syncedTime)) {
    createChart();
  }
</script>

<div>
  <canvas bind:this={canvasElement}></canvas>
</div>