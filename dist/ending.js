(() => {
 'use strict';
 const section=document.querySelector('#see-again');
 if(!section||!window.gsap||!window.ScrollTrigger)return;
 const field=section.querySelector('.ending-field');
 const photos=['01-gate','02-friends','03-classroom','04-school','05-street','06-shadows','07-corridor','08-cat'];
 const labels=['S — The gate','E — School friends','E — The classroom','A — The school gate','G — The street','A — Sunlit shadows','I — The corridor','N — The cat'];
 const ratios=[.66,.63,.63,.78,.8,.78,.32,.81];
 const scattered=[[.15,.25,-24],[.42,.20,18],[.72,.25,-13],[.86,.56,23],[.17,.72,14],[.44,.67,-20],[.64,.48,15],[.77,.78,-17]];
 const progress={value:0};
 let reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 let layout=[];
 let editing=false, editMode='scatter', selected=-1, drag=null;
 const storageKey='memory-ending-layout-sunlit-v3';
 const canvasScreens=3;
 function canvasPan(){
  const h=field.clientHeight,padding=parseFloat(getComputedStyle(section).paddingTop)||0;
  const travel=Math.max(1,section.offsetHeight-padding-h);
  return gsap.utils.clamp(0,1,(-section.getBoundingClientRect().top-padding)/travel)*(canvasScreens-1)*h;
 }
 let saved={desktop:{scatter:{},assembled:{}},mobile:{scatter:{},assembled:{}}};
 try {
  const current=localStorage.getItem(storageKey);
  const previous=localStorage.getItem('memory-ending-layout-v2');
  const data=JSON.parse(current||previous||localStorage.getItem('memory-ending-layout-v1'));
  for(const size of ['desktop','mobile'])for(const mode of ['scatter','assembled'])for(let i=0;i<8;i++){
   const p=data?.[size]?.[mode]?.[i];
   if(!current&&mode==='assembled')continue;
   if(Array.isArray(p)&&p.length===2&&p.every(n=>Number.isFinite(n)&&n>=0&&n<=1))saved[size][mode][i]=[p[0],!current&&!previous&&mode==='scatter'?p[1]/canvasScreens:p[1]];
  }
 }catch{}
 const shade=document.createElement('div');shade.className='ending-sunlight';shade.setAttribute('aria-hidden','true');document.body.append(shade);
 const backdrop=new Image();backdrop.src='./assets/ending/sunlit-steps.png';backdrop.alt='';shade.append(backdrop);
 // A shared playhead guarantees that the scene appears only after landing.
 function revealSunlight(assembly){
  const p=gsap.utils.clamp(0,1,(assembly-.80)/.20);
  const opacity=p*p*(3-2*p);
  shade.style.opacity=String(opacity);
  field.style.setProperty('--sunlight',String(opacity));
 }
 const letters=photos.map((photo,i)=>{
  const button=document.createElement('button');button.className='ending-letter';button.type='button';
  button.setAttribute('aria-label',labels[i]);
  button.style.setProperty('--letter-mask',`url("${window.ENDING_MASKS?.[i]||`./assets/ending/mask-${i}.png`}")`);
  button.style.setProperty('--letter-photo',`url("./assets/ending/${photo}.png")`);
  button.innerHTML='<span class="letter-body" aria-hidden="true">'+ Array.from({length:9},(_,n)=>`<span class="letter-depth" style="--depth:${9-n}"></span>`).join('')+'<span class="letter-face"></span></span><span class="letter-sun-shadow" aria-hidden="true"></span><span class="letter-contact-shadow" aria-hidden="true"></span>';
  field.append(button);
  const body=button.firstElementChild;
  function lift(event){
   if(reduced||editing)return;
   const r=button.getBoundingClientRect();
   const x=event?.clientX==null?0:gsap.utils.clamp(-1,1,(event.clientX-r.left)/r.width*2-1);
   const y=event?.clientY==null?0:gsap.utils.clamp(-1,1,(event.clientY-r.top)/r.height*2-1);
   gsap.to(body,{z:22,y:-5,rotationX:-y*4,rotationY:x*5,duration:.65,ease:'power2.out',overwrite:true});
  }
  function rest(){gsap.to(body,{z:0,y:0,rotationX:0,rotationY:0,duration:.8,ease:'power2.out',overwrite:true});}
  button.addEventListener('pointerenter',lift);button.addEventListener('pointermove',lift);
  button.addEventListener('pointerleave',rest);button.addEventListener('focus',()=>{if(editing)selectLetter(i);else lift();});button.addEventListener('blur',rest);
  button.addEventListener('click',()=>{if(matchMedia('(hover: none)').matches){lift();setTimeout(rest,1100);}});
  button.addEventListener('pointerdown',event=>{
   if(!editing||event.button!==0)return;
   event.preventDefault();selectLetter(i);button.focus({preventScroll:true});
   drag={id:event.pointerId,index:i,x:event.clientX,y:event.clientY,clientY:event.clientY,clientX:event.clientX,pan:canvasPan(),startX:Number(gsap.getProperty(button,'x')),startY:Number(gsap.getProperty(button,'y'))+(editMode==='scatter'?canvasPan():0)};
   button.setPointerCapture(event.pointerId);
  });
  button.addEventListener('pointermove',event=>{
   if(!drag||drag.index!==i||drag.id!==event.pointerId)return;
   drag.clientX=event.clientX;drag.clientY=event.clientY;
   moveLetter(i,drag.startX+event.clientX-drag.x,drag.startY+event.clientY-drag.y+(editMode==='scatter'?canvasPan()-drag.pan:0));
  });
  const release=()=>{drag=null;};
  button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);
  return button;
 });
 function measure(){
  const w=field.clientWidth,h=field.clientHeight,mobile=w<680;
  const canvasH=h*canvasScreens;
  // Use the same cover transform as the photograph, so feet stay on the
  // marked stone ledge at every aspect ratio (source baseline ~65.3%).
  const cover=Math.max(w/1672,h/941),imageX=(w-1672*cover)/2,imageY=(h-941*cover)/2;
  const left=Math.max(w*.055,imageX+1672*.10*cover),right=Math.min(w*.94,imageX+1672*.86*cover);
  const baseline=imageY+941*.653*cover;
  const letterH=Math.min((right-left)/6.28,h*.235,195);
  const gap=letterH*.085,wordGap=letterH*.36;
  const positions=[];
  {
   const total=ratios.reduce((s,r)=>s+r*letterH,0)+gap*6+wordGap;
   let x=(left+right-total)/2;for(let i=0;i<8;i++){positions[i]={x,y:baseline-letterH};x+=ratios[i]*letterH+(i===2?wordGap:gap);}
  }
  layout=letters.map((el,i)=>{
   const width=ratios[i]*letterH;
   gsap.set(el,{width,height:letterH});
   // Keep rotated corners and the small hover lift inside the viewport.
   const margin=Math.hypot(width,letterH)/2+28;
   const cx=gsap.utils.clamp(margin,w-margin,scattered[i][0]*w);
   const cy=gsap.utils.clamp(margin,canvasH-margin,scattered[i][1]*canvasH);
   const store=saved[mobile?'mobile':'desktop'];
   const a=store.scatter[i],b=store.assembled[i];
   const sx=a?gsap.utils.clamp(margin,w-margin,a[0]*w)-width/2:cx-width/2;
   const sy=a?gsap.utils.clamp(margin,canvasH-margin,a[1]*canvasH)-letterH/2:cy-letterH/2;
   const ex=b?gsap.utils.clamp(28,w-width-28,b[0]*w-width/2):positions[i].x;
   const ey=b?gsap.utils.clamp(28,h-letterH-28,b[1]*h-letterH/2):positions[i].y;
   return {x:sx,y:sy,endX:ex,endY:ey,rotation:scattered[i][2]};
  });render();
 }
 function render(){
  const pan=canvasPan();
  const assembly=ScrollTrigger.getById('see-again-assembly')?.animation?.progress()??progress.value;
  revealSunlight(editing?(editMode==='assembled'?1:0):assembly);
  layout.forEach((item,i)=>{
   const raw=editing?(editMode==='assembled'?1:0):reduced?1:gsap.utils.clamp(0,1,(assembly-i*.012)/.636);
   const p=raw*raw*(3-2*raw);
   letters[i].style.setProperty('--landed',String(p));
   gsap.set(letters[i],{x:item.x+(item.endX-item.x)*p,y:(item.y-pan)*(1-p)+item.endY*p,rotation:item.rotation*(1-p)});
  });
 }
 gsap.registerPlugin(ScrollTrigger);
 ScrollTrigger.create({trigger:section,start:'top bottom',end:'bottom top',onUpdate:()=>{render();if(editing)updateCanvasControl();}});
 const mm=gsap.matchMedia();
 mm.add({normal:'(prefers-reduced-motion: no-preference)',reduce:'(prefers-reduced-motion: reduce)'},context=>{
  reduced=context.conditions.reduce;
  // Leave a longer street-to-letter passage, then hold the scattered layout
  // briefly before assembly begins. All letters settle by 72%; the scene
  // appears during the last 20%, while letter positions remain fixed.
  gsap.to(progress,{value:1,ease:'none',onUpdate:render,scrollTrigger:{id:'see-again-assembly',trigger:section,start:'top -90%',end:'bottom bottom',scrub:reduced?true:1.25,invalidateOnRefresh:true}});
  render();
 });
 const resize=new ResizeObserver(measure);resize.observe(field);measure();
 ScrollTrigger.addEventListener('refresh',()=>{render();});
 const panel=document.createElement('aside');panel.className='ending-editor';panel.hidden=true;panel.setAttribute('aria-label','字母位置编辑器');
 panel.innerHTML='<header><strong>字母位置编辑器 · W</strong><button data-close aria-label="关闭编辑器">×</button></header><div class="editor-actions"><button data-mode="scatter">散落位置</button><button data-mode="assembled">归位位置</button></div><p>拖动字母调整位置。选中后可用方向键微调，Shift 加速。</p><div class="editor-actions"><button data-save>保存位置</button><button data-reset>重置当前布局</button></div><output aria-live="polite"></output><small>电脑与手机布局分别保存到当前浏览器。</small>';
 document.body.append(panel);
 const navigator=document.createElement('label');
 navigator.className='editor-canvas-navigation';navigator.innerHTML='散落画布 · 3 屏高度<input type="range" min="0" max="100" value="0" aria-label="浏览散落画布"><small>滚轮浏览上下区域；拖到屏幕边缘可继续移动。</small>';
 panel.querySelector('p').after(navigator);
 const canvasSlider=navigator.querySelector('input');
 function updateCanvasControl(){canvasSlider.value=String(canvasPan()/((canvasScreens-1)*field.clientHeight)*100);}
 canvasSlider.oninput=()=>{
  const padding=parseFloat(getComputedStyle(section).paddingTop)||0;
  const top=scrollY+section.getBoundingClientRect().top+padding;
  scrollTo({top:top+Number(canvasSlider.value)/100*(section.offsetHeight-padding-field.clientHeight),behavior:'instant'});
  ScrollTrigger.update();render();
 };
 const status=panel.querySelector('output');
 function selectLetter(i){selected=i;letters.forEach((el,n)=>el.classList.toggle('is-selected',n===i));status.textContent=labels[i];}
 function moveLetter(i,x,y){
  const el=letters[i],w=field.clientWidth,h=field.clientHeight*(editMode==='scatter'?canvasScreens:1),lw=el.offsetWidth,lh=el.offsetHeight;
  const mx=editMode==='scatter'?Math.hypot(lw,lh)/2+28:lw/2+28;
  const my=editMode==='scatter'?Math.hypot(lw,lh)/2+28:lh/2+28;
  const cx=gsap.utils.clamp(mx,w-mx,x+lw/2),cy=gsap.utils.clamp(my,h-my,y+lh/2);
  saved[w<680?'mobile':'desktop'][editMode][i]=[cx/w,cy/h];
  measure();status.textContent='位置已调整，点击保存位置。';
 }
 function setMode(mode){
  editMode=mode;drag=null;
  navigator.hidden=mode!=='scatter';
  panel.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));
  const st=ScrollTrigger.getById('see-again-assembly');
  if(st){window.scrollTo({top:mode==='scatter'?scrollY+section.getBoundingClientRect().top+(parseFloat(getComputedStyle(section).paddingTop)||0):st.end,behavior:'instant'});ScrollTrigger.update();}
  render();
 }
 function toggleEditor(open){
  editing=open;panel.hidden=!open;section.classList.toggle('is-editing',open);drag=null;
  letters.forEach(el=>{gsap.killTweensOf(el.firstElementChild);gsap.set(el.firstElementChild,{z:0,y:0,rotationX:0,rotationY:0});});
  if(open){setMode(progress.value>.7?'assembled':'scatter');status.textContent='选择字母后拖动；W 或 Esc 退出。';}else{render();}
 }
 panel.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));
 panel.querySelector('[data-close]').onclick=()=>toggleEditor(false);
 panel.querySelector('[data-save]').onclick=()=>{try{localStorage.setItem(storageKey,JSON.stringify(saved));status.textContent='已保存，刷新后保留。';}catch{status.textContent='浏览器无法保存，请检查存储设置。';}};
 panel.querySelector('[data-reset]').onclick=()=>{saved[field.clientWidth<680?'mobile':'desktop'][editMode]={};measure();status.textContent='已恢复默认位置，点击保存以保留。';};
 addEventListener('keydown',event=>{
  if(event.target.closest('input,textarea,select,[contenteditable="true"]')||event.ctrlKey||event.metaKey||event.altKey)return;
  if(event.code==='KeyW'&&!event.repeat){event.preventDefault();toggleEditor(!editing);return;}
  if(!editing)return;
  if(event.code==='Escape'){toggleEditor(false);return;}
  const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.code];
  if(delta&&selected>=0){event.preventDefault();const el=letters[selected],step=event.shiftKey?10:1;moveLetter(selected,Number(gsap.getProperty(el,'x'))+delta[0]*step,Number(gsap.getProperty(el,'y'))+(editMode==='scatter'?canvasPan():0)+delta[1]*step);}
 });
 gsap.ticker.add((time,delta)=>{
  if(!editing||editMode!=='scatter'||!drag)return;
  const edge=80,dy=drag.clientY<edge?-1:drag.clientY>innerHeight-edge?1:0;
  if(!dy)return;
  const padding=parseFloat(getComputedStyle(section).paddingTop)||0;
  const start=scrollY+section.getBoundingClientRect().top+padding;
  scrollTo(0,gsap.utils.clamp(start,start+section.offsetHeight-padding-field.clientHeight,scrollY+dy*Math.min(delta,40)*.65));
  moveLetter(drag.index,drag.startX+drag.clientX-drag.x,drag.startY+drag.clientY-drag.y+canvasPan()-drag.pan);
 });
 // Expose readiness for local-file and browser QA without fetching a manifest.
 section.dataset.ready='true';
})();
