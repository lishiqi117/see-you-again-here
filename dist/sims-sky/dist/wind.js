'use strict';
(() => {
  const scene = document.querySelector('.scene');
  const svg = scene.querySelector('svg.rope');
  const path = document.getElementById('wind-rope-path');
  const ropeHit = scene.querySelector('.rope-hit');
  // The visible strokes remain decorative; expose only the interactive stroke.
  svg.removeAttribute('aria-hidden');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  // Normalized contact points in the UNCHANGED, complete source images.
  // Values account for each peg's actual position, not the image center.
  const settings = {
    scarf: [.54,.09,1.5,7.7,.2], keys: [.66,.14,2.2,6.3,1.5],
    'photo-green': [.59,.115,1.35,9.2,2.7],
    'photo-stars': [.55,.12,1.7,8.4,4.1], badge: [.46,.20,2.0,7.1,3.2],
    umbrella: [.44,.055,1.05,10.8,5.3], earphones: [.55,.37,1.2,9.8,1.9]
  };
  let items = [], width = 0, height = 0, fit = 1;
  let time = 0, previous = 0, frame = 0;
  let gustStart = null;
  let handoffReleasedAt = 0;
  const gustDuration = 5000;
  const smooth = value => { const t=Math.max(0,Math.min(1,value)); return t*t*(3-2*t); };
  function gustStrength() {
    if(gustStart === null) return 0;
    const elapsed=performance.now()-gustStart;
    if(elapsed >= gustDuration) { gustStart=null; return 0; }
    return smooth(elapsed/450)*smooth((gustDuration-elapsed)/1400);
  }
  function blow() {
    if(!active() || document.body.classList.contains('viewing') || gustStart !== null) return;
    gustStart=performance.now();
  }
  ropeHit.addEventListener('click',blow);
  ropeHit.addEventListener('keydown',event=>{
    if(event.key==='Enter' || event.key===' ') { event.preventDefault(); if(!event.repeat) blow(); }
  });
  const editing = () => document.body.classList.contains('editing');
  let inView=true;
  const active = () => inView && !reduced.matches && !editing() && !document.hidden && !window.__skyHandoffHolding;
  const format = n => n.toFixed(3);

  // Interpolating cubic spline passes through every named hanging point exactly.
  // Thus the path and the PNG contact use the same coordinates each frame.
  function spline(points) {
    let d = `M ${format(points[0].x)} ${format(points[0].y)}`;
    for(let i=0;i<points.length-1;i++) {
      const p0=points[Math.max(0,i-1)], p1=points[i], p2=points[i+1], p3=points[Math.min(points.length-1,i+2)];
      const span=p2.x-p1.x;
      const slope1=(p2.y-p0.y)/Math.max(1,p2.x-p0.x);
      const slope2=(p3.y-p1.y)/Math.max(1,p3.x-p1.x);
      d+=` C ${format(p1.x+span/3)} ${format(p1.y+slope1*span/3)} ${format(p2.x-span/3)} ${format(p2.y-slope2*span/3)} ${format(p2.x)} ${format(p2.y)}`;
    }
    return d;
  }
  function render(moving) {
    if(!items.length) return;
    const entryGain=window.__skyHandoffHolding===undefined?1:smooth((performance.now()-handoffReleasedAt)/600);
    const gust=moving ? gustStrength() : 0;
    const gustTime=gustStart === null ? 0 : (performance.now()-gustStart)/1000;
    const points=items.map(item=>{
      const u=Math.max(0,Math.min(1,item.x/width));
      const envelope=Math.sin(Math.PI*u);
      const dx=moving ? fit*envelope*(.6*Math.sin(time*.52+u*2.1)+gust*(10+3*Math.sin(gustTime*7-u*3))) : 0;
      const dy=moving ? fit*envelope*(2.1*Math.sin(time*.61+u*2.4)-gust*(14+4*Math.sin(gustTime*8-u*4))) : 0;
      // A shared rightward gust with different weights and flutter for each object.
      const angle=moving ? item.amplitude*Math.sin((time-item.delay)*Math.PI*2/item.period)
        -gust*(30+item.amplitude*9+(5+item.amplitude*2)*Math.sin(gustTime*9-item.delay)) : 0;
      item.element.style.setProperty('--wind-x',dx*entryGain+'px');
      item.element.style.setProperty('--wind-y',dy*entryGain+'px');
      item.element.style.setProperty('--sway',angle*entryGain+'deg');
      const point={x:item.x+dx*entryGain,y:item.y+dy*entryGain};
      // Exposed DOM attributes are useful for diagnosing anchor drift.
      item.element.dataset.hangX=point.x;
      item.element.dataset.hangY=point.y;
      return point;
    }).sort((a,b)=>a.x-b.x);
    const first=points[0], last=points[points.length-1];
    const left={x:-40,y:Math.max(12*fit,first.y-first.x*.32*height/1086)};
    const right={x:width+40,y:Math.max(12*fit,last.y-(width-last.x)*.28*height/1086)};
    path.setAttribute('d',spline([left,...points,right]));
  }
  function tick(now) {
    frame=0;
    if(!active()) {
      if(reduced.matches || editing() || window.__skyHandoffHolding) render(false);
      previous=0;
      return;
    }
    if(previous) time+=Math.min((now-previous)/1000,.05);
    previous=now;render(true);frame=requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(frame); frame=0;previous=0;
    if(reduced.matches || editing() || document.hidden) gustStart=null;
    render(!reduced.matches && !editing() && !window.__skyHandoffHolding);
    if(active()) frame=requestAnimationFrame(tick);
  }
  function measure() {
    const bounds=scene.getBoundingClientRect();
    width=window.__skyHandoffHolding!==undefined?scene.clientWidth:bounds.width; height=window.__skyHandoffHolding!==undefined?scene.clientHeight:bounds.height;
    if(!width || !height) return;
    fit=Math.min(width/1448,height/1086);
    svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
    svg.style.setProperty('--rope-width',Math.max(5,18*fit)+'px');
    items=Object.entries(settings).map(([id,s])=>{
      const element=scene.querySelector('.'+id), image=element.querySelector('img');
      const w=parseFloat(element.style.width)/100*width, h=parseFloat(element.style.height)/100*height;
      const ratio=image.naturalWidth&&image.naturalHeight ? image.naturalWidth/image.naturalHeight : w/h;
      const drawWidth=Math.min(w,h*ratio), drawHeight=drawWidth/ratio;
      const px=(w-drawWidth)/2+drawWidth*s[0], py=(h-drawHeight)/2+drawHeight*s[1];
      element.style.setProperty('--pivot-x',px+'px');
      element.style.setProperty('--pivot-y',py+'px');
      return {element,x:parseFloat(element.style.left)/100*width+px,y:parseFloat(element.style.top)/100*height+py,amplitude:s[2],period:s[3],delay:s[4]};
    });
    sync();
  }
  scene.addEventListener('scene-layout-change',measure);
  scene.querySelectorAll('.object img').forEach(img=>img.addEventListener('load',measure));
  new ResizeObserver(measure).observe(scene);
  new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;sync();}).observe(scene);
  new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['class']});
  reduced.addEventListener('change',sync);
  document.addEventListener('visibilitychange',sync);
  document.addEventListener('sky-handoff-change',()=>{if(!window.__skyHandoffHolding)handoffReleasedAt=performance.now();sync();});
  measure();
})();
