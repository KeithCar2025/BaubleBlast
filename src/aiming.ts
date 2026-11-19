import {CANNON,predict,type Game,type Point} from './engine';

/** Five fixed muzzle dots: no collision, attachment or bounce prediction. */
export function shortGuide(angle:number){
  return Array.from({length:5},(_,i)=>{
    const distance=102+i*6;
    return {x:CANNON.x+Math.cos(angle)*distance,y:CANNON.y+Math.sin(angle)*distance};
  });
}

/** Follow the actual swept-circle trajectory, keeping dot spacing through each wall reflection. */
export function mobileGuide(game:Game,angle:number):Point[]{
  const segments=predict(game,angle).segments,dots:Point[]=[];
  const total=segments.reduce((sum,s)=>sum+Math.hypot(s.to.x-s.from.x,s.to.y-s.from.y),0);
  let next=52,travelled=0;
  for(const segment of segments){
    const dx=segment.to.x-segment.from.x,dy=segment.to.y-segment.from.y,length=Math.hypot(dx,dy);
    if(length<1e-8)continue;
    while(next<=travelled+length&&next<total-10){
      const t=(next-travelled)/length;
      dots.push({x:segment.from.x+dx*t,y:segment.from.y+dy*t});next+=18;
    }
    travelled+=length;
  }
  return dots;
}
