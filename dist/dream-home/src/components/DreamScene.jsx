import React,{useEffect,useRef,useState} from 'react';
import {gsap} from 'gsap';
import {Definitions,Layer,Svg,CleanArt,Original,cfg} from './Artwork';
import {STARS,PLANETS,SPECKS,W,H,CLOUD_REGIONS} from '../artwork';
import CloudLayer from './CloudLayer';
import FloatingCat from './FloatingCat';
import Star from './Star';
import Planet,{Sun} from './Planet';
import GrainOverlay from './GrainOverlay';
import MouseParallax from './MouseParallax';

function Starfield(){return <Layer name="starfield" depth="far">{SPECKS.slice(0,cfg.starfield.count).map(([x,y],i)=><div className="object speck" key={i} style={{left:x-5,top:y-5,width:10,height:10}}><Svg viewBox={`${x-5} ${y-5} 10 10`}><defs><clipPath id={`speck-${i}`}><circle cx={x} cy={y} r="3"/></clipPath></defs><Original clipPath={`url(#speck-${i})`}/></Svg></div>)}</Layer>;}
function setupMotion(root){
 const mm=gsap.matchMedia();
 mm.add({reduce:'(prefers-reduced-motion: reduce)',normal:'(prefers-reduced-motion: no-preference)'},context=>{
  const reduced=context.conditions.reduce||cfg.intensity===0;
  root.dataset.motion=reduced?'reduced':'full';
  const tweens=[];let furFrame=0;let stopMouse=()=>{};
  const A=cfg.intensity;
  const loop=(el,from,to,duration,phase=0)=>{const t=gsap.fromTo(el,from,{...to,duration:duration/2,repeat:-1,yoyo:true,ease:'sine.inOut'});t.totalTime(duration*phase);tweens.push(t);return t;};
  const q=s=>root.querySelector(s);
  if(!reduced){
   loop(q('.camera'),{scale:1},{scale:1+(cfg.camera.scale-1)*A},cfg.camera.duration);
   Object.entries(cfg.clouds).forEach(([kind,c])=>loop(q(`[data-motion="cloud-${kind}"]`),{x:-c.x*A/2,y:-c.y*A/2,scale:1},{x:c.x*A/2,y:c.y*A/2,scale:1+(c.scale-1)*A},c.duration,c.phase));
   const c=cfg.cat;
   loop(q('.cat'),{x:-c.x*A,y:c.yMin*A,rotation:-c.rotation*A},{x:c.x*A,y:c.yMax*A,rotation:c.rotation*A},c.duration,0.27);
   if(q('.tail'))loop(q('.tail'),{rotation:c.tail.rotationMin*A,svgOrigin:'607 571'},{rotation:c.tail.rotationMax*A,svgOrigin:'607 571'},c.tail.duration,0.1);
   root.querySelectorAll('.star').forEach((el,i)=>{const s=cfg.stars[el.dataset.star],seed=((i*47+13)%101)/101;const duration=s.durationMin+(s.durationMax-s.durationMin)*seed;loop(el,{scale:1+(s.scaleMin-1)*A,opacity:1-(1-cfg.stars.opacityMin)*A},{scale:1+(s.scaleMax-1)*A,opacity:cfg.stars.opacityMax},duration,(seed*cfg.stars.delayMax/duration)%1);});
   loop(q('.sun'),{scale:1},{scale:1+(cfg.sun.scale-1)*A},cfg.sun.duration,0.14);
   loop(q('.sun-glow'),{opacity:cfg.sun.glowOpacityMin,filter:`blur(${cfg.sun.glowBlurMin}px)`},{opacity:cfg.sun.glowOpacityMax,filter:`blur(${cfg.sun.glowBlurMax}px)`},cfg.sun.duration,0.14);
   root.querySelectorAll('.planet').forEach((el,i)=>loop(el,{x:-cfg.planets.x*A,y:-cfg.planets.y*A,rotation:-cfg.planets.rotation*A},{x:cfg.planets.x*A,y:cfg.planets.y*A,rotation:cfg.planets.rotation*A},cfg.planets.durations[i],i*.21));
   if(cfg.parallax.enabled)stopMouse=MouseParallax(root,{...cfg.parallax,far:cfg.parallax.far*A,middle:cfg.parallax.middle*A,cat:cfg.parallax.cat*A,near:cfg.parallax.near*A});
  }
  const s=cfg.starfield;
  if(A>0)root.querySelectorAll('.speck').forEach((el,i)=>loop(el,{opacity:reduced?s.reducedOpacityMin:s.opacityMin,scale:reduced?1:.7},{opacity:reduced?s.reducedOpacityMax:s.opacityMax,scale:1},reduced?6:s.durationMin+(s.durationMax-s.durationMin)*((i*31%79)/79),i*.137));
  const turbulence=root.querySelector('feTurbulence'),fur=cfg.cat.fur;
  let windTime=0,last=performance.now(),lastPaint=0;
  const wind=now=>{const dt=Math.min(50,now-last);last=now;windTime+=dt/1000;
   if(now-lastPaint>=1000/fur.fps){const f=fur.frequencyMin+(fur.frequencyMax-fur.frequencyMin)*(.5-.5*Math.cos(windTime/ fur.duration*Math.PI*2));turbulence.setAttribute('baseFrequency',f.toFixed(5));lastPaint=now;}furFrame=requestAnimationFrame(wind);};
  const visibility=()=>{tweens.forEach(t=>document.hidden?t.pause():t.resume());cancelAnimationFrame(furFrame);if(!document.hidden&&!reduced&&fur.enabled&&turbulence){last=performance.now();furFrame=requestAnimationFrame(wind);}};
  document.addEventListener('visibilitychange',visibility);visibility();
  return ()=>{stopMouse();cancelAnimationFrame(furFrame);document.removeEventListener('visibilitychange',visibility);};
 },root);
 return ()=>mm.revert();
}
export default function DreamScene(){
 const root=useRef(null),fit=useRef(null);const [ready,setReady]=useState(false);
 useEffect(()=>{let active=true;Promise.all([cfg.assets.reference,cfg.assets.cleanPlate,cfg.assets.cat].filter(Boolean).map(src=>new Promise((resolve,reject)=>{const i=new Image();i.onload=resolve;i.onerror=reject;i.src=src;}))).then(()=>{if(active)setReady(true);}).catch(error=>console.error('Dream scene asset could not load; original artwork retained.',error));return()=>{active=false;};},[]);
 useEffect(()=>{
  const resize=()=>{const w=root.current.clientWidth,h=root.current.clientHeight,s=Math.max(w/W,h/H);const f=w/h<1?cfg.responsive.portraitFocalX:cfg.responsive.focalX;
   let x=(w-W*s)*f,y=(h-H*s)*cfg.responsive.focalY;
   // Keep the original cat's entire bounding box visible; never scale or relocate it independently.
   const margin=cfg.responsive.catSafeMargin;
   const minX=margin-520*s,maxX=w-margin-810*s;
   if(minX<=maxX)x=Math.max(minX,Math.min(maxX,x));
   const minY=margin-440*s,maxY=h-margin-755*s;
   if(minY<=maxY)y=Math.max(minY,Math.min(maxY,y));
   fit.current.style.transform=`translate3d(${x}px,${y}px,0) scale(${s})`;
  };resize();const observer=new ResizeObserver(resize);observer.observe(root.current);return()=>observer.disconnect();
 },[]);
 useEffect(()=>{if(!ready)return;return setupMotion(root.current);},[ready]);
 return <main ref={root} className={`dream-scene${ready?' ready':''}`} role="img" aria-label="手绘蓝色与奶黄色云层围绕星空，一只白色猫猫缓缓漂浮，太阳和星星轻轻呼吸。">
  <img className="fallback" src={cfg.assets.reference} alt=""/>
  <Definitions/>
  <div ref={fit} className="scene-fit"><div className="camera">
   <div className="layer"><Svg><image href={cfg.assets.cleanPlate} width="1672" height="941" filter="url(#seam-underpaint)"/></Svg></div>
   <Layer name="space" depth="far"><Svg><defs><mask id="space-portal" maskUnits="userSpaceOnUse" x="0" y="0" width="1672" height="941"><path d={CLOUD_REGIONS.far} fill="white" stroke="white" strokeWidth="20" filter="url(#portal-soft)"/></mask></defs><g mask="url(#space-portal)"><CleanArt/></g></Svg></Layer>
   <Starfield/>
   <Layer name="planets" depth="far"><Sun/>{PLANETS.map((p,i)=><Planet key={p.id} planet={p} index={i}/>)}</Layer>
   <CloudLayer kind="far"/><CloudLayer kind="middle"/><CloudLayer kind="near"/>
   <Layer name="stars" depth="middle">{STARS.filter(s=>s.size!=='large').map(s=><Star key={s.id} star={s}/>)}</Layer>
   <FloatingCat/>
   <CloudLayer kind="foreground"/>
   <Layer name="foreground-stars" depth="near">{STARS.filter(s=>s.size==='large').map(s=><Star key={s.id} star={s}/>)}</Layer>
  </div></div><GrainOverlay/>
 </main>;
}
