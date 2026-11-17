import type { GripperState } from '../lib/microGripper';
import type { MutableRefObject } from 'react';
import DigestiveScene from './DigestiveScene';
import type { SimulationMotion } from '../lib/digestiveSimulation';
import type { CapsulePosition } from '../types';
import { cn } from '../lib/utils';

interface CapsuleSceneProps {
  orientation: CapsulePosition;
  active?: boolean;
  gripper?: GripperState;
  className?: string;
  motion?: MutableRefObject<SimulationMotion>;
}

export default function CapsuleScene({ orientation, active = true, className, motion, gripper }: CapsuleSceneProps) {
  return <div className={cn('h-full w-full', className)}>
    <DigestiveScene view="mapping" orientation={orientation} active={active} motion={motion} gripper={gripper} />
  </div>;
}
