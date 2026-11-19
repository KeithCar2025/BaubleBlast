import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {newGame,aimAngle,fire,step,advanceTime,elapsedSeconds,survivalMode,nextRowSeconds,BOMB_THRESHOLD,loadedProjectile,WIDTH,COLS,DANGER_Y,CANNON,COLOURS,type Game} from './engine';
import {loadArt,BAUBLE_URLS,type Art} from './art';
import {render,ARENA_X,ARENA_Y,WORLD_WIDTH,WORLD_HEIGHT,type Effect} from './render';
import {MobileControls} from './MobileControls';
import {MOBILE_QUERY,mobileAngle} from './mobile-controls';
import {readBest,saveBest,type Result} from './high-score';
import scene from './assets/village-frame.webp';
import banner from './assets/title-banner.webp';
import carriage from './assets/cannon-carriage.webp';
import './style.css';
type Mode='start'|'countdown'|'running'|'paused'|'over';
function seed(){return crypto.getRandomValues(new Uint32Array(1))[0];}
function clockText(seconds:number){return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;}
function snapshot(game:Game){return {elapsed:elapsedSeconds(game),survival:survivalMode(game),rowIn:nextRowSeconds(game),pendingRows:game.pendingRows,score:game.score,current:loadedProjectile(game),next:game.bombPending?game.current:game.next,reward:game.rewardSeconds!==null,bombs:game.bombsEarned,shots:game.shots,transition:game.rewardSeconds!==null?'reward':game.transition?(game.transition.descending?"descending":"removing"):"ready",combo:game.combo,wave:game.wave};}
function Trophy(){return <svg viewBox="0 0 40 45" aria-hidden="true"><path d="M10 4H30V16Q30 29 20 30Q10 29 10 16ZM17 29H23V37H30V42H10V37H17Z" fill="currentColor"/><path d="M10 7H3V13Q3 23 12 23M30 7H37V13Q37 23 28 23" fill="none" stroke="currentColor" strokeWidth="3"/></svg>;}
function App(){
  const [mobile,setMobile]=useState(()=>matchMedia(MOBILE_QUERY).matches),mobileRef=useRef(mobile);
  const [initial]=useState(()=>newGame(seed())),game=useRef<Game>(initial),[stats,setStats]=useState(()=>snapshot(initial)),[best,setBest]=useState(readBest),bestRef=useRef(best);
  const [mode,setMode]=useState<Mode>('start'),modeRef=useRef<Mode>('start'),previous=useRef<Mode>('running'),[count,setCount]=useState(3),countTime=useRef(0);
  const [art,setArt]=useState<Art|null>(null),artRef=useRef<Art|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[result,setResult]=useState<Result|null>(null),[comboFlash,setComboFlash]=useState(false),[rushBanner,setRushBanner]=useState(false);
  const canvas=useRef<HTMLCanvasElement>(null),overlay=useRef<HTMLDivElement>(null),angle=useRef(-Math.PI/2),target=useRef(-Math.PI/2),effects=useRef<Effect[]>([]),last=useRef(0),accumulator=useRef(0),firedAt=useRef(-10000),active=useRef<{id:number;type:string;x:number;y:number;moved:boolean}|null>(null),flashTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  useEffect(()=>{if(!stats.survival){setRushBanner(false);return;}setRushBanner(true);const timer=setTimeout(()=>setRushBanner(false),1500);return()=>clearTimeout(timer);},[stats.survival]);
  function change(next:Mode){modeRef.current=next;setMode(next);last.current=0;}
  function announce(message:string){setNotice(message);}
  function start(){if(!artRef.current)return;game.current=newGame(seed());setStats(snapshot(game.current));effects.current=[];angle.current=target.current=-Math.PI/2;active.current=null;accumulator.current=0;countTime.current=0;setCount(3);setResult(null);setComboFlash(false);announce('');change('countdown');canvas.current?.focus({preventScroll:true});}
  function pause(automatic=false){if(automatic&&!['running','countdown'].includes(modeRef.current))return;if(modeRef.current==='paused')return;previous.current=modeRef.current;active.current=null;change('paused');}
  function resume(){if(document.hidden)return;change(previous.current);canvas.current?.focus({preventScroll:true});}
  function shoot(){if(modeRef.current!=='running')return false;angle.current=target.current;if(fire(game.current,angle.current)){firedAt.current=performance.now();setStats(snapshot(game.current));return true;}return false;}
  function rotateMobile(radians:number){if(modeRef.current!=='running'||game.current.flight||game.current.transition||document.hidden)return;angle.current=target.current=mobileAngle(target.current+radians);if(canvas.current)canvas.current.dataset.aim=String(angle.current);}
  useEffect(()=>{const query=matchMedia(MOBILE_QUERY);function update(){mobileRef.current=query.matches;setMobile(query.matches);active.current=null;if(query.matches)angle.current=target.current=mobileAngle(target.current);}query.addEventListener('change',update);return()=>query.removeEventListener('change',update);},[]);
  useEffect(()=>{let live=true;void loadArt().then(images=>{if(live){artRef.current=images;setArt(images);}}).catch(e=>{if(live)setError(e.message);});return()=>{live=false;};},[]);
  useEffect(()=>{
    const c=canvas.current!,context=c.getContext('2d');if(!context)return;
    const motion=matchMedia('(prefers-reduced-motion: reduce)');let frame=0;
    const resize=()=>{const width=c.getBoundingClientRect().width,scale=width*Math.min(devicePixelRatio||1,2)/WORLD_WIDTH;c.width=Math.round(WORLD_WIDTH*scale);const height=WORLD_HEIGHT;c.height=Math.round(height*scale);context!.setTransform(c.width/WORLD_WIDTH,0,0,c.height/height,0,0);};
    const observer=new ResizeObserver(resize);observer.observe(c);resize();
    function finish(){const g=game.current,oldBest=Math.max(bestRef.current,readBest()),nextBest=Math.max(oldBest,g.score);bestRef.current=nextBest;setBest(nextBest);if(g.score>oldBest)saveBest(nextBest);setResult({score:g.score,best:nextBest,newBest:g.score>oldBest,survived:Math.floor(g.activeSeconds)});change('over');}
    function draw(time:number){
      if(document.hidden){last.current=0;return;}
      const activeDt=last.current?Math.max(0,time-last.current):0,dt=Math.min(100,activeDt);last.current=time;
      angle.current+=(target.current-angle.current)*(1-Math.exp(-dt/65));
      const wasRunning=modeRef.current==='running';
      if(modeRef.current==='countdown'){countTime.current+=dt;setCount(Math.max(1,3-Math.floor(countTime.current/1000)));if(countTime.current>=3000){change('running');accumulator.current=0;}}
      if(modeRef.current==='running'){
        const oldElapsed=elapsedSeconds(game.current),oldRow=nextRowSeconds(game.current);advanceTime(game.current,wasRunning?activeDt/1000:0);if(oldElapsed!==elapsedSeconds(game.current)||oldRow!==nextRowSeconds(game.current))setStats(snapshot(game.current));if(game.current.over)finish();
        accumulator.current+=dt/1000;
        while(accumulator.current>=1/120&&modeRef.current==='running'){
          accumulator.current-=1/120;const before=game.current.transition,descending=before?.descending,reward=game.current.rewardSeconds!==null,bombs=game.current.bombsEarned;const event=step(game.current,1/120);
          if(before!==game.current.transition||descending!==game.current.transition?.descending||reward!==(game.current.rewardSeconds!==null))setStats(snapshot(game.current));
          if(bombs!==game.current.bombsEarned){announce('Rainbow Bomb unlocked! Your next shot is a magical two-ring blast.');}
          if(event){effects.current.push({event,time});setStats(snapshot(game.current));if(event.points){announce(`+${event.points} points${event.multiplier>1?`, combo ×${event.multiplier}`:''}.`);if(event.multiplier>1){setComboFlash(true);if(flashTimer.current)clearTimeout(flashTimer.current);flashTimer.current=setTimeout(()=>setComboFlash(false),1000);}}if(event.wave)announce('Board cleared! +250 bonus. A fresh five-row formation.');}
          if(game.current.over)finish();
        }
      }
      effects.current=effects.current.filter(e=>time-e.time<1700);
      if(c.dataset.aim!==String(angle.current))c.dataset.aim=String(angle.current);
      if(artRef.current)render(context!,artRef.current,game.current,angle.current,time,effects.current,motion.matches,firedAt.current,modeRef.current==='running',WORLD_HEIGHT,mobileRef.current);
      frame=requestAnimationFrame(draw);
    }
    function visibility(){if(document.hidden){pause(true);cancelAnimationFrame(frame);last.current=0;}else{last.current=0;frame=requestAnimationFrame(draw);}}
    function blur(){pause(true);}
    function keyboard(event:KeyboardEvent){if(event.target instanceof HTMLElement&&event.target.closest('button,a,input'))return;if(modeRef.current==='running'){if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();const next=target.current+(event.key==='ArrowLeft'?-.045:.045);if(mobileRef.current)angle.current=target.current=mobileAngle(next);else target.current=aimAngle({x:CANNON.x+Math.cos(next)*100,y:CANNON.y+Math.sin(next)*100});}if((event.code==='Space'||event.key==='Enter')&&!event.repeat){event.preventDefault();shoot();}if(event.key==='Escape'){event.preventDefault();pause();}}}
    frame=requestAnimationFrame(draw);document.addEventListener('visibilitychange',visibility);window.addEventListener('blur',blur);document.addEventListener('keydown',keyboard);
    return()=>{cancelAnimationFrame(frame);observer.disconnect();document.removeEventListener('visibilitychange',visibility);window.removeEventListener('blur',blur);document.removeEventListener('keydown',keyboard);if(flashTimer.current)clearTimeout(flashTimer.current);};
  },[]);
  useEffect(()=>{if(['over','paused'].includes(mode))overlay.current?.focus({preventScroll:true});},[mode]);
  function position(event:React.PointerEvent){
    const r=canvas.current!.getBoundingClientRect();return {x:(event.clientX-r.left)/r.width*WORLD_WIDTH-ARENA_X,y:(event.clientY-r.top)/r.height*(WORLD_HEIGHT)-ARENA_Y};
  }
  function aim(event:React.PointerEvent){
    if(modeRef.current!=='running')return;const p=position(event);if(mobileRef.current){if(active.current&&p.y<game.current.cannonY-10){angle.current=target.current=mobileAngle(aimAngle(p,game.current.cannonY));}if(active.current)event.preventDefault();return;}if(event.pointerType==='mouse'||active.current){target.current=aimAngle(p);}
    if(active.current?.id===event.pointerId){event.preventDefault();if(Math.hypot(event.clientX-active.current.x,event.clientY-active.current.y)>8)active.current.moved=true;}
  }
  function down(event:React.PointerEvent<HTMLElement>){
    if(modeRef.current!=='running'||game.current.flight||game.current.transition||!event.isPrimary||event.button!==0||active.current)return;event.preventDefault();active.current={id:event.pointerId,type:event.pointerType,x:event.clientX,y:event.clientY,moved:false};const point=position(event);if(!mobileRef.current||point.y<game.current.cannonY-10){target.current=aimAngle(point,game.current.cannonY);if(mobileRef.current)angle.current=target.current=mobileAngle(target.current);}event.currentTarget.setPointerCapture(event.pointerId);canvas.current?.focus({preventScroll:true});
  }
  function up(event:React.PointerEvent<HTMLElement>){const gesture=active.current;if(!gesture||gesture.id!==event.pointerId)return;event.preventDefault();const p=position(event),r=event.currentTarget.getBoundingClientRect();const inside=event.clientX>=r.left&&event.clientX<=r.right&&event.clientY>=r.top&&event.clientY<=r.bottom;active.current=null;
    if(mobileRef.current){if(inside&&p.y<game.current.cannonY-10)angle.current=target.current=mobileAngle(aimAngle(p,game.current.cannonY));if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);return;}
    if(inside&&(p.x>=0&&p.x<=960&&p.y>=0&&p.y<game.current.cannonY-10)&&(gesture.type==='mouse'||gesture.moved)){target.current=aimAngle(p,game.current.cannonY);shoot();}else if(gesture.type!=='mouse')announce('Drag to aim, then release. Move outside the aiming area to cancel.');
    if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
  }
  return <main style={{'--world-width':WORLD_WIDTH,'--world-height':WORLD_HEIGHT,'--board-width':WIDTH,'--frame-side':`${(ARENA_X-10)/WORLD_WIDTH*100}%`,'--frame-top':`${(ARENA_Y-23)/WORLD_HEIGHT*100}%`,'--frame-bottom':`${4/WORLD_HEIGHT*100}%`} as React.CSSProperties} className={`blast-shell ${comboFlash?'combo-glow':''} ${stats.reward?'rainbow-glow':''} ${mobile?'mobile-game':''}`}>
    <img className="scene-art" src={scene} width="1672" height="941" alt=""/><div className="ornamental-frame" aria-hidden="true"/>
    <div className="game-world"><div className="mobile-board-frame" aria-hidden="true"/><canvas ref={canvas} width={WORLD_WIDTH} height={WORLD_HEIGHT} className="blast-canvas" tabIndex={0} role="img" aria-label={`Bauble shooter. Current ${stats.current}, next ${stats.next}. ${mobile?'Tap or drag to aim, or use the arrow buttons. Press Fire to shoot.':'Arrow keys aim, Space fires.'}`} data-columns={COLS} data-board-width={WIDTH} data-danger-y={DANGER_Y} data-bombs-earned={stats.bombs} data-transition={stats.transition} data-shots={stats.shots} data-current={stats.current} data-next={stats.next} onPointerDown={e=>down(e)} onPointerMove={e=>aim(e)} onPointerUp={up} onPointerCancel={()=>{active.current=null;}} onLostPointerCapture={()=>{active.current=null;}}/>
    </div><header className="blast-hud"><div className="score-plaque"><Trophy/><div><span>SCORE</span><output data-testid="blast-score">{stats.score.toLocaleString('en-GB')}</output></div><div className="time-plaque"><span>TIME PLAYED:</span><output data-testid="blast-time">{clockText(stats.elapsed)}</output>{stats.rowIn!==null&&<small className={`row-warning ${stats.rowIn<=3?'urgent':stats.rowIn<=8?'approaching':''}`} data-testid="next-row">NEXT ROW: {stats.pendingRows?'QUEUED':`${String(stats.rowIn).padStart(2,'0')}s`}</small>}</div></div><div className="title-plaque"><img src={banner} width="1400" height="350" alt=""/><h1>Bauble Blast</h1></div></header>

    {rushBanner&&mode==='running'&&<div className="survival-banner" role="status"><strong>CHRISTMAS RUSH!</strong><span>EVERY SHOT NOW ADDS A NEW ROW!</span></div>}
    {stats.reward&&mode==='running'&&<div className="rainbow-banner" role="status">RAINBOW BOMB UNLOCKED!</div>}
    {comboFlash&&mode==='running'&&<div className="combo-banner">COMBO ×{Math.min(2,1+(stats.combo-1)*.5)}!</div>}
    {(mode==='start'||mode==='countdown'||mode==='paused'||mode==='over')&&<section className={`blast-overlay mode-${mode}`} aria-label={mode==='start'?'Game introduction':mode==='countdown'?'Get ready':'Game menu'}><div className="festive-panel" ref={overlay} tabIndex={-1}>
      {mode==='start'&&<><p className="mini-stars" aria-hidden="true">✦ ✧ ✦</p><h2>BAUBLE BLAST</h2><p className="intro-subtitle">Match 3 baubles. Clear the board.<br/>Chase the highest score and survive the Christmas rush!</p><p className="timed-rule">After one minute: a new row every two shots. After three minutes: every shot adds a row. Big clears refill sparse boards. Clear {BOMB_THRESHOLD}+ baubles in one shot to earn a Rainbow Bomb.</p><div className="intro-art"><img className="intro-carriage" src={carriage} alt="Festive gold cannon carriage"/><img className="intro-loaded" src={BAUBLE_URLS.red} alt="Red glass snowflake bauble"/></div><div className="bauble-sample" aria-hidden="true">{COLOURS.slice(0,4).map(colour=><img key={colour} src={BAUBLE_URLS[colour]} alt=""/>)}</div><button className="primary" disabled={!art} onClick={start}>{art?'START GAME':'POLISHING THE BAUBLES…'}</button>{error&&<p className="error" role="alert">{error} Refresh to retry.</p>}<p className="mouse-instructions">Aim with your mouse • Click to shoot</p><p className="touch-instructions">Tap or drag the board to aim<br/>Or use ◀ / ▶ • Press FIRE to shoot</p></>}
      {mode==='countdown'&&<div className="countdown" aria-live="polite" key={count}>{count}</div>}
      {mode==='paused'&&<><h2>TAKE A BREATHER</h2><button className="primary" onClick={resume}>RESUME</button><button className="secondary" onClick={start}>START A NEW RUN</button></>}
      {mode==='over'&&result&&<>
        {result.newBest&&<p className="high-score">✦ NEW HIGH SCORE! ✦</p>}
        <h2>GAME OVER!</h2>
        <p className="result-label">YOUR SCORE</p>
        <strong className="final-score" data-testid="blast-result-score">{result.score.toLocaleString('en-GB')}</strong>
        <p className="personal-best">HIGH SCORE: <span data-testid="blast-best">{result.best.toLocaleString('en-GB')}</span></p>
        <p className="time-survived">TIME SURVIVED: <span data-testid="blast-survived">{clockText(result.survived)}</span></p>
        <button className="primary" onClick={start}>PLAY AGAIN</button>
      </>}
      {notice&&(mode==='over')&&<p className="panel-notice" role="status">{notice}</p>}
    </div></section>}
    {mobile&&<MobileControls disabled={mode!=='running'||!!game.current.flight||!!game.current.transition||game.current.rewardSeconds!==null} onRotate={rotateMobile} onFire={shoot}/>}
    <p className="sr-only" role="status" aria-live="polite">{notice} Current {stats.current}. Next {stats.next}.</p>
  </main>;
}
createRoot(document.getElementById('root')!).render(<App/>);
