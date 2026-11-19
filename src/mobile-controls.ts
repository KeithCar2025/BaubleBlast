export const MOBILE_QUERY='(max-width: 800px) and (orientation: portrait), (max-width: 1100px) and (pointer: coarse)';
export {WORLD_HEIGHT as MOBILE_WORLD_HEIGHT} from './geometry';
export const AIM_STEP=Math.PI/60, AIM_LIMIT=Math.PI*75/180, HOLD_SPEED=Math.PI/3;
export function mobileAngle(angle:number){return Math.max(-Math.PI/2-AIM_LIMIT,Math.min(-Math.PI/2+AIM_LIMIT,angle));}
