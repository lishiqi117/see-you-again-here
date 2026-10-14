import {gsap} from 'gsap';
// No per-frame React updates. Delta-time normalization preserves inertia at 60/120 Hz.
export default function MouseParallax(root,cfg){
 let targetX=0,targetY=0,currentX=0,currentY=0,last=performance.now(),frame=0;
 const layers=[...root.querySelectorAll('[data-depth]')].map(el=>({el,depth:cfg[el.dataset.depth]||0,x:gsap.quickSetter(el,'x','px'),y:gsap.quickSetter(el,'y','px')}));
 const move=e=>{targetX=(e.clientX/innerWidth-.5)*2;targetY=(e.clientY/innerHeight-.5)*2;};
 const reset=()=>{targetX=targetY=0;};
 function tick(now){const dt=Math.min(50,now-last);last=now;const a=1-Math.pow(1-cfg.lerp,dt/(1000/60));currentX+=(targetX-currentX)*a;currentY+=(targetY-currentY)*a;layers.forEach(l=>{l.x(currentX*l.depth);l.y(currentY*l.depth);});frame=requestAnimationFrame(tick);}
 const visibility=()=>{cancelAnimationFrame(frame);if(!document.hidden){last=performance.now();frame=requestAnimationFrame(tick);}};
 window.addEventListener('pointermove',move,{passive:true});document.documentElement.addEventListener('pointerleave',reset);window.addEventListener('blur',reset);document.addEventListener('visibilitychange',visibility);visibility();
 return ()=>{cancelAnimationFrame(frame);window.removeEventListener('pointermove',move);document.documentElement.removeEventListener('pointerleave',reset);window.removeEventListener('blur',reset);document.removeEventListener('visibilitychange',visibility);layers.forEach(l=>{l.x(0);l.y(0);});};
}
