(() => {
  'use strict';
  const archive = document.querySelector('#deskArchiveDialog');
  if (!archive) return;
  const dialog = document.createElement('dialog');
  dialog.className = 'portrait-transition';
  dialog.setAttribute('aria-label', '走进童年照片');
  dialog.tabIndex = -1;
  dialog.innerHTML = `<iframe class="portrait-world" title="照片里的三维童年世界" tabindex="-1"></iframe>
    <img class="portrait-entry-image" src="./assets/lamp/portrait-entry.jpg" alt="粉色童年照片" draggable="false">
    <canvas width="1920" height="1080" aria-hidden="true"></canvas>
    <video src="./assets/lamp/portrait-transition.mp4" preload="metadata" muted playsinline disablepictureinpicture disableremoteplayback hidden></video>
    <p class="portrait-entry-hint" role="status">向下滚动，走进照片</p>
    <button type="button" class="portrait-entry-close" aria-label="返回档案">×</button>`;
  archive.append(dialog);
  const video = dialog.querySelector('video');
  const canvas = dialog.querySelector('canvas');
  const poster = dialog.querySelector('img');
  const world = dialog.querySelector('iframe');
  const ctx = canvas.getContext('2d', { alpha: false });
  const hint = dialog.querySelector('p');
  const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
  const PIXELS = 1800, END = 3.8;
  let target=0, position=0, frame=0, lastTime=0, touchY=null, seeking=false, paintedTime=-1;
  let sceneReady=false, sceneFinished=false, resetting=true, lastScene=-1;
  video.muted=true; video.pause();

  function warmVideo(){if(video.preload==='auto')return;video.preload='auto';video.load();}
  archive.addEventListener('archive:open',warmVideo);
  function prepareWorld() {
    warmVideo();
    if (world.hasAttribute('src')) return;
    world.src='./3D场景编辑器.html?embedded=archive';
  }
  function syncLayers() {
    // Both photo and film use cover + the SAME zoom, with no letterbox bars.
    const zoom=1.45 + Math.min(position,1)*.45;
    poster.style.transform=canvas.style.transform=`scale(${zoom})`;
    const blend=sceneReady ? clamp((position-1)/.18,0,1) : 0;
    canvas.style.opacity=canvas.classList.contains('visible') ? String(1-blend) : '0';
    poster.style.opacity=canvas.classList.contains('visible') ? '0' : '1';
    world.style.opacity=sceneReady?'1':'0';
    const progress=clamp((position-1.18)/(END-1.18),0,1);
    if(sceneReady && progress!==lastScene){
      world.contentWindow.postMessage({type:'archive:seek-scene',progress},'*');
      lastScene=progress;
    }
    if(progress===1) sceneFinished=true;
    world.style.pointerEvents=sceneFinished?'auto':'none';
    world.tabIndex=sceneFinished?0:-1;
    canvas.style.visibility=blend===1?'hidden':'visible';
    poster.style.visibility=canvas.classList.contains('visible')?'hidden':'visible';
    dialog.classList.toggle('entering',position>.02);
    dialog.dataset.progress=position.toFixed(4);
  }
  function paint() {
    if(video.readyState<2) return;
    if(resetting && video.currentTime>.04) return;
    if(paintedTime===video.currentTime && !resetting)return;
    ctx.drawImage(video,0,0,1920,1080);
    paintedTime=video.currentTime;
    canvas.classList.add('visible');resetting=false;
  }
  function tick(now) {
    frame=0;if(!dialog.open)return;
    const dt=Math.min(40,lastTime?now-lastTime:16);lastTime=now;
    // Stop at the last photograph frame if the 3D assets are still preparing.
    const lastFrameReady=video.readyState>=2&&!seeking&&Math.abs(video.currentTime-(video.duration-.055))<.045;
    const goal=sceneReady&&(position>1||lastFrameReady)?target:Math.min(target,1);
    position+=(goal-position)*(1-Math.exp(-dt/65));
    if(Math.abs(goal-position)<.001)position=goal;
    if(video.readyState>=2 && !seeking && (position<=1.18 || resetting)){
      const time=resetting?0:clamp(position,0,1)*(video.duration-.055);
      const sameFrame=Math.floor((video.currentTime+1e-6)*24)===Math.floor((time+1e-6)*24);
      if(Math.abs(video.currentTime-time)>.012&&(!sameFrame||resetting||position>=1)){seeking=true;video.currentTime=time;}
      else paint();
    }
    syncLayers();
    if(Math.abs(goal-position)>.0001)frame=requestAnimationFrame(tick);else lastTime=0;
  }
  function wake(){if(dialog.open&&!frame)frame=requestAnimationFrame(tick);}
  function advance(delta){
    if(!dialog.open||sceneFinished)return;
    target=clamp(target+delta/PIXELS,0,END);
    wake();
  }
  function reset(){
    cancelAnimationFrame(frame);frame=0;lastTime=0;target=0;position=0;touchY=null;
    video.pause();resetting=true;canvas.classList.remove('visible');
    if(!seeking&&video.readyState>=2){seeking=true;video.currentTime=0;}
    if(!dialog.open && world.hasAttribute('src'))world.removeAttribute('src');
    if(!world.hasAttribute('src')){sceneReady=false;sceneFinished=false;}
    paintedTime=-1;
    lastScene=-1;syncLayers();
  }
  video.addEventListener('loadeddata',()=>{paint();wake();});
  video.addEventListener('seeked',()=>{seeking=false;paint();wake();});
  video.addEventListener('error',()=>{hint.textContent='照片暂时无法展开，请关闭后重试';});
  window.addEventListener('message',event=>{
    if(event.source!==world.contentWindow||event.data?.type!=='archive:scene-ready')return;
    sceneReady=true;lastScene=-1;syncLayers();wake();
  });
  window.addEventListener('archive-portrait:open',()=>{
    reset();document.body.classList.add('archive-world-active');dialog.showModal();dialog.focus({preventScroll:true});prepareWorld();wake();
  });
  dialog.querySelector('button').addEventListener('click',()=>dialog.close());
  for(const type of ['wheel','keydown','keyup','pointerdown','pointermove','pointerup','touchstart','touchmove','click'])
    dialog.addEventListener(type,event=>event.stopPropagation());
  dialog.addEventListener('wheel',event=>{
    event.preventDefault();if(event.ctrlKey)return;
    const unit=event.deltaMode===1?16:event.deltaMode===2?innerHeight:1;
    advance(clamp(event.deltaY*unit,-240,240));
  },{passive:false});
  dialog.addEventListener('keydown',event=>{
    if(event.key==='Escape'){event.preventDefault();dialog.close();}
    const steps={ArrowDown:120,ArrowUp:-120,PageDown:400,PageUp:-400,' ':120,Enter:120};
    if(event.key in steps){event.preventDefault();advance(steps[event.key]);}
  });
  dialog.addEventListener('touchstart',event=>{touchY=event.touches[0]?.clientY??null;},{passive:true});
  dialog.addEventListener('touchmove',event=>{
    event.preventDefault();if(touchY===null)return;
    const y=event.touches[0].clientY;advance((touchY-y)*2.4);touchY=y;
  },{passive:false});
  dialog.addEventListener('contextmenu',event=>event.preventDefault());
  dialog.addEventListener('close',event=>{
    event.stopPropagation();document.body.classList.remove('archive-world-active');reset();archive.querySelector('[data-object="portrait"]')?.focus({preventScroll:true});
  });
})();
