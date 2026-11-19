import red from './assets/bauble-red.webp';
import green from './assets/bauble-green.webp';
import blue from './assets/bauble-blue.webp';
import gold from './assets/bauble-gold.webp';
import purple from './assets/bauble-purple.webp';
import silver from './assets/bauble-silver.webp';
import pink from './assets/bauble-pink.webp';
import carriage from './assets/cannon-carriage.webp';
import {COLOURS,type Colour} from './engine';
export const BAUBLE_URLS={red,green,blue,gold,purple,silver,pink};
export type Art={baubles:Record<Colour,HTMLImageElement>;carriage:HTMLImageElement};
function image(src:string):Promise<HTMLImageElement>{return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('Christmas artwork could not be loaded.'));img.src=src;});}
export async function loadArt():Promise<Art>{const sprites=await Promise.all(COLOURS.map(c=>image(BAUBLE_URLS[c])));return {baubles:Object.fromEntries(COLOURS.map((c,i)=>[c,sprites[i]])) as Art['baubles'],carriage:await image(carriage)};}
export {bauble} from './draw-bauble';
