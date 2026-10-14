import * as THREE from 'three';
import starImageUrl from './assets/game/memory-star.png';

// Anchored to the upper-right end of the street banner, independent of the player.
export function createMemoryStar({root,state,camera,app,bridge,layers,lock,reduced}){
 const starImage=new Image();starImage.src=starImageUrl;
 const anchor=new THREE.Vector3(-1.65,3.05,-19.1),projected=new THREE.Vector3();

 const button=document.createElement('button');button.id='memory-star';button.className='game-click';button.hidden=true;button.setAttribute('aria-label','Hold to reveal color point cloud');
 const art=document.createElement('canvas');art.width=96;art.height=96;art.setAttribute('aria-hidden','true');button.append(art);root.append(button);const pen=art.getContext('2d');
 const pixel=document.createElement('canvas');pixel.id='memory-pixel-scene';pixel.hidden=true;document.body.append(pixel);const paint=pixel.getContext('2d',{willReadFrequently:true});
 const wipe=document.createElement('canvas');wipe.id='memory-star-wipe';wipe.hidden=true;document.body.append(wipe);const wc=wipe.getContext('2d');
 const snapshot=document.createElement('canvas');const sc=snapshot.getContext('2d');
 // Illustrated pixel ramps: cool ink shadows, chromatic midtones, warm highlights.
 const ramps=[
 '172238 29364b 435069 63758a 8f9fae c4cdd0 f2ead8',
 '272338 493449 704654 9b5b60 c67b72 e5aa94 f5d6b6',
 '2b2435 59303e 8f3b43 be4e48 e57350 f8a66a ffdb99',
 '272638 4c3b43 775341 a47a49 c6a15e e5ca82 f8e6b1',
 '1c2b37 354a45 536646 798447 a5ac55 ccd579 eff0ab',
 '182c3b 274944 3a6a53 569573 7fba95 b1d8b5 e3edcd',
 '17273d 26465c 346d80 4b98a1 78bec0 b4dfd3 e6f0da',
 '20273e 354566 4c6c94 7196b6 a0bdcf ccdcdf f0eddb'
 ];
 const artPalette=ramps.flatMap(row=>row.split(' ')).map(hex=>[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)));
 const artLUT=new Uint8Array(32768*3);
 for(let key=0;key<32768;key++){const rgb=[key>>10,(key>>5)&31,key&31].map(v=>v*255/31);let best=artPalette[0],score=Infinity;for(const c of artPalette){const delta=(rgb[0]-c[0])**2*.85+(rgb[1]-c[1])**2*1.15+(rgb[2]-c[2])**2;if(delta<score){score=delta;best=c}}artLUT.set(best,key*3)}
 let sharpSource=new Uint8ClampedArray(0);
 let luminance=new Float64Array(0);
 const rgb=[0,0,0],ditherPattern=[0,2,3,1];
 const HOLD_MS=900,REVEAL_MS=1400;let origin={x:.5,y:.5};
 let lastUpdate=0,charge=0,spring=1,velocity=0,releaseAt=-10000;
 let mode='gaussian',holding=false,holdStart=0,transition=null,unlocked=false,lastPaint=0,ignoreClick=false;
 state.sceneStyle=mode;state.transitioning=false;
 const blocked=()=>mode==='pixel'||state.ending||state.dialog||state.inspect||state.album||state.drawer||state.editor||state.lensEditor||state.busy||state.transitioning;
 const clamp=v=>Math.max(0,Math.min(1,v));
 function shake(ms,strength){button.dataset.shake=String(strength);}
 function draw(ms,dt){
  const burst=Math.max(0,1-(ms-releaseAt)/700);const target=1;
  velocity+=(target-spring)*180*dt;velocity*=Math.exp(-12*dt);spring+=velocity*dt;if(reduced){spring=1;velocity=0}
  pen.clearRect(0,0,96,96);const jitter=0;pen.save();pen.translate(Math.sin(ms*.045)*jitter,Math.cos(ms*.061)*jitter);const angle=reduced?0:ms*.00038,scale=1;
  const block=(x,y,size=2)=>{pen.fillRect(Math.round(x/2)*2,Math.round(y/2)*2,size,size)};
  pen.fillStyle=charge>.05||burst>0?'#fff4bd':'#efc56b';pen.globalAlpha=reduced?1:.8+Math.sin(ms*.004)*.2;
  if(starImage.complete&&starImage.naturalWidth){pen.save();pen.translate(48,48);pen.rotate(angle);pen.scale(scale,scale);pen.imageSmoothingEnabled=false;const width=60,height=width*starImage.naturalHeight/starImage.naturalWidth;pen.drawImage(starImage,-width/2,-height/2,width,height);pen.restore()}
  for(let n=0;n<5;n++){const t=n*Math.PI*2/5+(reduced?0:ms*.00023),radius=(35+Math.sin(ms*.0018+n)*4)*(1-charge*.55),x=48+Math.cos(t)*radius,y=48+Math.sin(t)*radius;pen.globalAlpha=reduced?.9:.35+.65*Math.sin(ms*.003+n*1.8)**2;const size=n%2?2:3;block(x,y,size);block(x-5,y,size);block(x+5,y,size);block(x,y-5,size);block(x,y+5,size)}
  if(charge>.01){pen.fillStyle='#fff8da';for(let i=0;i<12;i++){const t=i*2.399+ms*.0015,travel=(ms*.0012+i*.17)%1,r=(42-travel*28)*(1-charge*.22);pen.globalAlpha=charge*(1-travel);block(48+Math.cos(t)*r,48+Math.sin(t)*r,2)}}
  pen.restore();pen.globalAlpha=1;
  const ring=holding?clamp((ms-holdStart)/HOLD_MS):0;button.dataset.ring=String(ring);
  if(ring>0){pen.fillStyle='#ffcc65';for(let i=0;i<=Math.floor(ring*180);i++){const a=-Math.PI/2+i/180*Math.PI*2;pen.fillRect(Math.round((48+Math.cos(a)*39)/2)*2-1,Math.round((48+Math.sin(a)*39)/2)*2-1,2,2)}}
  button.style.filter='drop-shadow(0 1px 2px #302312) drop-shadow(0 0 '+(2+charge*11+burst*8)+'px #eec16b)';button.dataset.charge=String(charge);
 }
 function cancel(){holding=false;state.charging=false;button.classList.remove('holding');if(!state.transitioning){shake(0,0);wipe.hidden=true}}
 function begin(clientX,clientY){if(blocked()||!unlocked||holding)return;const rect=button.getBoundingClientRect();origin={x:(clientX??rect.left+rect.width/2)/innerWidth,y:(clientY??rect.top+rect.height/2)/innerHeight};holding=true;state.charging=true;holdStart=performance.now();ignoreClick=false;lock();button.classList.add('holding')}
 function composite(ctx,w,h){ctx.clearRect(0,0,w,h);for(const layer of layers())ctx.drawImage(layer,0,0,w,h)}
 function renderPixel(ms,force=false){
  if(!force&&ms-lastPaint<33)return;lastPaint=ms;
  const w=Math.max(1,Math.ceil(innerWidth/2)),h=Math.max(1,Math.ceil(innerHeight/2));
  if(pixel.width!==w||pixel.height!==h){pixel.width=w;pixel.height=h;sharpSource=new Uint8ClampedArray(w*h*4)}
  paint.imageSmoothingEnabled=true;paint.imageSmoothingQuality='high';composite(paint,w,h);
  const image=paint.getImageData(0,0,w,h),d=image.data;sharpSource.set(d);const src=sharpSource;
  // Keep the two-pixel grid. Smooth only similar colors, then ink the dark side of major contours.
  // Float64 keeps the original JS arithmetic and thresholds exactly; reuse
  // each pixel's luminance instead of calculating it for every channel/neighbor.
  if(luminance.length!==w*h)luminance=new Float64Array(w*h);
  for(let p=0,i=0;p<luminance.length;p++,i+=4)luminance[p]=src[i]*.299+src[i+1]*.587+src[i+2]*.114;
  const luma=i=>luminance[i/4];
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const i=(y*w+x)*4,left=x?i-4:i,right=x<w-1?i+4:i,up=y?i-w*4:i,down=y<h-1?i+w*4:i,L=luma(i);
   const ll=luma(left),lr=luma(right),lu=luma(up),ld=luma(down);
   const bright=Math.max(L,ll,lr,lu,ld),dark=Math.min(L,ll,lr,lu,ld);
   const al=Math.abs(ll-L)<22,ar=Math.abs(lr-L)<22,au=Math.abs(lu-L)<22,ad=Math.abs(ld-L)<22;
   const weight=4+al+ar+au+ad;
   const outline=bright-L>42&&L<150&&bright-dark>64;
   for(let c=0;c<3;c++){let total=src[i+c]*4;if(al)total+=src[left+c];if(ar)total+=src[right+c];if(au)total+=src[up+c];if(ad)total+=src[down+c];const smooth=total/weight,detail=src[i+c]-smooth;rgb[c]=smooth+detail*.4}
   const lum=rgb[0]*.299+rgb[1]*.587+rgb[2]*.114,dither=(ditherPattern[(y%2)*2+x%2]-1.5)*2.2;
   for(let c=0;c<3;c++){let v=lum+(rgb[c]-lum)*1.28;v=v*.92+14+dither;if(outline)v=v*.72;rgb[c]=Math.max(0,Math.min(31,Math.round(v*31/255)))}
   const k=((rgb[0]<<10)|(rgb[1]<<5)|rgb[2])*3;d[i]=artLUT[k];d[i+1]=artLUT[k+1];d[i+2]=artLUT[k+2];d[i+3]=255;
  }
  paint.putImageData(image,0,0);
 }
 function chargeWave(ms){const p=clamp((ms-holdStart)/HOLD_MS),w=innerWidth,h=innerHeight;if(wipe.width!==w||wipe.height!==h){wipe.width=w;wipe.height=h}wipe.hidden=false;wipe.dataset.phase='charging';wipe.dataset.originX=String(origin.x);wipe.dataset.originY=String(origin.y);wc.clearRect(0,0,w,h);wc.globalCompositeOperation='source-over';wc.globalAlpha=1;const x=origin.x*w,y=origin.y*h,r=45*p*p*(3-2*p);wc.save();wc.strokeStyle='#ffe6a2';wc.lineWidth=2;wc.shadowColor='#ffe6a2';wc.shadowBlur=reduced?0:9;wavePath(x,y,r,ms,reduced?0:2*p);wc.stroke();wc.restore();for(let i=0;i<16;i++){const a=i*2.399+ms*.002,rr=r+10+((ms*.04+i*7)%22)*(1-p);wc.globalAlpha=p*.7;wc.fillStyle='#fff0c4';wc.fillRect(x+Math.cos(a)*rr,y+Math.sin(a)*rr,2,2)}wc.globalAlpha=1;}
 function change(next){if(blocked()||!unlocked)return;cancel();lock();releaseAt=performance.now();const x=origin.x*innerWidth,y=origin.y*innerHeight;snapshot.width=wipe.width=innerWidth;snapshot.height=wipe.height=innerHeight;
  if(mode==='pixel'){sc.imageSmoothingEnabled=false;sc.drawImage(pixel,0,0,innerWidth,innerHeight)}else composite(sc,innerWidth,innerHeight);
  state.transitioning=true;wipe.dataset.phase='revealing';wipe.dataset.progress='0';wipe.hidden=false;wc.drawImage(snapshot,0,0);bridge.setPointCloud(next==='points');mode=next;state.sceneStyle=mode;pixel.hidden=mode!=='pixel';
  button.setAttribute('aria-label',mode==='points'?'Hold to reveal pixel world':mode==='pixel'?'Hold to reveal color point cloud':'Hold to reveal color point cloud');
  app.once('frameend',()=>{if(mode==='pixel')renderPixel(performance.now(),true);releaseAt=performance.now();transition={start:releaseAt,x:x/innerWidth,y:y/innerHeight};});app.renderNextFrame=true;
 }
 // The same rippled front masks the old image and carries the release energy.
 function wavePath(x,y,r,ms,amplitude){wc.beginPath();for(let i=0;i<=180;i++){const a=i/180*Math.PI*2,noise=Math.sin(a*9+ms*.006)*.48+Math.sin(a*17-ms*.004)*.3+Math.sin(a*31+ms*.003)*.22,rr=Math.max(0,r+noise*amplitude),px=x+Math.cos(a)*rr,py=y+Math.sin(a)*rr;if(i===0)wc.moveTo(px,py);else wc.lineTo(px,py)}wc.closePath()}
 function ripple(ms){const t=clamp((ms-transition.start)/(reduced?240:REVEAL_MS));wipe.dataset.progress=String(t);const w=innerWidth,h=innerHeight;if(wipe.width!==w||wipe.height!==h){wipe.width=w;wipe.height=h}const x=transition.x*w,y=transition.y*h,max=Math.hypot(Math.max(x,w-x),Math.max(y,h-y))+70;
  // Zero initial velocity, acceleration out of the star, then a gentle settling tail.
  const u=clamp(t/.92),spread=u*u*(3-2*u),r=45+(max-45)*spread,energy=Math.sin(Math.PI*t)**.7,amplitude=reduced?0:Math.min(16,r*.055)*energy;
  wc.globalCompositeOperation='source-over';wc.globalAlpha=1;wc.clearRect(0,0,w,h);wc.drawImage(snapshot,0,0,w,h);
  wc.globalCompositeOperation='destination-out';wc.fillStyle='#000';wc.save();wc.filter=reduced?'none':'blur(10px)';wavePath(x,y,r,ms,amplitude);wc.fill();wc.restore();wc.globalCompositeOperation='source-over';
  if(t<1&&!reduced){
   // Soft crest plus smaller trailing ripples, without a hard circular outline.
   for(let n=0;n<3;n++){wc.save();wc.globalAlpha=(1-t)*energy*(n===0?.65:.2);wc.strokeStyle=n===0?'#fff6ca':'#acdcd6';wc.lineWidth=n===0?3:1.5;wc.shadowColor='#fff2c0';wc.shadowBlur=n===0?14:4;wavePath(x,y,Math.max(0,r-n*24*energy),ms-n*60,amplitude);wc.stroke();wc.restore()}
   for(let i=0;i<60;i++){const a=i*2.399963,rr=r+Math.sin(i*7.1+ms*.003)*20*energy,px=x+Math.cos(a)*rr,py=y+Math.sin(a)*rr,size=2+(i%3);wc.globalAlpha=energy*(1-t)*(.3+(i%5)*.13);wc.fillStyle=i%3?'#fff1b8':'#b4e6e2';wc.fillRect(px,py,size,size)}wc.globalAlpha=1;
   const light=wc.createRadialGradient(x,y,0,x,y,Math.max(1,100*(1-t)));light.addColorStop(0,'rgba(255,242,195,'+(.18*(1-t)**3)+')');light.addColorStop(1,'rgba(255,242,195,0)');wc.fillStyle=light;wc.fillRect(0,0,w,h);
  }
  shake(ms,reduced?0:2.6*Math.exp(-t*5)*(1-t));
  if(t>=1){transition=null;wipe.hidden=true;state.transitioning=false;shake(0,0);lock()}
 }
 button.addEventListener('pointerdown',e=>{if(e.button!==0||blocked())return;e.preventDefault();button.setPointerCapture(e.pointerId);begin(e.clientX,e.clientY)});
 button.addEventListener('pointerup',cancel);button.addEventListener('pointercancel',cancel);button.addEventListener('lostpointercapture',cancel);button.addEventListener('pointerleave',cancel);addEventListener('blur',cancel);
 button.addEventListener('click',e=>{e.preventDefault();ignoreClick=false;});
 button.addEventListener('keydown',e=>{if(!['Space','Enter'].includes(e.code))return;e.preventDefault();if(e.repeat||blocked())return;begin()});button.addEventListener('keyup',e=>{if(['Space','Enter'].includes(e.code)){e.preventDefault();cancel()}});
 function update(ms){const dt=Math.min(.04,Math.max(0,(ms-lastUpdate)/1000));lastUpdate=ms;unlocked=['chess','envelope','student'].every(k=>state.items.includes(k));projected.copy(anchor).project(camera);const visible=state.active&&unlocked&&!(mode==='pixel'&&!state.transitioning)&&!state.ending&&projected.z>-1&&projected.z<1&&Math.abs(projected.x)<1.1&&Math.abs(projected.y)<1.1&&!state.dialog&&!state.inspect&&!state.album&&!state.drawer&&!state.editor&&!state.lensEditor;
  button.hidden=!visible;if(!visible)cancel();if(visible){button.style.left=((projected.x+1)*innerWidth/2)+'px';button.style.top=((1-projected.y)*innerHeight/2)+'px';const size=THREE.MathUtils.clamp(850/camera.position.distanceTo(anchor),36,118);button.style.width=button.style.height=size+'px';const target=holding?clamp((ms-holdStart)/HOLD_MS):0;charge+=(target-charge)*Math.min(1,dt*18);draw(ms,dt);if(holding){shake(ms,reduced?0:charge*charge*1.8);if(target>=1){ignoreClick=true;change(mode==='points'?'pixel':'points')}}}
  if(mode==='pixel')renderPixel(ms);if(holding&&!state.transitioning)chargeWave(ms);if(transition)ripple(ms);
 }
 return {update,anchor,button,pixel,get mode(){return mode},get unlocked(){return unlocked},photoLayers:()=>mode==='pixel'?[pixel]:layers()};
}
