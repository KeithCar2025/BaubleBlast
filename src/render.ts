import {CANNON,loadedProjectile,nextRowSeconds,ROW_HEIGHT,ROW_SLIDE_SECONDS,COLOURS,RADIUS,WIDTH,centre,type Game,type Resolution,type Projectile} from './engine';
import {bauble,type Art} from './art';
import {rainbowBauble} from './rainbow';
import {shortGuide,mobileGuide} from './aiming';
import {WORLD_WIDTH,WORLD_HEIGHT,ARENA_X,ARENA_Y} from './geometry';
export {WORLD_WIDTH,WORLD_HEIGHT,ARENA_X,ARENA_Y} from './geometry';
export type Effect={event:Resolution;time:number};
const hexColours=['#ff6661','#8fe171','#8ad4ff','#ffd77e','#dc91ff','#fff3d8','#ffa2dd'];
function plate(c:CanvasRenderingContext2D,x:number,y:number,w:number,h:number){c.save();c.fillStyle='#0c3a2a';c.strokeStyle='#efd087';c.lineWidth=3;c.beginPath();c.roundRect(x,y,w,h,12);c.fill();c.stroke();c.strokeStyle='#9d6726';c.lineWidth=1;c.beginPath();c.roundRect(x+5,y+5,w-10,h-10,8);c.stroke();c.restore();}
export function drawCannon(c:CanvasRenderingContext2D,art:Art,angle:number,colour:Projectile|null,recoil:number,cannonY=CANNON.y,time=0,reduced=false){
  const x=ARENA_X+CANNON.x,y=ARENA_Y+cannonY;
  c.save();c.translate(x,y);c.rotate(angle+Math.PI/2);c.translate(0,recoil*4);
  const metal=c.createLinearGradient(-22,0,23,0);metal.addColorStop(0,'#8d5519');metal.addColorStop(.22,'#ffe4a0');metal.addColorStop(.42,'#d59626');metal.addColorStop(.7,'#fff1ad');metal.addColorStop(1,'#9f631a');
  c.fillStyle=metal;c.strokeStyle='#ffe4a0';c.lineWidth=2;c.beginPath();c.roundRect(-22,-95,44,91,8);c.fill();c.stroke();
  for(const at of [-91,-56]){c.beginPath();c.roundRect(-28,at,56,10,4);c.fill();c.stroke();}c.fillStyle='#4a3418';c.beginPath();c.ellipse(0,-94,20,6,0,0,7);c.fill();c.restore();
  c.drawImage(art.carriage,x-233,y-71,466,466*458/1000);if(colour){if(colour==='rainbow')rainbowBauble(c,art,x,y,49,time,reduced);else bauble(c,art,colour,x,y,49);}
}
export function render(c:CanvasRenderingContext2D,art:Art,game:Game,angle:number,time:number,effects:Effect[],reduced:boolean,firedAt:number,showGuide:boolean,viewportHeight=WORLD_HEIGHT,mobile=false){
  const extra=CANNON.y-475;
  c.clearRect(0,0,WORLD_WIDTH,viewportHeight);
  // Atmosphere is drawn before all live baubles and the aiming guide.
  for(let i=0;i<(reduced?32:300);i++){
    const z=i%3,r=z===0?1.9:z===1?1.1:.65,y=reduced?(i*79)%viewportHeight:((i*79)+time*(.025-z*.007))%viewportHeight;
    const x=(i*137+(reduced?0:Math.sin(time/(1900+z*450)+i)*(9+z*4)))%WORLD_WIDTH;c.fillStyle=z===0?'#f1f6e48a':'#f1f6e450';c.beginPath();c.arc(x,y,r,0,7);c.fill();
  }
  for(const [x,y,r]of [[53,260,60],[747,260,60],[291,511,27],[609,511,27]]){
    const glow=c.createRadialGradient(x,y,0,x,y,r);glow.addColorStop(0,`rgba(255,190,72,${.09+(reduced?0:.03*Math.sin(time/1100+x))})`);glow.addColorStop(1,'rgba(255,190,72,0)');c.fillStyle=glow;c.fillRect(x-r,y-r,r*2,r*2);
  }
  c.save();c.translate(ARENA_X,ARENA_Y);
  // Inner rail faces are the exact physical x=0 / x=WIDTH bounce boundaries.
  for(const wallX of [0,WIDTH]){const left=wallX===0;const rail=c.createLinearGradient(wallX+(left?-10:0),0,wallX+(left?0:10),0);rail.addColorStop(0,'#795019');rail.addColorStop(.5,'#f6d48a');rail.addColorStop(1,'#b68435');c.fillStyle=rail;c.fillRect(wallX+(left?-10:0),-8,10,game.cannonY+25);c.strokeStyle='#fff0ba';c.lineWidth=2;c.beginPath();c.moveTo(wallX,-8);c.lineTo(wallX,game.cannonY+17);c.stroke();}

  if(showGuide&&!game.flight&&!game.transition&&game.rewardSeconds===null&&!game.over){
    const dots=mobile?mobileGuide(game,angle):shortGuide(angle);
    // Desktop keeps its short muzzle cue; mobile follows the collision-safe reflected path.
    const clear=mobile||dots.every(dot=>dot.x>RADIUS&&dot.x<WIDTH-RADIUS&&[...game.grid.values()].every(b=>{const p=centre(b,game.phase);return Math.hypot(p.x-dot.x,p.y-dot.y)>RADIUS+8;}));
    if(clear){c.fillStyle='#ffe098';c.shadowColor='#ffd278';c.shadowBlur=reduced?0:7;
      for(const dot of dots){c.beginPath();c.arc(dot.x,dot.y,mobile?3.2:2.1,0,Math.PI*2);c.fill();}
      c.shadowBlur=0;
    }
  }
  {
    const rowIn=nextRowSeconds(game),imminent=!game.over&&rowIn!==null&&rowIn<=3;c.strokeStyle=imminent?'#f0a180aa':'#d77d6866';c.lineWidth=1;c.setLineDash([7,8]);c.beginPath();c.moveTo(0,game.dangerY);c.lineTo(WIDTH,game.dangerY);c.stroke();c.setLineDash([]);
  }
  const descent=game.transition?.descending?Math.min(1,game.transition.elapsed/(game.transition.duration??ROW_SLIDE_SECONDS)):1;
  const offset=game.transition?.descending&&!reduced?-ROW_HEIGHT*(1-descent*descent*(3-2*descent)):0;
  c.save();c.beginPath();c.rect(0,-12,WIDTH,560+extra);c.clip();
  for(const b of game.grid.values()){const p=centre(b,game.phase);p.y+=offset;const impact=effects.find(fx=>fx.event.attachedId===b.id&&time-fx.time<180),settle=impact&&!reduced?.94+.06*(time-impact.time)/180:1;bauble(c,art,b.colour,p.x,p.y,RADIUS*settle);}
  c.restore();
  if(game.transition?.descending&&!reduced){c.strokeStyle=`rgba(255,196,100,${.5*Math.sin(descent*Math.PI)})`;c.lineWidth=5;c.strokeRect(0,0,WIDTH,game.dangerY);}
  if(game.flight){if(game.flight.colour==='rainbow')rainbowBauble(c,art,game.flight.x,game.flight.y,RADIUS,time,reduced);else bauble(c,art,game.flight.colour,game.flight.x,game.flight.y,RADIUS);}
  for(const fx of effects){
    const age=(time-fx.time)/1000;if(age<0)continue;
    if(fx.event.bomb&&age<.65&&!reduced){c.save();c.translate(fx.event.impact.x,fx.event.impact.y);c.globalAlpha=1-age/.65;c.fillStyle='rgba(255,230,170,.08)';c.fillRect(-fx.event.impact.x,-fx.event.impact.y,WIDTH,game.cannonY+60);for(let ring=0;ring<6;ring++){c.strokeStyle=['#ff81a1','#ffd778','#8ef4bb','#8ad9ff','#c6a0ff','#fff0ad'][ring];c.lineWidth=3;c.beginPath();c.arc(0,0,15+age*(190+ring*22),0,7);c.stroke();}for(let i=0;i<30;i++){const a=i*2.4,d=age*(130+i%6*35);c.fillStyle=hexColours[i%7];c.beginPath();c.arc(Math.cos(a)*d,Math.sin(a)*d,2+i%3,0,7);c.fill();}c.restore();}
    if(!reduced){
      for(const b of fx.event.popped){if(age>.22)continue;c.globalAlpha=Math.max(0,1-age/.22);const dx=b.x-fx.event.impact.x,dy=b.y-fx.event.impact.y,distance=Math.hypot(dx,dy)||1,burst=fx.event.bomb?age*120:0;bauble(c,art,b.colour,b.x+dx/distance*burst,b.y+dy/distance*burst,RADIUS*(1+age*.35));for(let i=0;i<6;i++){const a=i*Math.PI/3+b.id;c.fillStyle=hexColours[COLOURS.indexOf(b.colour)];c.beginPath();c.arc(b.x+Math.cos(a)*age*110,b.y+Math.sin(a)*age*110,2.5,0,7);c.fill();}}
      c.globalAlpha=1;
      for(const b of fx.event.fallen){if(age>.45)continue;c.globalAlpha=Math.max(0,1-age/.45);bauble(c,art,b.colour,b.x+(b.id%3-1)*age*35,b.y+age*25+age*age*1400,RADIUS,age*(b.id%2?-.9:.9));}c.globalAlpha=1;
    }
    if(fx.event.wave&&age<.7&&!reduced){c.strokeStyle=`rgba(255,221,125,${1-age/.7})`;c.lineWidth=3;c.beginPath();c.arc(WIDTH/2,160,30+age*260,0,Math.PI*2);c.stroke();}
    if(age<1.2&&fx.event.points){c.globalAlpha=1-age/1.2;c.fillStyle='#ffe3a2';c.strokeStyle='#293b22';c.lineWidth=3;c.textAlign='center';c.font='bold 30px Georgia';const text=`+${fx.event.points.toLocaleString('en-GB')}`;c.strokeText(text,fx.event.impact.x,fx.event.impact.y-age*65);c.fillText(text,fx.event.impact.x,fx.event.impact.y-age*65);c.globalAlpha=1;}
    if(age<.3&&!reduced){c.strokeStyle=`rgba(255,220,140,${1-age/.3})`;c.lineWidth=2;c.beginPath();c.arc(fx.event.impact.x,fx.event.impact.y,10+age*90,0,7);c.stroke();}
  }
  c.restore();
  drawCannon(c,art,angle,game.flight||game.transition||game.rewardSeconds!==null?null:loadedProjectile(game),Math.max(0,1-(time-firedAt)/180),game.cannonY,time,reduced);
  const nextX=ARENA_X+CANNON.x+138;plate(c,nextX,544+extra,99,108);c.fillStyle='#ffe3a2';c.font='bold 23px Georgia';c.textAlign='center';c.fillText('NEXT',nextX+49,567+extra);bauble(c,art,game.bombPending?game.current:game.next,nextX+49,612+extra,29);
  if(game.rewardSeconds!==null){const t=Math.min(1,game.rewardSeconds),x=ARENA_X+CANNON.x,y=ARENA_Y+game.cannonY;c.save();c.globalAlpha=reduced?1:Math.min(1,t*3);rainbowBauble(c,art,x,y-(reduced?0:80*(1-t)**2),49,time,reduced);c.restore();if(!reduced){c.strokeStyle=`hsla(${time/9%360},80%,75%,.6)`;c.lineWidth=5;c.strokeRect(ARENA_X-8,ARENA_Y-12,WIDTH+16,game.cannonY+42);}}
  if(time-firedAt<140&&!reduced){const x=ARENA_X+CANNON.x+Math.cos(angle)*98,y=ARENA_Y+game.cannonY+Math.sin(angle)*98;c.fillStyle=`rgba(255,223,135,${1-(time-firedAt)/140})`;c.beginPath();c.arc(x,y,7,0,7);c.fill();}
}
