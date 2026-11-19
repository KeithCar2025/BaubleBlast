import React,{useEffect,useRef,useState} from 'react';
import {AIM_STEP,HOLD_SPEED} from './mobile-controls';

export function MobileControls({disabled,onRotate,onFire}:{disabled:boolean;onRotate:(radians:number)=>void;onFire:()=>boolean}){
  const held=useRef<{id:number;direction:number;started:number;last:number}|null>(null),frame=useRef(0),flashTimer=useRef<ReturnType<typeof setTimeout>|null>(null),rotate=useRef(onRotate),[flash,setFlash]=useState(false);
  rotate.current=onRotate;
  function stop(){held.current=null;cancelAnimationFrame(frame.current);}
  useEffect(()=>{
    function visibility(){if(document.hidden)stop();}
    window.addEventListener('blur',stop);window.addEventListener('resize',stop);document.addEventListener('visibilitychange',visibility);
    return()=>{stop();window.removeEventListener('blur',stop);window.removeEventListener('resize',stop);document.removeEventListener('visibilitychange',visibility);if(flashTimer.current)clearTimeout(flashTimer.current);};
  },[]);
  useEffect(()=>{if(disabled)stop();},[disabled]);
  function begin(event:React.PointerEvent<HTMLButtonElement>,direction:number){
    if(disabled||!event.isPrimary||event.button!==0||held.current)return;event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);
    const now=performance.now();held.current={id:event.pointerId,direction,started:now,last:now};rotate.current(direction*AIM_STEP);
    function hold(time:number){const press=held.current;if(!press)return;const elapsed=Math.max(0,time-Math.max(press.last,press.started+180));press.last=time;if(elapsed)rotate.current(press.direction*HOLD_SPEED*Math.min(elapsed,50)/1000);frame.current=requestAnimationFrame(hold);}
    frame.current=requestAnimationFrame(hold);
  }
  function end(event:React.PointerEvent<HTMLButtonElement>){if(held.current?.id!==event.pointerId)return;event.preventDefault();stop();if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);}
  function fire(){if(disabled||!onFire())return;setFlash(true);if(flashTimer.current)clearTimeout(flashTimer.current);flashTimer.current=setTimeout(()=>setFlash(false),180);}
  return <nav className="mobile-controls" aria-label="Mobile cannon controls">
    <button aria-label="Aim left" disabled={disabled} onPointerDown={e=>begin(e,-1)} onPointerUp={end} onPointerCancel={stop} onLostPointerCapture={stop} onClick={e=>{if(e.detail===0&&!disabled)onRotate(-AIM_STEP);}}>◀</button>
    <button className={`mobile-fire ${flash?'firing':''}`} aria-label="Fire bauble" disabled={disabled} onPointerDown={e=>{if(e.isPrimary&&e.button===0){e.preventDefault();fire();}}} onClick={e=>{if(e.detail===0)fire();}}><span aria-hidden="true">🔥</span> FIRE</button>
    <button aria-label="Aim right" disabled={disabled} onPointerDown={e=>begin(e,1)} onPointerUp={end} onPointerCancel={stop} onLostPointerCapture={stop} onClick={e=>{if(e.detail===0&&!disabled)onRotate(AIM_STEP);}}>▶</button>
  </nav>;
}
