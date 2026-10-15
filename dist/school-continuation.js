// Scroll-controlled frames, composited into the scene without a player surface.
export function createSchoolContinuation({viewport,onExit}) {
 const site=document.createElement('iframe');site.className='school-sky-site';site.title='晴天收藏';site.tabIndex=-1;site.setAttribute('aria-hidden','true');viewport.append(site);
 const layer=document.createElement('canvas');layer.className='school-continuation';layer.hidden=true;layer.setAttribute('aria-hidden','true');viewport.append(layer);
 const context=layer.getContext('2d',{alpha:true});
 const ending=new Image();
 ending.src='./assets/space-editor/school-transition-first-20261009.png';
 let referencesReady=false;
 ending.decode().then(()=>{referencesReady=true;draw();wake();}).catch(()=>{});
 const video=document.createElement('video');video.preload='none';video.muted=true;video.playsInline=true;video.hidden=true;
 video.disablePictureInPicture=true;video.disableRemotePlayback=true;video.setAttribute('aria-hidden','true');viewport.append(video);
 let active=false,armed=false,ready=false,error=null,target=0,position=0,raf=0,last=0,seeking=false,painted=-1,touchY=null,siteReady=false,handedOff=false;
 let width=0,height=0,pixelRatio=1;
 let openingFrame=null;
 const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
 const source='./assets/space-editor/school-transition-continuous-20261011.mp4';
 // Native media loading preserves range requests and avoids a second full-file Blob.
 video.src=source;
 function resize(){
  const w=viewport.clientWidth,h=viewport.clientHeight,dpr=Math.min(devicePixelRatio||1,1920/w,1080/h);
  width=w;height=h;pixelRatio=dpr;
  if(layer.width!==Math.round(w*dpr)||layer.height!==Math.round(h*dpr)){layer.width=Math.round(w*dpr);layer.height=Math.round(h*dpr);}
 }
 function warmVideo(){if(video.preload==='auto')return;video.preload='auto';video.load();}
 window.addEventListener('space-editor-intro-complete',warmVideo,{once:true});
 function prepare(captureInput=false){
  warmVideo();
  if(captureInput)armed=true;
  if(!site.hasAttribute('src'))site.src='./sims-sky/dist/index.html?entry=school&v=20261009-continuous-layout';
  resize();
 }
 function draw(){
  if(!active||!referencesReady)return;
  if(!width||!height)resize();
  const w=width,h=height,dpr=pixelRatio;
  context.setTransform(dpr,0,0,dpr,0,0);
  context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';
  const paint=(source)=>{
   const sw=source.videoWidth||source.naturalWidth||source.width,sh=source.videoHeight||source.naturalHeight||source.height;
   const scale=Math.max(w/sw,h/sh);
   context.drawImage(source,(w-sw*scale)/2,(h-sh*scale)/2,sw*scale,sh*scale);
  };
  // The supplied compositions are the endpoints; saved object transforms are untouched.
  context.globalAlpha=1;context.clearRect(0,0,w,h);
  const handoff=siteReady&&position>=.9999&&!seeking&&Math.abs(video.currentTime-(video.duration-1/24))<1/48?1:0;
  if(handoff<.5){
   if(position===0||video.readyState<2)paint(openingFrame||ending);
   else{
    paint(video);painted=video.currentTime;
    if(openingFrame&&video.currentTime<.125){
     // Keep the actual rendered pixels at the boundary, then ease the small
     // material/grain difference into the registered moving shot.
     const u=clamp(video.currentTime/.125);
     context.globalAlpha=1-u*u*(3-2*u);
     paint(openingFrame);
    }
   }
  }

  context.globalAlpha=1;layer.hidden=false;
  layer.style.opacity=handoff===1?'0':'1';
  site.style.opacity=handoff>=.5?'1':'0';
  if(handoff===1&&!handedOff){handedOff=true;viewport.classList.add('sky-handoff-live');site.style.pointerEvents='auto';site.tabIndex=0;site.removeAttribute('aria-hidden');site.contentWindow.postMessage({type:'school:activate'},'*');site.focus({preventScroll:true});}
 }
 function tick(now){
  raf=0;if(!active)return;
  const dt=Math.min(40,last?now-last:16);last=now;
  let goal=siteReady?target:Math.min(target,1);
  if(position>=1&&(seeking||Math.abs(video.currentTime-(video.duration-1/24))>1/48))goal=Math.min(goal,1);
  if(ready&&referencesReady){
   let next=position+(goal-position)*(1-Math.exp(-dt/65));
   if(Math.abs(goal-next)<.0002)next=goal;
   // Bound forward/reverse motion to the source cadence, including wheel bursts.
   next=clamp(next,position-dt*.00018,position+dt*.00018);
   position=next;
  }
  // Every scroll increment advances the video; there is no static lead-in.
  const time=Math.min(Math.round(position*Math.max(0,video.duration-1/24)*24)/24,Math.max(0,video.duration-1/24));
  if(ready&&!seeking){
   if(Math.abs(video.currentTime-time)>1/48){seeking=true;video.currentTime=time;}
  }
  if(!seeking&&(position===0||position>=.9999))draw();
  if(ready&&Math.abs(goal-position)>.0001)wake();else last=0;
 }
 function wake(){if(active&&!raf)raf=requestAnimationFrame(tick);}
 function advance(delta){if((!active&&!armed)||handedOff)return;target=clamp(target+delta/2800,0,1);wake();}
 window.addEventListener('message',event=>{
  if(event.source!==site.contentWindow)return;
  if(event.data?.type==='sky:ready'){siteReady=true;wake();}
  if(event.data?.type==='sky:back'&&active){handedOff=false;viewport.classList.remove('sky-handoff-live');site.style.pointerEvents='none';site.tabIndex=-1;site.setAttribute('aria-hidden','true');target=position=.985;draw();wake();}
  if(event.data?.type==='sky:exit'&&active)onExit();
 });
 video.addEventListener('loadeddata',()=>{ready=true;wake();});
 video.addEventListener('seeked',()=>{seeking=false;draw();wake();});
 video.addEventListener('error',()=>{error=video.error?.message||'Could not load scene';});
 viewport.addEventListener('wheel',event=>{
  if((!active&&!armed)||handedOff||event.ctrlKey)return;event.preventDefault();event.stopImmediatePropagation();
  const unit=event.deltaMode===1?16:event.deltaMode===2?viewport.clientHeight:1;
  advance(clamp(event.deltaY*unit,-240,240));
 },{capture:true,passive:false});
 viewport.addEventListener('touchstart',event=>{if(active||armed)touchY=event.touches[0]?.clientY??null;},{passive:true});
 viewport.addEventListener('touchmove',event=>{if((!active&&!armed)||handedOff||touchY===null)return;event.preventDefault();event.stopImmediatePropagation();const y=event.touches[0].clientY;advance((touchY-y)*2);touchY=y;},{capture:true,passive:false});
 window.addEventListener('resize',()=>{resize();if(active)draw();});
 return {
  prepare,
  begin(options={}){openingFrame=options.openingFrame||null;if(!armed)target=0;prepare();active=true;armed=false;position=0;last=0;handedOff=false;painted=-1;layer.hidden=true;video.pause();if(ready&&video.currentTime>.02){seeking=true;video.currentTime=0;}draw();wake();},
  reset(){viewport.classList.remove('sky-handoff-live');active=armed=false;openingFrame=null;target=position=0;handedOff=false;last=0;touchY=null;cancelAnimationFrame(raf);raf=0;video.pause();layer.hidden=true;layer.style.opacity='0';site.style.opacity='0';site.style.pointerEvents='none';site.tabIndex=-1;site.setAttribute('aria-hidden','true');site.contentWindow.postMessage({type:'school:reset'},'*');},
  get report(){return {active,ready,error,progress:position,target,time:video.currentTime,paintedTime:painted,duration:video.duration,paused:video.paused,seeking,siteReady,handedOff};}
 };
}
