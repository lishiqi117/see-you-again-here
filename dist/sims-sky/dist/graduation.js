(() => {
  'use strict';
  const sky = document.querySelector('.sky');
  const section = document.createElement('section');
  section.id = 'graduation-chapter';
  section.setAttribute('aria-label', '毕业快乐');
  section.innerHTML = '<button type="button" class="graduation-banner" data-graduation="true" aria-label="毕业横幅 Happy Graduation!"><img src="assets/graduation/banner.png" alt="Happy Graduation!" draggable="false"></button>';
  sky.append(section);
  const style = document.createElement('style');
  style.textContent = `
    html {scrollbar-width:none;} html::-webkit-scrollbar {display:none;}
    .sky {padding-bottom:0!important;}
    #graduation-chapter {position:relative;height:100dvh;margin-top:calc(var(--campus-tail,0px) + 60vh);display:grid;place-items:center;isolation:isolate;}
    .graduation-banner {position:absolute;left:50%;top:50%;width:84%;height:76%;transform:translate(-50%,-50%);border:0;padding:0;background:none;}
    .graduation-banner img {width:100%;height:100%;object-fit:contain;user-select:none;pointer-events:none;}
    body.editing .graduation-banner {cursor:move;touch-action:none;}
    body.editing .graduation-banner.selected {outline:2px dashed #fff;outline-offset:5px;}
    .graduation-transition {position:fixed;inset:0;z-index:100;pointer-events:none;overflow:hidden;}
    .graduation-transition[hidden] {display:none;}
    .graduation-transition video,.graduation-transition canvas {position:absolute;inset:0;width:100%;height:100%;}
    .graduation-transition video {object-fit:fill;background:#fff;left:50%;top:50%;transform:translate(-50%,-50%);width:max(100vw,177.6833156vh);height:max(100vh,56.2799043vw);}
    .rain-continuation {position:fixed;inset:0;z-index:110;background:#fff;opacity:0;pointer-events:none;}
    .rain-continuation.active {opacity:1;pointer-events:auto;}
    .rain-continuation[hidden] {display:none;}
    .rain-continuation iframe {display:block;width:100%;height:100%;border:0;}
  `;
  document.head.append(style);
  const layer = document.createElement('div');
  layer.className = 'graduation-transition';layer.hidden = true;
  layer.setAttribute('aria-hidden','true');
  const video = document.createElement('video');
  video.muted = true;video.playsInline = true;video.preload = 'auto';
  video.disablePictureInPicture = true;
  const canvas = document.createElement('canvas'),ctx = canvas.getContext('2d');
  layer.append(video,canvas);document.body.append(layer);
  const balloons = Array.from({length:6},(_,i) => {
    const img = new Image();img.src = `assets/graduation/balloon-${i+1}.png`;return img;
  });
  let assetsReady = false,mediaReady = false,target = 0,progress = 0,raf = 0,last = 0,touchY = null;
  const TRANSITION = 2600, FILM = 3400, END = TRANSITION + FILM;
  const rainChapter = document.createElement('section');
  rainChapter.className = 'rain-continuation';rainChapter.inert = true;
  rainChapter.setAttribute('aria-label','雨中 · 擦见');
  rainChapter.innerHTML = '<iframe title="雨中 · 擦见：用毛巾擦亮手机" tabindex="-1"></iframe>';
  document.body.append(rainChapter);
  const rainSite = rainChapter.querySelector('iframe');
  let rainReady = false, rainRequested = false;
  function prepareRain() {
    if(!rainSite.hasAttribute('src'))rainSite.src = '../../rain-phone/dist/index.html?entry=graduation&v=20260923-offline';
  }
  function enterRain() {
    if(rainChapter.classList.contains('active'))return;
    if(!rainReady||!rainRequested||video.seeking||Math.abs(video.currentTime-(video.duration-1/24))>.025)return;
    rainChapter.classList.add('active');rainChapter.inert = false;rainSite.tabIndex = 0;
    rainSite.contentWindow.postMessage({type:'rain:activate'},'*');
    rainSite.focus({preventScroll:true});
  }
  function closeRain() {
    rainRequested = false;rainChapter.classList.remove('active');rainChapter.inert = true;rainSite.tabIndex = -1;
    rainSite.contentWindow.postMessage({type:'rain:hold'},'*');
    target = progress = END-1;
    section.tabIndex = -1;section.focus({preventScroll:true});
  }
  addEventListener('message',event => {
    if(event.source!==rainSite.contentWindow)return;
    if(event.data?.type==='rain:ready'){rainReady = true;enterRain();}
    if(event.data?.type==='rain:back')closeRain();
  });
  Promise.all(balloons.map(img => img.decode())).then(() => {assetsReady = true;wake();});
  // File URLs can seek directly; a complete blob also supports servers without byte ranges.
  const src = 'assets/graduation/scene.mp4';
  if(location.protocol === 'file:') video.src = src;
  else fetch(src).then(r => {if(!r.ok)throw Error(r.status);return r.blob();})
    .then(blob => {video.src = URL.createObjectURL(blob);}).catch(() => {video.src = src;});
  video.addEventListener('loadeddata',() => {mediaReady = true;wake();});
  function seek() {
    if(!mediaReady || video.seeking)return;
    const time = Math.max(0,Math.min(1,(progress-TRANSITION)/FILM)) * Math.max(0,video.duration-1/24);
    const sameFrame=Math.floor((video.currentTime+1e-6)*24)===Math.floor((time+1e-6)*24);
    if(Math.abs(video.currentTime-time)>1/48&&(!sameFrame||progress>=END||progress<=TRANSITION))video.currentTime = time;
  }
  video.addEventListener('seeked',()=>{seek();enterRain();});
  function resize() {
    const dpr = Math.min(devicePixelRatio,2);
    canvas.width = Math.round(innerWidth*dpr);canvas.height = Math.round(innerHeight*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);draw();
  }
  function draw() {
    const p = Math.min(1,progress/TRANSITION),w = innerWidth,h = innerHeight;
    layer.hidden = progress <= 0;
    video.style.visibility = p >= .5 ? 'visible' : 'hidden';
    ctx.clearRect(0,0,w,h);
    if(assetsReady && p>0 && p<1) {
      // Closely spaced balloon bodies form a solid curtain at the concealed cut.
      const size = Math.max(w/4,h/2.5),dx = size*.64,dy = size*.54;
      const cols = Math.ceil(w/dx)+2,rows = Math.ceil(h/dy)+4;
      const height = rows*dy,travel = height+3*h+2*size;
      for(let row=0;row<rows;row++)for(let col=0;col<cols;col++) {
        const seed = row*17+col*31;
        const x = (col-1)*dx + (row%2)*dx*.5 + Math.sin(p*7+seed)*size*.055;
        const speed = 1 + Math.sin(seed*2.3)*.12;
        const y = row*dy-(height-h)/2+(.5-p)*travel*speed+Math.sin(seed)*dy*.12;
        const img = balloons[Math.floor(Math.abs(Math.sin(seed+3))*997)%6],s = size*(1+(seed%5)*.025);
        ctx.drawImage(img,x,y,s,s*img.naturalHeight/img.naturalWidth);
      }
    }
    seek();
    if(progress===END){rainRequested = true;enterRain();}
    window.__graduation = {progress,target,ready:assetsReady&&mediaReady,time:video.currentTime,seeking:video.seeking};
  }
  function tick(now) {
    raf = 0;const dt = Math.min(40,last?now-last:16);last = now;
    const goal = assetsReady&&mediaReady ? target : Math.min(target,TRANSITION*.42);
    progress += (goal-progress)*(1-Math.exp(-dt/65));
    if(Math.abs(progress-goal)<.2)progress = goal;
    draw();
    if(progress!==goal)raf = requestAnimationFrame(tick);else last = 0;
  }
  function wake() {if(!raf)raf = requestAnimationFrame(tick);}
  function consume(delta) {
    if(rainChapter.classList.contains('active'))return false;
    if(!delta||document.querySelector('dialog[open]')||document.body.classList.contains('editing'))return false;
    const bottom = document.documentElement.scrollHeight-innerHeight;
    if(progress===0 && target===0 && (delta<0 || scrollY<bottom-3))return false;
    prepareRain();
    if(delta>0 && progress===END){rainRequested = true;enterRain();return true;}
    if(delta<0)rainRequested = false;
    scrollTo({top:bottom,behavior:'instant'});
    target = Math.max(0,Math.min(END,target+Math.max(-240,Math.min(240,delta))));wake();return true;
  }
  addEventListener('wheel',event => {
    if(event.ctrlKey)return;
    const unit = event.deltaMode===1?16:event.deltaMode===2?innerHeight:1;
    if(consume(event.deltaY*unit)){event.preventDefault();event.stopImmediatePropagation();}
  },{passive:false,capture:true});
  addEventListener('touchstart',e => {touchY=e.touches[0]?.clientY??null;},{passive:true});
  addEventListener('touchmove',e => {if(touchY===null)return;const y=e.touches[0].clientY;if(consume((touchY-y)*2))e.preventDefault();touchY=y;},{passive:false});
  addEventListener('keydown',e => {
    if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;
    const delta = {ArrowDown:100,ArrowUp:-100,PageDown:240,PageUp:-240,' ':240}[e.key];
    if(delta&&consume(delta))e.preventDefault();
  });
  addEventListener('message',e => {
    if(e.source===parent&&e.data?.type==='school:reset') {
      closeRain();rainReady = false;rainSite.removeAttribute('src');
      target=progress=0;cancelAnimationFrame(raf);raf=0;last=0;draw();
    }
  });
  addEventListener('resize',resize);resize();
})();
