'use strict';
(() => {
  const chapter=document.getElementById('study-chapter');
  const viewport=chapter.querySelector('.study-viewport');
  const cloudLayer=chapter.querySelector('.study-clouds');
  // Static scenery: scrolling moves the whole page, never the camera or clouds.
  const clouds=[[-12,8,44,.72],[63,-8,48,.83],[30,47,26,.68],[-7,70,35,.9],[75,69,39,.88],[43,91,24,.62]];
  clouds.forEach(([x,y,size,opacity])=>{
    const image=new Image();image.src='assets/cloud.webp';image.alt='';
    image.style.cssText=`--cloud-x:${x}%;--cloud-y:${y}%;--cloud-size:${size}%;--cloud-opacity:${opacity}`;
    cloudLayer.append(image);
  });
  function fit() {
    const scale=Math.min(viewport.clientWidth/1440,viewport.clientHeight/1320);
    viewport.style.setProperty('--study-fit',scale);
    viewport.style.setProperty('--study-float',`${5/Math.max(scale,.01)}px`);
    viewport.style.setProperty('--study-perspective',Math.max(400,1600*scale)+'px');
  }
  document.addEventListener('study-select',()=>{
    window.scrollTo({top:chapter.getBoundingClientRect().top+window.scrollY,behavior:'instant'});
  });
  new ResizeObserver(fit).observe(viewport);
  let visible=false;
  const syncMotion=()=>viewport.classList.toggle('motion-visible',visible && !document.hidden);
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;syncMotion();}).observe(viewport);
  document.addEventListener('visibilitychange',syncMotion);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const interactive=chapter.querySelectorAll('.pencil,.pen,.pen-lower,.compass');
  const resets=[];
  interactive.forEach(button=>{
    const image=button.querySelector('img');
    const compass=button.classList.contains('compass');
    let animation=null, hovered=false, focused=false;
    const allowed=()=>!reduced.matches && !document.hidden && !document.body.classList.contains('editing');
    function reset() { animation?.cancel();animation=null;hovered=false;focused=false; }
    resets.push(reset);
    function start() {
      if(!allowed() || animation?.playState==='running') return;
      animation?.cancel();
      if(compass) {
        // A single turn returns to the same pose, even if the pointer leaves early.
        animation=image.animate([{transform:'rotate(0deg)'},{transform:'rotate(360deg)'}],{
          duration:2400,easing:'cubic-bezier(.45,0,.25,1)'
        });
      } else {
        // Short strokes, a small lift, and a return; no ink is added to the art.
        const strokes=[[0,0,0],[3,1,-2],[0,4,1],[5,2,-1],[3,6,2],[9,4,-2],[7,8,1],[12,5,-1],[9,2,0],[0,0,0]];
        animation=image.animate(strokes.map(([x,y,angle])=>({
          transform:`translate(${x}px,${y}px) rotate(${angle}deg)`
        })),{duration:2600,iterations:Infinity,easing:'ease-in-out'});
      }
    }
    function settle() {
      if(hovered || focused || compass || !animation) return;
      const current=getComputedStyle(image).transform;
      animation.cancel();
      animation=image.animate([{transform:current},{transform:'none'}],{duration:450,easing:'ease-out'});
    }
    button.addEventListener('pointerenter',event=>{if(event.pointerType==='touch')return;hovered=true;start();});
    button.addEventListener('pointerleave',()=>{hovered=false;settle();});
    button.addEventListener('focus',()=>{focused=button.matches(':focus-visible');if(focused)start();});
    button.addEventListener('blur',()=>{focused=false;settle();});
  });
  const resetInteractions=()=>resets.forEach(reset=>reset());
  reduced.addEventListener('change',resetInteractions);
  document.addEventListener('layout-editor-toggle',resetInteractions);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)resetInteractions();});
  new MutationObserver(()=>{if(document.body.classList.contains('viewing'))resetInteractions();}).observe(document.body,{attributes:true,attributeFilter:['class']});
  fit();
})();
