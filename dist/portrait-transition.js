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
    <video src="./assets/lamp/portrait-scrub.mp4" preload="none" muted playsinline disablepictureinpicture disableremoteplayback hidden></video>
    <p class="portrait-entry-hint" role="status">向下滚动，走进照片</p>
    <button type="button" class="portrait-entry-close" aria-label="返回档案">×</button>`;
  archive.append(dialog);
  const video = dialog.querySelector('video');
  const canvas = dialog.querySelector('canvas');
  const poster = dialog.querySelector('img');
  let world = dialog.querySelector('iframe');
  const ctx = canvas.getContext('2d', { alpha: false });
  const hint = dialog.querySelector('p');
  const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
  const PIXELS = 1200, END = 2.8;
  let target=0, position=0, frame=0, lastTime=0, touchY=null, paintedTime=-1;
  let entryReady=false, entrySession=0;
  let sceneReady=false, sceneFinished=false, resetting=true, lastScene=-1, lastVisible=null;
  video.muted=true; video.pause();

  const sources=['./assets/lamp/portrait-scrub.mp4','./assets/lamp/portrait-compatible.mp4','./assets/lamp/portrait-transition.mp4'];
  const events=[];
  let sourceIndex=0,pendingSeek=null,seekId=0,mediaFailure=false,mediaLoading=false,loadStarted=0,reloads=0;
  let watchdog=0,waiters=[],sceneFailure=false,recoveringFrame=false,bufferedEnd=0;
  function diagnose(kind,code,extra={}){
    const record={at:Date.now(),kind,code,source:video.currentSrc||video.src,time:video.currentTime,readyState:video.readyState,nativeSeeking:video.seeking,...extra};
    events.push(record);if(events.length>80)events.shift();
    if(code!=='seek-complete')console[code.includes('failed')?'warn':'info']('[portrait:'+kind+']',record);
  }
  window.portraitDiagnostics={snapshot:()=>({target,position,entryReady,sceneReady,sceneFinished,sceneFailure,mediaFailure,mediaLoading,sourceIndex,pendingSeek:pendingSeek&&{...pendingSeek},nativeSeeking:video.seeking,currentTime:video.currentTime,duration:video.duration,events:events.slice()})};
  function showFailure(kind){
    if(!dialog.open)return;
    hint.style.opacity='1';
    hint.textContent=kind==='scene'?'3D 星球未能准备好，请重试':'照片视频未能准备好，请重试';retry.hidden=false;
  }
  function settleMedia(error){const jobs=waiters;waiters=[];jobs.forEach(({resolve,reject})=>error?reject(error):resolve());}
  function watch(){if(!watchdog)watchdog=setInterval(checkMedia,250);}
  function stopWatch(){clearInterval(watchdog);watchdog=0;}
  function loadSource(reason){
    recoveringFrame=dialog.open&&canvas.classList.contains('visible')&&!resetting;
    pendingSeek=null;mediaFailure=false;mediaLoading=true;loadStarted=performance.now();bufferedEnd=0;
    video.src=sources[sourceIndex];video.preload='auto';video.load();watch();diagnose('video',reason);
  }
  function recover(reason){
    if(mediaFailure)return;
    diagnose('video',reason,{request:pendingSeek?.id});
    if(reloads++<1){loadSource('retry-source');return;}
    if(sourceIndex<sources.length-1){sourceIndex++;reloads=0;loadSource('fallback-source');return;}
    pendingSeek=null;mediaLoading=false;mediaFailure=true;stopWatch();
    diagnose('video','failed');settleMedia(new Error('照片视频未能准备好，请重试'));showFailure('video');
  }
  function completeSeek(){
    if(video.seeking||video.readyState<2)return false;
    if(pendingSeek&&Math.abs(video.currentTime-pendingSeek.time)>.045)return false;
    if(pendingSeek)diagnose('video','seek-complete',{request:pendingSeek.id,elapsed:performance.now()-pendingSeek.started});
    if(pendingSeek)recoveringFrame=false;
    pendingSeek=null;paint();wake();return true;
  }
  function checkMedia(){
    if(document.hidden){loadStarted=performance.now();if(pendingSeek)pendingSeek.started=performance.now();return;}
    if(mediaLoading){if(video.readyState>=2){mediaLoaded();return;}if(performance.now()-loadStarted>20000)recover('load-no-progress');return;}
    if(pendingSeek){if(completeSeek())return;if(performance.now()-pendingSeek.started>8000)recover('seek-no-progress');}
    else if(!video.seeking)stopWatch();
  }
  function seek(time){
    if(mediaFailure||mediaLoading||video.readyState<2)return;
    if(pendingSeek)return; // Coalesce wheel input in target; never overwrite a live seek.
    pendingSeek={id:++seekId,time,started:performance.now()};watch();
    if(!video.seeking){
      if(Math.abs(video.currentTime-time)<.008){completeSeek();return;}
      try{video.currentTime=time;}catch(error){diagnose('video','seek-exception',{message:error.message});recover('seek-failed');}
    }
  }
  function mediaLoaded(){
    if(video.readyState<2||!mediaLoading)return;
    mediaLoading=false;diagnose('video','loaded');settleMedia();wake();
    if(dialog.open)hint.textContent=sceneFailure?'3D 星球未能准备好，请重试':'向下滚动，走进照片';
  }
  function warmVideo(){if(video.preload==='auto'&&!mediaFailure)return;loadSource('load-start');}
  window.preparePortraitVideo=()=>{
    if(mediaFailure){reloads=0;loadSource('manual-retry');}
    if(video.readyState>=2&&!mediaLoading)return Promise.resolve();
    const promise=new Promise((resolve,reject)=>waiters.push({resolve,reject}));
    if(!mediaLoading)loadSource('load-start');return promise;
  };
  function releaseWorld(){
    const next=world.cloneNode(false);next.removeAttribute('src');world.replaceWith(next);world=next;
    sceneReady=false;lastVisible=null;lastScene=-1;
  }
  function prepareWorld(){warmVideo();if(!world.hasAttribute('src'))world.src='./3D场景编辑器.html?embedded=archive';}
  let preparing=null;
  window.preparePortraitScene=()=>{
    if(sceneReady)return Promise.resolve();if(preparing)return preparing;
    sceneFailure=false;diagnose('scene','load-start');
    const expectedWorld=world;
    const task=new Promise((resolve,reject)=>{
      let settled=false;
      if(!archive.open)archive.classList.add('preparing-scene');if(!dialog.open)dialog.classList.add('preparing-scene');
      const timer=setTimeout(()=>finish(new Error('3D 星球准备超时，请重试')),120000);
      function finish(error){
        if(settled)return;settled=true;clearTimeout(timer);window.removeEventListener('message',onMessage);dialog.removeEventListener('close',cancel);
        archive.classList.remove('preparing-scene');dialog.classList.remove('preparing-scene');
        if(error){sceneFailure=true;if(world===expectedWorld)releaseWorld();diagnose('scene','failed',{message:error.message});showFailure('scene');reject(error);}
        else{sceneReady=true;sceneFailure=false;lastScene=-1;diagnose('scene','ready');syncLayers();wake();resolve();}
      }
      function onMessage(event){
        if(event.source!==expectedWorld.contentWindow||world!==expectedWorld)return;
        if(event.data?.type==='archive:scene-ready')finish();
        if(event.data?.type==='archive:scene-error')finish(new Error('3D 星球准备失败，请重试'));
      }
      function cancel(){if(dialog.open)return;finish(new Error('照片已关闭'));}
      dialog.addEventListener('close',cancel,{once:true});window.addEventListener('message',onMessage);prepareWorld();
    });
    preparing=task;task.then(()=>{if(preparing===task)preparing=null;},()=>{if(preparing===task)preparing=null;});return task;
  };
  function syncLayers() {
    // Both photo and film use cover + the SAME zoom, with no letterbox bars.
    const zoom=1.45 + Math.min(position,1)*.45;
    poster.style.transform=canvas.style.transform=`scale(${zoom})`;
    const blend=sceneReady ? clamp((position-1)/.18,0,1) : 0;
    canvas.style.opacity=canvas.classList.contains('visible') ? String(1-blend) : '0';
    poster.style.opacity=canvas.classList.contains('visible') ? '0' : '1';
    world.style.opacity=sceneReady?'1':'0';
    const visible=sceneReady && blend>0 && dialog.open && !document.hidden;
    if(sceneReady && visible!==lastVisible){
      world.contentWindow.postMessage({type:'archive:visibility',visible},'*');
      lastVisible=visible;
    }
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
    if(video.readyState<2||video.seeking||mediaLoading||mediaFailure||recoveringFrame) return;
    if(resetting && video.currentTime>.04) return;
    if(paintedTime===video.currentTime && !resetting)return;
    ctx.drawImage(video,0,0,1920,1080);
    paintedTime=video.currentTime;
    canvas.classList.add('visible');resetting=false;
  }
  function tick(now) {
    frame=0;if(!dialog.open||document.hidden||!entryReady)return;
    const dt=Math.min(40,lastTime?now-lastTime:16);lastTime=now;
    // Stop at the last photograph frame if the 3D assets are still preparing.
    const lastFrameReady=video.readyState>=2&&!pendingSeek&&!video.seeking&&!mediaLoading&&!mediaFailure&&Math.abs(video.currentTime-(video.duration-.055))<.045;
    const goal=sceneReady&&(position>1||lastFrameReady)?target:Math.min(target,1);
    position+=(goal-position)*(1-Math.exp(-dt/65));
    if(Math.abs(goal-position)<.001)position=goal;
    if(video.readyState>=2 && !pendingSeek && !mediaLoading && !mediaFailure && (position<=1.18 || resetting)){
      const time=resetting?0:clamp(position,0,1)*(video.duration-.055);
      const sameFrame=Math.floor((video.currentTime+1e-6)*24)===Math.floor((time+1e-6)*24);
      if(Math.abs(video.currentTime-time)>.012&&(!sameFrame||resetting||position>=1)){seek(time);}
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
  function reset(releaseScene=false){
    cancelAnimationFrame(frame);frame=0;lastTime=0;target=0;position=0;touchY=null;
    video.pause();resetting=true;recoveringFrame=false;canvas.classList.remove('visible');
    pendingSeek=null;stopWatch();if(mediaLoading)watch();
    if(!releaseScene && video.readyState>=2)seek(0);
    if(releaseScene && world.hasAttribute('src'))releaseWorld();
    sceneFinished=false;
    if(!world.hasAttribute('src')){sceneReady=false;sceneFinished=false;}
    paintedTime=-1;
    lastScene=-1;lastVisible=null;syncLayers();
  }
  video.addEventListener('loadeddata',()=>{mediaLoaded();if(!video.seeking)completeSeek();wake();});
  video.addEventListener('seeked',()=>{completeSeek();wake();});
  video.addEventListener('error',()=>recover('decode-failed'));
  video.addEventListener('progress',()=>{const end=video.buffered.length?video.buffered.end(video.buffered.length-1):0;if(end>bufferedEnd+.01){bufferedEnd=end;loadStarted=performance.now();}});
  video.addEventListener('loadstart',()=>{pendingSeek=null;mediaLoading=true;loadStarted=performance.now();watch();});
  document.addEventListener('visibilitychange',()=>{syncLayers();if(!document.hidden){loadStarted=performance.now();if(pendingSeek)pendingSeek.started=performance.now();wake();}});
  const retry=document.createElement('button');retry.type='button';retry.className='portrait-load-retry';retry.textContent='重试';retry.hidden=true;dialog.append(retry);
  async function enter(){
    const session=++entrySession;entryReady=false;retry.hidden=true;hint.style.removeProperty('opacity');hint.textContent='正在准备照片…';
    try{
      await window.prepareNextMemory();
      await window.preparePortraitVideo();
      if(!dialog.open||session!==entrySession)return;
      entryReady=true;hint.textContent='向下滚动，走进照片';wake();
    }catch(error){if(dialog.open&&session===entrySession){showFailure(sceneFailure?'scene':'video');}}
  }
  retry.addEventListener('click',()=>{if(mediaFailure){reloads=0;loadSource('manual-retry');}enter();});
  window.addEventListener('portrait:preload',event=>{if(dialog.open&&!entryReady)hint.textContent=event.detail.message;});
  window.addEventListener('archive-portrait:open',()=>{
    reset();archive.classList.remove('preparing-scene');dialog.classList.remove('preparing-scene');
    document.body.classList.add('archive-world-active');dialog.showModal();dialog.focus({preventScroll:true});enter();
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
    event.stopPropagation();if(dialog.open)return;entrySession++;entryReady=false;document.body.classList.remove('archive-world-active');reset(true);archive.querySelector('[data-object="portrait"]')?.focus({preventScroll:true});
  });
})();
