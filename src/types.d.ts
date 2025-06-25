// Global type declarations for the Kinescope application

declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}

export interface FrameData {
  t: number;
  x: number;
  y: number;
  z?: number;
}

export interface JointData {
  frames: FrameData[];
  color: [number, number, number];
  units: string;
}

export interface JointMask {
  [jointName: string]: string[];
}

export interface PoseData {
  joints: { [key: string]: JointData };
  GetJoint1D: (joint_name: string, dim_name: string) => Array<{ x: number; y: number }>;
  GetJointSpeed: (joint_name: string) => Array<{ x: number; y: number }>;
  GetJoint2D: (joint_name: string) => Array<{ t: number; x: number; y: number }>;
  GetJointColorDynamic: (joint_name: string, window?: number, keypoint?: number) => string[];
  GetJointColor: (joint_name: string, opacity?: number) => string;
  AddJointFrame: (joint_data: any) => void;
}

// Chart.js type extensions
declare module 'chart.js' {
  interface TooltipModel {
    opacity: number;
  }
}