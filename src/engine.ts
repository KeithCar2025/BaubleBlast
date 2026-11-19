/** All simulation and prediction use these fixed logical coordinates, never CSS pixels. */
import {RADIUS,DIAMETER,ROW_HEIGHT,COLS,WIDTH,DANGER_Y,MAX_ROWS,SHOT_SPEED,CANNON,START_ROWS} from './geometry';
export * from './geometry';
export const ROW_SLIDE_SECONDS=.36, CLEAR_BONUS=250, SURVIVAL_SECONDS=180, BOMB_THRESHOLD=10;
export const COLOURS=['red','green','blue','gold','purple','silver','pink'] as const;
export type Colour=(typeof COLOURS)[number];
export type Projectile=Colour|'rainbow';
export type Point={x:number;y:number};
export type Cell={row:number;col:number};
export type Bubble=Cell&{colour:Colour;id:number};
export type Flight=Point&{dx:number;dy:number;colour:Projectile};
export type Hit={distance:number;type:'wall'|'ceiling'|'bubble';cell?:Cell};
export type Game={cannonY:number;dangerY:number;grid:Map<string,Bubble>;phase:number;seed:number;nextId:number;current:Colour;next:Colour;score:number;combo:number;misses:number;bombPending:boolean;bombsEarned:number;rewardSeconds:number|null;shots:number;pressureShots:number;wave:number;activeColours:number;flight:Flight|null;transition:{elapsed:number;wait:number;descending:boolean;event:Resolution;automatic?:boolean;duration?:number}|null;over:boolean;lastShot:string;activeSeconds:number;nextRowAt:number;pendingRows:number;endReason:'danger'|'time'|null};
export type Removal=Bubble&Point;
export type Resolution={popped:Removal[];fallen:Removal[];points:number;multiplier:number;advanced:boolean;wave:boolean;impact:Point;snapped:Cell|null;attachedId:number|null;bomb:boolean;earnsBomb:boolean;refillRows?:number};
export const key=(c:Cell)=>`${c.row}:${c.col}`;
export const parity=(row:number,phase:number)=>(row+phase)%2;
export const columns=(row:number,phase:number)=>COLS-parity(row,phase);
export const validCell=(cell:Cell,phase:number)=>Number.isInteger(cell.row)&&Number.isInteger(cell.col)&&cell.row>=0&&cell.row<MAX_ROWS&&cell.col>=0&&cell.col<columns(cell.row,phase);
export function centre(cell:Cell,phase:number):Point{return {x:RADIUS+cell.col*DIAMETER+parity(cell.row,phase)*RADIUS,y:RADIUS+cell.row*ROW_HEIGHT};}
export function neighbours(cell:Cell,phase:number):Cell[]{
  const offset=parity(cell.row,phase)?0:-1;
  return [{row:cell.row,col:cell.col-1},{row:cell.row,col:cell.col+1},...[-1,1].flatMap(dr=>[{row:cell.row+dr,col:cell.col+offset},{row:cell.row+dr,col:cell.col+offset+1}])].filter(c=>validCell(c,phase));
}
function random(game:Game){game.seed=(Math.imul(game.seed,1664525)+1013904223)>>>0;return game.seed/4294967296;}
export function represented(game:Game){return COLOURS.filter(c=>[...game.grid.values()].some(b=>b.colour===c));}
export function chooseColour(game:Game):Colour{const available=represented(game);return available[Math.floor(random(game)*available.length)]??COLOURS[0];}
export function targetColourCount(score:number,wave:number){return Math.min(7,4+Math.max(score>=8000?3:score>=4000?2:score>=1500?1:0,Math.floor((wave-1)/2)));}
function shuffled(game:Game,count:number){const colours=[...COLOURS.slice(0,count)];for(let i=colours.length-1;i>0;i--){const j=Math.floor(random(game)*(i+1));[colours[i],colours[j]]=[colours[j],colours[i]];}return colours;}
function makeRow(game:Game,row:number){
  const palette=shuffled(game,game.activeColours),offset=Math.floor(random(game)*palette.length);
  for(let col=0;col<columns(row,game.phase);col++){
    game.grid.set(key({row,col}),{row,col,colour:palette[(Math.floor(col/2)+offset)%palette.length],id:game.nextId++});
  }
}
function buildWave(game:Game){game.grid.clear();game.phase=0;for(let row=0;row<START_ROWS;row++)makeRow(game,row);}
export function newGame(seed:number):Game{
  const game:Game={cannonY:CANNON.y,dangerY:DANGER_Y,grid:new Map(),phase:0,seed:seed>>>0,nextId:1,current:'red',next:'red',score:0,combo:0,misses:0,bombPending:false,bombsEarned:0,rewardSeconds:null,shots:0,pressureShots:0,wave:1,activeColours:4,flight:null,transition:null,over:false,lastShot:'',activeSeconds:0,nextRowAt:140,pendingRows:0,endReason:null};
  buildWave(game);game.current=chooseColour(game);game.next=chooseColour(game);return game;
}
export function sameColourCluster(game:Game,start:Cell):Bubble[]{
  const root=game.grid.get(key(start));if(!root)return [];
  const seen=new Set<string>(),queue=[root],group:Bubble[]=[];
  while(queue.length){const bubble=queue.pop()!,id=key(bubble);if(seen.has(id))continue;seen.add(id);if(bubble.colour!==root.colour)continue;group.push(bubble);for(const c of neighbours(bubble,game.phase)){const b=game.grid.get(key(c));if(b&&!seen.has(key(b)))queue.push(b);}}
  return group;
}
export function unsupported(game:Game):Bubble[]{
  const supported=new Set<string>(),queue=[...game.grid.values()].filter(b=>b.row===0);
  while(queue.length){const b=queue.pop()!,id=key(b);if(supported.has(id))continue;supported.add(id);for(const c of neighbours(b,game.phase)){const next=game.grid.get(key(c));if(next&&!supported.has(key(next)))queue.push(next);}}
  return [...game.grid.values()].filter(b=>!supported.has(key(b)));
}
export function reachesDanger(game:Game){return [...game.grid.values()].some(b=>centre(b,game.phase).y+RADIUS>=game.dangerY);}
export function advanceRow(game:Game){
  // Flip phase as row indices advance: existing x positions stay exactly fixed.
  game.phase=1-game.phase;
  game.grid=new Map([...game.grid.values()].map(b=>{const shifted={...b,row:b.row+1};return [key(shifted),shifted];}));
  game.activeColours=targetColourCount(game.score,game.wave);makeRow(game,0);
}
export function aimAngle(point:Point,cannonY=CANNON.y){return Math.max(-Math.PI+.22,Math.min(-.22,Math.atan2(point.y-cannonY,point.x-CANNON.x)));}
export function launchPoint(angle:number,cannonY=CANNON.y):Point{return {x:CANNON.x+Math.cos(angle)*50,y:cannonY+Math.sin(angle)*50};}
/** Analytic swept-circle collision. Shared by flight integration and the dotted prediction. */
export function nextHit(game:Game,point:Point,direction:Point):Hit{
  let hit:Hit={distance:Infinity,type:'ceiling'};
  const consider=(distance:number,type:Hit['type'],cell?:Cell)=>{if(distance>=-1e-7&&distance<hit.distance){hit={distance:Math.max(0,distance),type,cell};}};
  if(direction.x>1e-9)consider((WIDTH-RADIUS-point.x)/direction.x,'wall');
  if(direction.x< -1e-9)consider((RADIUS-point.x)/direction.x,'wall');
  if(direction.y< -1e-9)consider((RADIUS-point.y)/direction.y,'ceiling');
  for(const b of game.grid.values()){
    const p=centre(b,game.phase),x=p.x-point.x,y=p.y-point.y,projection=x*direction.x+y*direction.y;
    const discriminant=projection*projection-(x*x+y*y-DIAMETER*DIAMETER);
    if(discriminant>=-1e-7&&projection>=0)consider(projection-Math.sqrt(Math.max(0,discriminant)),'bubble',b);
  }
  return hit;
}
export function snapCell(game:Game,point:Point,hit:Hit):Cell|null{
  let candidates:Cell[]=[];
  if(hit.type==='ceiling')candidates=Array.from({length:columns(0,game.phase)},(_,col)=>({row:0,col}));
  else if(hit.cell){
    const touching=[...game.grid.values()].filter(b=>{const p=centre(b,game.phase);return Math.hypot(point.x-p.x,point.y-p.y)<=DIAMETER+.1;});
    candidates=touching.flatMap(b=>neighbours(b,game.phase));if(!candidates.length)candidates=neighbours(hit.cell,game.phase);
  }
  candidates=candidates.filter(c=>validCell(c,game.phase)&&!game.grid.has(key(c)));
  if(!candidates.length)candidates=[...game.grid.values()].flatMap(b=>neighbours(b,game.phase)).filter(c=>!game.grid.has(key(c)));
  candidates.sort((a,b)=>{const p=centre(a,game.phase),q=centre(b,game.phase);return ((p.x-point.x)**2+(p.y-point.y)**2)-((q.x-point.x)**2+(q.y-point.y)**2)||a.row-b.row||a.col-b.col;});
  return candidates[0]??null;
}
export function predict(game:Game,angle:number){
  let point=launchPoint(angle,game.cannonY),direction={x:Math.cos(angle),y:Math.sin(angle)};
  const segments:{from:Point;to:Point}[]=[];
  for(let i=0;i<12;i++){
    const hit=nextHit(game,point,direction);if(!Number.isFinite(hit.distance))break;
    const to={x:point.x+direction.x*hit.distance,y:point.y+direction.y*hit.distance};segments.push({from:{...point},to});
    if(hit.type!=='wall')return {segments,impact:to,cell:snapCell(game,to,hit)};
    point=to;direction={x:-direction.x,y:direction.y};
  }
  return {segments,impact:point,cell:null};
}
/** Opening misses give way to shot-based pressure at one minute. */
export function missLimit(game:Game){return game.activeSeconds<60?4:game.activeSeconds<180?2:1;}
export function rowDue(game:Game,successful:boolean){if(survivalMode(game)){game.pressureShots=0;game.misses=0;return true;}if(game.activeSeconds>=60){game.pressureShots++;if(game.pressureShots<2)return false;game.pressureShots=0;game.misses=0;return true;}if(successful)return false;game.misses++;if(game.misses<missLimit(game))return false;game.misses=0;return true;}
export function loadedProjectile(game:Game):Projectile{return game.bombPending?'rainbow':game.current;}
export function hexBlast(origin:Cell,phase:number,rings=2){
  if(!validCell(origin,phase))return [];const cells=new Map<string,Cell>([[key(origin),origin]]);let edge=[origin];
  for(let ring=0;ring<rings;ring++){const next:Cell[]=[];for(const cell of edge)for(const n of neighbours(cell,phase))if(!cells.has(key(n))){cells.set(key(n),n);next.push(n);}edge=next;}
  return [...cells.values()];
}
export function endGame(game:Game,reason:'danger'|'time'){
  game.over=true;game.endReason=reason;game.flight=null;game.transition=null;game.pendingRows=0;game.bombPending=false;game.rewardSeconds=null;
}
/** Active wall-clock time is separate from capped collision/animation substeps. */
export function survivalMode(game:Game){return game.activeSeconds>=SURVIVAL_SECONDS;}
export function elapsedSeconds(game:Game){return Math.floor(game.activeSeconds+1e-8);}
export function advanceTime(game:Game,seconds:number){
  if(game.over||!Number.isFinite(seconds)||seconds<=0)return;
  game.activeSeconds+=seconds;
  while(game.nextRowAt<=game.activeSeconds){game.pendingRows++;game.nextRowAt+=20;}
}
export function nextRowSeconds(game:Game){return game.activeSeconds<120?null:game.pendingRows?0:Math.max(0,Math.ceil(game.nextRowAt-game.activeSeconds));}
function completeShot(game:Game){
  if(reachesDanger(game)){endGame(game,'danger');return;}
  const event=game.transition?.event;if(!game.transition?.automatic&&!event?.bomb){game.current=game.next;game.next=chooseColour(game);}
  game.transition=null;
  if(event?.earnsBomb&&!game.bombPending){game.bombPending=true;game.bombsEarned++;game.rewardSeconds=0;}
}
export function fire(game:Game,angle:number){
  if(game.over||game.flight||game.transition||game.pendingRows||game.rewardSeconds!==null)return false;
  const point=launchPoint(angle,game.cannonY),colour=loadedProjectile(game);if(colour==='rainbow')game.bombPending=false;game.flight={...point,dx:Math.cos(angle),dy:Math.sin(angle),colour};game.shots++;return true;
}
export function resolve(game:Game,point:Point,hit:Hit,colour:Projectile):Resolution{
  const bomb=colour==='rainbow',before=game.grid.size;
  const cell=bomb?(hit.cell??Array.from({length:columns(0,game.phase)},(_,col)=>({row:0,col})).sort((a,b)=>Math.abs(centre(a,game.phase).x-point.x)-Math.abs(centre(b,game.phase).x-point.x))[0]):snapCell(game,point,hit);
  const event:Resolution={popped:[],fallen:[],points:0,multiplier:1,advanced:false,wave:false,impact:point,snapped:cell??null,attachedId:null,bomb,earnsBomb:false};
  if(!cell){endGame(game,'danger');return event;}
  let removed:Bubble[]=[];
  if(bomb){removed=hexBlast(cell,game.phase).flatMap(c=>{const b=game.grid.get(key(c));return b?[b]:[];});}
  else{const attached={...cell,colour,id:game.nextId++};game.grid.set(key(cell),attached);event.attachedId=attached.id;const group=sameColourCluster(game,cell);if(group.length>=3)removed=group;}
  event.popped=removed.map(b=>({...b,...centre(b,game.phase)}));for(const b of removed)game.grid.delete(key(b));
  if(removed.length){event.fallen=unsupported(game).map(b=>({...b,...centre(b,game.phase)}));for(const b of event.fallen)game.grid.delete(key(b));}
  const successful=event.popped.length+event.fallen.length>0;
  if(successful){if(!bomb){game.combo++;event.multiplier=Math.min(2,1+(game.combo-1)*.5);}event.points=(event.popped.length*10+event.fallen.length*20)*event.multiplier;game.score+=event.points;game.lastShot=`+${event.points}`;}else{game.combo=0;game.lastShot='No match';}
  event.earnsBomb=!bomb&&!game.bombPending&&new Set([...event.popped,...event.fallen].map(b=>b.id)).size>=BOMB_THRESHOLD;
  event.wave=before>0&&game.grid.size===0;event.refillRows=successful&&!event.wave&&game.grid.size<COLS*2?Math.ceil((COLS*4-game.grid.size)/(COLS-.5)):0;event.advanced=rowDue(game,successful)&&!event.wave;if(event.refillRows)event.advanced=true;if(survivalMode(game))game.misses=0;
  if(event.wave){event.points+=CLEAR_BONUS;game.score+=CLEAR_BONUS;game.lastShot=`+${event.points}`;}
  game.transition={elapsed:0,wait:event.fallen.length?.45:event.bomb?.45:event.popped.length?.22:.08,descending:false,event};game.flight=null;return event;
}
export function rowSlideSeconds(game:Game){return game.activeSeconds>=120?.18:game.activeSeconds>=60?.3:ROW_SLIDE_SECONDS;}
export function step(game:Game,seconds:number):Resolution|null{
  if(game.over)return null;
  if(game.rewardSeconds!==null){game.rewardSeconds+=Math.max(0,Math.min(seconds,.1));if(game.rewardSeconds>=1)game.rewardSeconds=null;return null;}
  // Automatic rows use the same removal/descent gate as shot rows, never collision code.
  if(!game.flight&&!game.transition&&game.pendingRows){
    game.pendingRows--;
    game.transition={elapsed:0,wait:0,descending:false,automatic:true,event:{popped:[],fallen:[],points:0,multiplier:1,advanced:true,wave:false,impact:{x:0,y:0},snapped:null,attachedId:null,bomb:false,earnsBomb:false}};
  }
  if(game.transition&&!game.over){
    const transition=game.transition;transition.elapsed+=Math.max(0,Math.min(seconds,.1));
    if(!transition.descending&&transition.elapsed>=transition.wait){
      if(!transition.event.wave&&!transition.event.advanced){completeShot(game);return null;}
      transition.elapsed-=transition.wait;transition.descending=true;transition.duration=rowSlideSeconds(game);
      if(transition.event.wave){game.pendingRows=0;game.wave++;game.activeColours=targetColourCount(game.score,game.wave);buildWave(game);game.pressureShots=0;}else {if(!transition.automatic&&game.pendingRows>0)game.pendingRows--;if(transition.event.refillRows)game.pendingRows=Math.max(game.pendingRows,transition.event.refillRows-1);advanceRow(game);}
    }
    if(transition.descending&&transition.elapsed>=(transition.duration??ROW_SLIDE_SECONDS)){
      completeShot(game);
    }
    return null;
  }
  const flight=game.flight;if(!flight||game.over)return null;
  let remaining=SHOT_SPEED*Math.max(0,Math.min(seconds,.1));
  for(let iteration=0;iteration<8&&remaining>1e-8;iteration++){
    const hit=nextHit(game,flight,{x:flight.dx,y:flight.dy});
    if(hit.distance>remaining){flight.x+=flight.dx*remaining;flight.y+=flight.dy*remaining;return null;}
    flight.x+=flight.dx*hit.distance;flight.y+=flight.dy*hit.distance;remaining-=hit.distance;
    if(hit.type==='wall'){flight.dx=-flight.dx;continue;}
    return resolve(game,{x:flight.x,y:flight.y},hit,flight.colour);
  }
  return null;
}
