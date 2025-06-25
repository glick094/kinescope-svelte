<script lang="ts">
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
  export let setJointMask: (mask: JointMask) => void;

  let isOpen: boolean = false;
  let toggleData: JointMask = {};

  function handleToggle(name: string, axis: string): void {
    const current = toggleData[name] || [];
    const updated = current.includes(axis)
      ? current.filter(x => x !== axis) // remove
      : [...current, axis];             // add
    
    toggleData = { ...toggleData, [name]: updated };
    setJointMask(toggleData);
  }

  function toggleMenu(): void {
    isOpen = !isOpen && poseData;
  }

  $: jointNames = poseData && poseData.joints ? Object.keys(poseData.joints) : [];
</script>

<div class="MenuBar">
  <button class="MainButton" on:click={toggleMenu}> 
    <img class="Logo" src="ks.svg" alt="Hands Up"/>
    <span>kinescope</span>
  </button>
  
  {#if isOpen && poseData}
    <div class="DropdownMenu">
      <div class="DropdownHeader">
        <span>Joint</span><span>X</span><span>Y</span><span>Speed</span>
      </div>
      <div class="DropdownContent">
        {#each jointNames as name}
          <div class="DropdownRow">
            <span>{name}</span>
            {#each ['x', 'y', 'speed'] as axis}
              <input
                type="checkbox"
                checked={toggleData[name]?.includes(axis) || false}
                on:change={() => handleToggle(name, axis)}
              />
            {/each}
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .MenuBar {
    height: fit-content;
  }

  .MainButton {
    width: 300px;
    font-family: 'Tahoma';
    font-weight: bold;
    letter-spacing: 0.5em;
    display: inline-block;
    padding: 10px 20px 15px 20px;
    font-size: 2.5vh;
    color: #fff;
    background-color: #3498db;
    border: none;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s ease;
    border-top-left-radius: 5px;
    border-bottom-left-radius: 5px;
    border-top-right-radius: 50px;
    border-bottom-right-radius: 50px;
    transform-origin: left;
  }

  .MainButton:hover {
    background-color: #2980b9;
    transform: scaleX(1.1);
  }

  .Logo {
    height: 1.5em;
    padding-right: 1em;
    text-align: center;
  }

  .DropdownMenu {
    position: absolute;
    left: 0;
    width: max-content;
    background-color: #ffffff;
    border: 1px solid #ccc;
    border-radius: 10px;
    box-shadow: 0px 8px 16px rgba(0,0,0,0.2);
    animation: slideDown 0.3s ease-out forwards;
    transform-origin: top;
    z-index: 9999;
    overflow: hidden;
    height: 80vh;
  }

  @keyframes slideDown {
    from {
      opacity: 1;
      height: 0%;
    } 
    to {
      opacity: 1;
      height: 80vh;
    }
  }

  .DropdownHeader,
  .DropdownRow {
    display: grid;
    grid-template-columns: 100px 40px 40px 40px;
    align-items: center;
    padding: 8px;
    border-bottom: 1px solid #eee;
  }

  .DropdownHeader {
    font-weight: bold;
    background-color: #f0f0f0;
  }

  .DropdownContent {
    max-height: 200px;
    overflow-y: auto;
  }
</style>