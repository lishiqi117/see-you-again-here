(() => {
  'use strict';
  const embedded = new URLSearchParams(location.search).get('entry')==='graduation';
  let activated = !embedded;
  if(embedded)document.documentElement.classList.add('graduation-entry');
  const scene = document.querySelector('#scene');
  const phone = document.querySelector('#phone'), rain = document.querySelector('#rain'), towel = document.querySelector('#towel');
  const ctx = phone.getContext('2d'), rc = rain.getContext('2d');
  const hint = document.querySelector('#hint'), progress = document.querySelector('#progress');
  const mask = document.createElement('canvas'), revealed = document.createElement('canvas');
  mask.width = revealed.width = 1672; mask.height = revealed.height = 941;
  const mc = mask.getContext('2d', {willReadFrequently:true}), vc = revealed.getContext('2d');
  // The two supplied photographs share this exact screen boundary.
  const screen = {x:637,y:70,w:401,h:810,r:38};
  let width=0,height=0,dpr=1,layout,assets,ready=false,lastTime=0,lastProgress=0,coverage=0,dirty=true;
  let pointer={x:0,y:0,active:false}, previous=null, drops=[],removed=0;
  let towelW=0,towelH=0,towelSprite,towelPixels,dropSprites=[];
  let rainTime=0,nextSpawn=0,spawnSerial=0;
  let wipeSoundTimer=0,nextWipeSoundAt=0;
  window.SiteSounds?.prepare(['wipe']);
  function stopWipeSound(){clearTimeout(wipeSoundTimer);window.SiteSounds?.stop('wipe');}
  const lanes=[];
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const settingsKey='rain-phone-settings-v1';
  const defaults=()=>({size:1,count:Math.min(160,Math.round(innerWidth*innerHeight/32500)),speed:1});
  let settings=defaults();
  try{const saved=JSON.parse(localStorage.getItem(settingsKey));if(saved&&typeof saved==='object'){
    for(const [key,min,max] of [['size',.25,4],['count',0,160],['speed',0,3]]){
      if(Number.isFinite(saved[key]))settings[key]=Math.max(min,Math.min(max,saved[key]));
    }settings.count=Math.round(settings.count);
  }}catch{}
  function syncDrops(){
    if(drops.length>settings.count)drops.length=settings.count;
    while(drops.length<settings.count)drops.push(newDrop(true));
  }
  function showSettings(){
    for(const key of ['size','count','speed'])document.querySelector('#rain-'+key).value=settings[key];
    document.querySelector('#size-value').textContent=settings.size.toFixed(2)+' 倍';
    document.querySelector('#count-value').textContent=settings.count+' 颗';
    document.querySelector('#speed-value').textContent=settings.speed===0?'暂停':settings.speed.toFixed(2)+' 倍';
  }
  function saveSettings(){try{localStorage.setItem(settingsKey,JSON.stringify(settings));document.querySelector('#settings-note').textContent='实时生效，自动保存在此浏览器';}catch{document.querySelector('#settings-note').textContent='实时生效；此浏览器无法保存设置';}}
  for(const key of ['size','count','speed'])document.querySelector('#rain-'+key).addEventListener('input',e=>{
    settings[key]=Number(e.target.value);
    if(key==='size')for(const d of drops)d.h=d.baseSize*2*settings.size;
    if(key==='count')syncDrops();
    showSettings();saveSettings();
  });
  document.querySelector('#rain-defaults').addEventListener('click',()=>{
    settings=defaults();for(const d of drops)d.h=d.baseSize*2*settings.size;
    syncDrops();showSettings();saveSettings();
  });
  showSettings();
  const editor=document.querySelector('#editor');
  document.addEventListener('keydown',e=>{
    if(e.key.toLowerCase()!=='l'||e.repeat||e.ctrlKey||e.metaKey||e.altKey||e.isComposing)return;
    if(e.target.isContentEditable||e.target.matches('textarea,input:not([type="range"]):not([type="button"])'))return;
    e.preventDefault();
    editor.hidden=!editor.hidden;
    if(editor.hidden){saveSettings();if(editor.contains(document.activeElement))scene.focus({preventScroll:true});}
    else{editor.open=true;previous=null;pointer.active=false;scene.classList.add('pointer-away');}
  });
  const fileAssets = location.protocol==='file:' ? new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src='file-assets.js';
    script.onload=()=>resolve(window.rainFileAssets);script.onerror=()=>reject(new Error('本地图片包加载失败'));
    document.head.append(script);
  }) : Promise.resolve(null);
  const load = async src => {
    const bundled=await fileAssets;
    return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error(src));im.src=bundled?.[src]||src;});
  };
  function screenPath(c){c.beginPath();c.roundRect(screen.x,screen.y,screen.w,screen.h,screen.r);}
  // Crop only for display; the original supplied files remain intact.
  function sprite(image,box){
    const c=document.createElement('canvas');c.width=box.w;c.height=box.h;
    c.getContext('2d').drawImage(image,box.x,box.y,box.w,box.h,0,0,box.w,box.h);return c;
  }
  function tightSprite(image){
    const c=sprite(image,{x:0,y:0,w:image.width,h:image.height}),g=c.getContext('2d'),p=g.getImageData(0,0,c.width,c.height).data;
    let x0=c.width,y0=c.height,x1=0,y1=0;
    for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(p[(y*c.width+x)*4+3]>35){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
    return sprite(c,{x:x0,y:y0,w:x1-x0+1,h:y1-y0+1});
  }
  function resize(){
    width=innerWidth;height=innerHeight;dpr=Math.min(devicePixelRatio||1,2);
    for(const c of [phone,rain]){c.width=Math.round(width*dpr);c.height=Math.round(height*dpr);}
    ctx.setTransform(dpr,0,0,dpr,0,0);rc.setTransform(dpr,0,0,dpr,0,0);
    const scale=embedded?Math.max(width/1672,height/941):Math.min((height-76)/941,(width-28)/480);
    layout={scale,x:(width-1672*scale)/2,y:embedded?(height-941*scale)/2:Math.max(0,(height-76-941*scale)/2)};
    towelH=Math.max(122,Math.min(190,height*.23));towelW=towelH*540/1185;
    towel.style.width=towelW+'px';towel.style.height=towelH+'px';
    if(!pointer.active){pointer.x=width*.72;pointer.y=height*.5;}
    previous=null;placeTowel();dirty=true;
    // Resizing must not restart every particle at once.
    syncDrops();
  }
  function placeTowel(){towel.style.transform=`translate3d(${pointer.x-towelW/2}px,${pointer.y-towelH*.52}px,0)`;}
  function newDrop(){
    const baseSize=12+Math.pow(Math.random(),1.6)*43,h=baseSize*2*settings.size;
    const speed=100+Math.random()*160+baseSize*2;
    const count=Math.max(1,Math.floor(width/Math.max(70,110*settings.size)));
    while(lanes.length<count)lanes.push(0);
    const earliest=Math.min(...lanes.slice(0,count));
    const candidates=Array.from({length:count},(_,i)=>i).filter(i=>lanes[i]<=Math.max(rainTime,nextSpawn,earliest));
    const lane=candidates[Math.floor(Math.random()*candidates.length)];
    const spawnAt=Math.max(rainTime,nextSpawn,lanes[lane]);
    nextSpawn=spawnAt+.06+Math.random()*.12;
    lanes[lane]=spawnAt+Math.max(.85,h/speed*2)+Math.random()*.55;
    return {id:++spawnSerial,spawnAt,x:(lane+.2+Math.random()*.6)*width/count,y:-h-20,baseSize,h,speed,sprite:Math.floor(Math.random()*8),drift:-5+Math.random()*10};
  }
  function towelHit(x,y,pad=0){
    if(!pointer.active||!towelPixels)return false;
    const u=(x-pointer.x+towelW/2)/towelW,v=(y-pointer.y+towelH*.52)/towelH;
    if(u<0||u>=1||v<0||v>=1)return false;
    return towelPixels.data[(Math.floor(v*towelSprite.height)*towelSprite.width+Math.floor(u*towelSprite.width))*4+3]>48;
  }
  function wipe(a,b){
    const s=layout.scale,dist=Math.hypot(b.x-a.x,b.y-a.y),steps=Math.max(1,Math.ceil(dist/Math.max(3,towelW*.1)));
    const sx=layout.x+screen.x*s,sy=layout.y+screen.y*s;
    if(b.x+towelW/2>sx&&b.x-towelW/2<sx+screen.w*s&&b.y+towelH*.48>sy&&b.y-towelH*.52<sy+screen.h*s){
      if(dist>.05){
        const now=performance.now();
        if(now>=nextWipeSoundAt){
          window.SiteSounds?.play('wipe');
          nextWipeSoundAt=now+1100;
        }
        clearTimeout(wipeSoundTimer);wipeSoundTimer=setTimeout(stopWipeSound,130);
      }
    }else stopWipeSound();
    mc.save();screenPath(mc);mc.clip();
    // Stamp the towel's actual silhouette along the whole motion, including fast passes.
    for(let i=0;i<=steps;i++){
      const x=a.x+(b.x-a.x)*i/steps,y=a.y+(b.y-a.y)*i/steps;
      mc.drawImage(towelSprite,(x-towelW/2-layout.x)/s,(y-towelH*.52-layout.y)/s,towelW/s,towelH/s);
    }
    mc.restore();dirty=true;
  }
  function move(e){
    if(!ready||!activated)return;
    if(e.pointerType==='touch'&&e.type==='pointermove'&&e.buttons===0)return;
    const old=previous;pointer={x:e.clientX,y:e.clientY,active:true};scene.classList.remove('pointer-away');placeTowel();
    wipe(old||pointer,pointer);previous={...pointer};
    // Also clear drops swept up between pointer events.
    if(old){const dx=pointer.x-old.x,dy=pointer.y-old.y,n=Math.max(1,Math.ceil(Math.hypot(dx,dy)/8)),saved={...pointer};
      for(let k=0;k<=n;k++){pointer.x=old.x+dx*k/n;pointer.y=old.y+dy*k/n;for(const d of drops)if(towelHit(d.x,d.y)){Object.assign(d,newDrop());removed++;}}
      pointer=saved;
    }
  }
  function drawPhone(){
    ctx.clearRect(0,0,width,height);
    ctx.drawImage(assets[0],layout.x,layout.y,1672*layout.scale,941*layout.scale);
    vc.clearRect(0,0,1672,941);vc.globalCompositeOperation='source-over';vc.drawImage(assets[1],0,0,1672,941);
    vc.globalCompositeOperation='destination-in';vc.drawImage(mask,0,0);vc.globalCompositeOperation='source-over';
    ctx.drawImage(revealed,layout.x,layout.y,1672*layout.scale,941*layout.scale);dirty=false;
  }
  // A separate screen-shaped reference excludes the rounded corners from completion.
  const ref=document.createElement('canvas');ref.width=1672;ref.height=941;
  const refc=ref.getContext('2d');screenPath(refc);refc.fill();
  const reference=refc.getImageData(screen.x,screen.y,screen.w,screen.h).data;
  function updateProgress(){
    const data=mc.getImageData(screen.x,screen.y,screen.w,screen.h).data;
    let total=0,clean=0;
    for(let i=3;i<data.length;i+=4){if(reference[i]>250){total++;if(data[i]>245)clean++;}}
    coverage=clean/total;
    // Do not auto-reveal untouched areas, even when the percentage is nearly complete.
    const complete=clean===total;
    progress.textContent=(complete?100:Math.min(99,Math.floor(coverage*100)))+'%';
    if(complete){hint.textContent='画面已擦亮，向下滚动，走进街道。';phone.setAttribute('aria-label','已擦亮的手机，显示完整新闻画面');}
  }
  function frame(time){
    const dt=Math.min((time-lastTime)/1000||0,.035);lastTime=time;
    if(ready){if(dirty)drawPhone();if(!activated){requestAnimationFrame(frame);return;}if(time-lastProgress>250){updateProgress();lastProgress=time;}
      rainTime+=dt*settings.speed*(reduced.matches?.35:1);
      rc.clearRect(0,0,width,height);
      for(const d of drops){
        if(rainTime<d.spawnAt)continue;
        const oldY=d.y;d.y+=d.speed*dt*settings.speed*(reduced.matches?.35:1);d.x+=d.drift*dt*settings.speed;
        let hit=false;for(let y=oldY;y<=d.y;y+=3){if(towelHit(d.x,y)||towelHit(d.x,y-d.h*.4)){hit=true;break;}}
        if(hit){removed++;Object.assign(d,newDrop());continue;}
        if(d.y-d.h>height){Object.assign(d,newDrop());continue;}
        const im=dropSprites[d.sprite];rc.globalAlpha=.55+Math.min(d.baseSize/100,.4);rc.drawImage(im,d.x-d.h*im.width/im.height/2,d.y-d.h/2,d.h*im.width/im.height,d.h);
      }rc.globalAlpha=1;
    }requestAnimationFrame(frame);
  }
  function reset(){mc.clearRect(0,0,1672,941);coverage=0;progress.textContent='0%';previous=null;dirty=true;hint.textContent=matchMedia('(pointer:coarse)').matches?'用手指滑动毛巾，擦出屏幕里的画面':'移动毛巾，擦出屏幕里的画面';phone.setAttribute('aria-label','空白手机，擦过的位置逐渐显现新闻画面');}
  scene.addEventListener('pointermove',move);
  scene.addEventListener('pointerdown',e=>{scene.focus({preventScroll:true});if(e.pointerType!=='mouse')scene.setPointerCapture(e.pointerId);move(e);});
  const leave=()=>{stopWipeSound();previous=null;pointer.active=false;scene.classList.add('pointer-away');};
  scene.addEventListener('pointerleave',leave);scene.addEventListener('pointercancel',leave);
  scene.addEventListener('pointerup',e=>{if(e.pointerType!=='mouse')leave();});window.addEventListener('blur',leave);
  scene.addEventListener('keydown',e=>{if(!ready)return;const offsets={ArrowLeft:[-18,0],ArrowRight:[18,0],ArrowUp:[0,-18],ArrowDown:[0,18]};if(offsets[e.key]){e.preventDefault();const [dx,dy]=offsets[e.key];move({clientX:Math.max(0,Math.min(width,pointer.x+dx)),clientY:Math.max(0,Math.min(height,pointer.y+dy))});}});
  document.querySelector('#reset').addEventListener('click',reset);window.addEventListener('resize',resize);
  Promise.all([embedded?'phone-entry.png':'phone-empty.png','phone-revealed.png','towel.png',...Array.from({length:8},(_,i)=>`drop-${i+2}.png`)].map(n=>load('assets/'+n))).then(images=>{
    assets=images;towelSprite=sprite(images[2],{x:337,y:110,w:540,h:1185});
    towel.width=540;towel.height=1185;towel.getContext('2d').drawImage(towelSprite,0,0);
    towelPixels=towelSprite.getContext('2d').getImageData(0,0,540,1185);
    dropSprites=images.slice(3).map(tightSprite);ready=true;resize();reset();scene.classList.add('ready');
    drawPhone();
    if(parent!==window)requestAnimationFrame(()=>requestAnimationFrame(()=>parent.postMessage({type:'rain:ready'},'*')));
  }).catch(err=>{hint.textContent='素材未能加载，请刷新页面重试。';console.error(err);});
  resize();requestAnimationFrame(frame);
  addEventListener('message',event=>{
    if(!embedded||event.source!==parent)return;
    if(event.data?.type==='rain:activate'&&!activated){activated=true;resize();drawPhone();document.documentElement.classList.add('rain-active');scene.focus({preventScroll:true});}
    if(event.data?.type==='rain:hold'){activated=false;reset();drawPhone();document.documentElement.classList.remove('rain-active');rc.clearRect(0,0,width,height);}
  });
  if(new URLSearchParams(location.search).get('entry')==='graduation')addEventListener('keydown',event=>{
    if(event.key==='Escape'&&editor.hidden){event.preventDefault();parent.postMessage({type:'rain:back'},'*');}
  });
  window.rainPhone={getState:()=>({ready,activated,rainTime,coverage,removed,drops:drops.length,settings:{...settings},particles:drops.map(d=>({id:d.id,spawnAt:d.spawnAt,x:d.x,y:d.y,h:d.h})),layout:{...layout},screen:{...screen},towelW,towelH}),reset};
})();
