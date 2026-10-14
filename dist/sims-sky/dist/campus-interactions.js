'use strict';
(() => {
  const chapter=document.getElementById('campus-chapter');
  const bag=chapter.querySelector('.campus-backpack');
  const computer=chapter.querySelector('.campus-computer');
  const shade=computer.querySelector('.crt-power');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let boot=null,frame=0,pointer=null;
  const available=()=>!document.hidden&&!document.body.matches('.editing,.viewing');
  const update=()=>{
    frame=0;
    if(!pointer||!available()){computer.classList.remove('is-near');return;}
    const r=computer.getBoundingClientRect(),margin=45;
    computer.classList.toggle('is-near',pointer.x>=r.left-margin&&pointer.x<=r.right+margin&&pointer.y>=r.top-margin&&pointer.y<=r.bottom+margin);
  };
  document.addEventListener('pointermove',e=>{
    if(e.pointerType==='touch')return;
    pointer={x:e.clientX,y:e.clientY};if(!frame)frame=requestAnimationFrame(update);
  },{passive:true});
  document.documentElement.addEventListener('pointerleave',()=>{pointer=null;update();});
  window.addEventListener('scroll',()=>{if(!frame)frame=requestAnimationFrame(update);},{passive:true});
  const size=()=>{
    const fit=parseFloat(getComputedStyle(bag).getPropertyValue('--campus-fit'))||1;
    bag.style.setProperty('--bag-lift',`${6/fit}px`);
  };
  new ResizeObserver(size).observe(bag);size();
  const decorations=[...chapter.querySelectorAll('.campus-object')].filter(e=>e.className.includes('campus-gem-'));
  const viewport=chapter.querySelector('.campus-viewport');
  let visible=false,windFrame=0,windTime=0,lastWind=0,gustStart=null;
  let fallBottom=1100,flights=[];
  const smooth=value=>{const t=Math.max(0,Math.min(1,value));return t*t*(3-2*t);};
  const moving=()=>visible&&available()&&!reduced.matches;
  const fitWind=()=>{
    fallBottom=Math.max(1100,...[...chapter.querySelectorAll('.campus-object')].filter(e=>!decorations.includes(e)).map(e=>e.offsetTop+e.offsetHeight+80));
    flights=decorations.map((element,i)=>({y:element.offsetTop,drift:0,turn:0,cycle:0}));
    decorations.forEach(element=>{
      element.parentElement.classList.add('petal-flight-plane');
      element.parentElement.style.setProperty('--flight-bottom',(1000-fallBottom)+'px');
    });
  };
  new ResizeObserver(fitWind).observe(viewport);
  document.querySelector('.scene').addEventListener('scene-layout-change',fitWind);fitWind();
  function renderWind(now) {
    windFrame=0;
    if(!moving())return;
    const dt=lastWind?Math.min((now-lastWind)/1000,.05):0;
    windTime+=dt;
    lastWind=now;
    const age=gustStart===null?0:(now-gustStart)/1000;
    if(age>=5)gustStart=null;
    const gust=gustStart===null?0:smooth(age/.55)*smooth((5-age)/1.4);
    chapter.dataset.petalWind=gustStart===null?'breeze':'gust';
    decorations.forEach((element,i)=>{
      const state=flights[i],height=element.offsetHeight;
      const speed=(fallBottom+140)/(19+i*1.3);
      // Integrate velocity so gusts accelerate the same flight, never snap back.
      state.y+=dt*speed*(1+.12*Math.sin(windTime*.8+i)+gust*2.8);
      state.drift+=dt*(speed*.25+gust*(100+i*7));
      state.turn+=dt*((i%2?1:-1)*(5+i*.6)*(1+gust*2));
      if(state.y>fallBottom+height+30) {
        state.y=-140-height-30;state.drift=-55+(state.cycle%3)*20;
        state.cycle++;element.dataset.fallCycles=state.cycle;
      }
      const x=state.drift+12*Math.sin(windTime*.75+i*1.27);
      const y=state.y-element.offsetTop;
      const angle=state.turn+5*Math.sin(windTime*.6+i);
      element.style.transform='translate3d('+x+'px,'+y+'px,0) rotate('+angle+'deg)';
    });
    windFrame=requestAnimationFrame(renderWind);
  }
  function syncWind() {
    cancelAnimationFrame(windFrame);windFrame=0;lastWind=0;
    if(moving())windFrame=requestAnimationFrame(renderWind);
    else {
      gustStart=null;chapter.dataset.petalWind='breeze';
      decorations.forEach(element=>element.style.removeProperty('transform'));
    }
  }
  decorations.forEach(element=>{
    element.classList.add('gentle-decoration');
    element.addEventListener('click',()=>{
      if(!moving()||gustStart!==null)return;
      gustStart=performance.now();
    });
  });
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;syncWind();}).observe(viewport);
  document.addEventListener('visibilitychange',syncWind);
  reduced.addEventListener('change',syncWind);
  new MutationObserver(syncWind).observe(document.body,{attributes:true,attributeFilter:['class']});
  computer.addEventListener('click',()=>{
    if(!available()||boot?.playState==='running')return;
    if(reduced.matches)return;
    boot=shade.animate([
      {opacity:0,offset:0},{opacity:1,offset:.09},
      {opacity:1,offset:.32},{opacity:.65,offset:.5},
      {opacity:.08,offset:.83},{opacity:0,offset:1}
    ],{duration:1800,easing:'ease-in-out'});
  });
  const reset=()=>{boot?.cancel();boot=null;pointer=null;computer.classList.remove('is-near');};
  document.addEventListener('layout-editor-toggle',reset);
  reduced.addEventListener('change',reset);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});
  new MutationObserver(()=>{if(!available())reset();}).observe(document.body,{attributes:true,attributeFilter:['class']});
  new IntersectionObserver(entries=>{
    computer.classList.toggle('crt-visible',entries[0].isIntersecting);
  }).observe(computer);
})();
