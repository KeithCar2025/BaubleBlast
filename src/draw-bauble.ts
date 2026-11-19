import type {Art} from './art';
import type {Colour} from './engine';
/** The same calibrated sprite body centre/radius is used in grid, projectile, preview and result. */
export function bauble(context:CanvasRenderingContext2D,art:Art,colour:Colour,x:number,y:number,radius:number,rotation=0){context.save();context.translate(x,y);context.rotate(rotation);context.drawImage(art.baubles[colour],-radius*1.02,-radius*1.39,radius*2.04,radius*2.38);context.restore();}
