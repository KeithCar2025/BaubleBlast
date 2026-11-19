import type {Art} from './art';
import {bauble} from './draw-bauble';
/** One canonical glass ornament; glow is decorative and never changes collision radius. */
export function rainbowBauble(c:CanvasRenderingContext2D,art:Art,x:number,y:number,r:number,time:number,reduced=false){
 c.save();c.translate(x,y);const halo=c.createRadialGradient(0,0,r*.7,0,0,r*1.45);halo.addColorStop(0,'#fff0a538');halo.addColorStop(1,'#f8b5ff00');c.fillStyle=halo;c.beginPath();c.arc(0,0,r*1.45,0,7);c.fill();bauble(c,art,'gold',0,0,r);
 c.save();c.beginPath();c.arc(0,0,r*.98,0,Math.PI*2);c.clip();const drift=reduced?0:Math.sin(time/1700)*r*.3,glass=c.createLinearGradient(-r+drift,-r,r+drift,r);['#ff517e','#ffa63a','#ffe66b','#48dfaa','#4ba7ff','#ae72f2','#f57fd4'].forEach((colour,i)=>glass.addColorStop(i/6,colour));c.globalAlpha=.84;c.fillStyle=glass;c.fillRect(-r,-r,2*r,2*r);c.globalAlpha=1;const shade=c.createRadialGradient(-r*.3,-r*.4,r*.08,0,0,r);shade.addColorStop(0,'#ffffffb0');shade.addColorStop(.4,'#ffffff08');shade.addColorStop(.8,'#17213a22');shade.addColorStop(1,'#11133288');c.fillStyle=shade;c.fillRect(-r,-r,2*r,2*r);c.fillStyle='#fff8e980';c.beginPath();c.ellipse(-r*.35,-r*.45,r*.14,r*.28,-.6,0,7);c.fill();
 c.strokeStyle='#fff1bd';c.lineWidth=Math.max(1,r*.045);c.lineCap='round';for(let i=0;i<6;i++){c.save();c.rotate(i*Math.PI/3);c.beginPath();c.moveTo(0,0);c.lineTo(0,-r*.55);for(const at of [.28,.43]){c.moveTo(-r*.12,-r*(at-.1));c.lineTo(0,-r*at);c.lineTo(r*.12,-r*(at-.1));}c.stroke();c.restore();}c.restore();
 for(let i=0;i<5;i++){const phase=reduced?i:i+time/2200,a=phase*2.4,d=r*(1.1+(i%2)*.15);c.fillStyle=i%2?'#fff5bb':'#f2c56d';c.globalAlpha=reduced?.65:.4+.4*Math.sin(phase+1)**2;c.beginPath();c.arc(Math.cos(a)*d,Math.sin(a)*d,r*.035,0,7);c.fill();}c.restore();
}
