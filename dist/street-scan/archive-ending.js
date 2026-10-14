import {createMemoryCardTransition} from './memory-card-transition.js';
// The ending is built from the user's separate paper objects, not a flattened screenshot.
export function createArchiveEnding({state,assets,source,lock}){
 const root=document.createElement('section');root.id='archive-ending';root.hidden=true;root.setAttribute('aria-label','Riverside personal archive');
 const pieces=[
  ['map','Neighborhood map',356,94,441,269,2],
  ['handbook-crop','Student handbook',578,311,263,221,3,'handbook'],
  ['news','Riverside Daily',1070,577,378,241,2],
  ['file','Personal archive',910,80,490,692,4],
  ['portrait','Portrait photograph',914,373,132,141,5],
  ['id','Student ID',350,382,272,275,5],
  ['ticket','City bus ticket',581,674,269,152,5]
 ];
 root.innerHTML='<div class="archive-stage"><img class="archive-folder" alt="" draggable="false"><div class="archive-sun" aria-hidden="true"></div><div class="archive-shadows" aria-hidden="true"></div></div><div class="archive-lightbox" role="dialog" aria-modal="true" aria-label="Archive item" hidden><button class="archive-close" aria-label="Close image">×</button><img alt=""></div>';
 document.body.append(root);root.style.backgroundImage=`url("${assets['archive-desk']}")`;const stage=root.querySelector('.archive-stage');stage.querySelector('.archive-folder').src=assets['archive-folder'];
 const lightbox=root.querySelector('.archive-lightbox'),preview=lightbox.querySelector('img');let previousFocus=null;
 const cardTransition=createMemoryCardTransition({scene:root,canStart:()=>complete&&lightbox.hidden});
 for(const [key,label,x,y,w,h,z,full]of pieces){const b=document.createElement('button');b.className='archive-object';b.dataset.archive=key;b.setAttribute('aria-label',label);b.style.cssText=`left:${x/17.74}%;top:${y/8.87}%;width:${w/17.74}%;height:${h/8.87}%;z-index:${z}`;const im=new Image();im.src=assets['archive-'+key];im.alt=label;im.draggable=false;b.append(im);b.onclick=()=>{previousFocus=b;preview.src=assets['archive-'+(full||key)];preview.alt=label;lightbox.hidden=false;lightbox.querySelector('button').focus()};stage.append(b)}
 function close(){lightbox.hidden=true;previousFocus?.focus()}
 lightbox.querySelector('button').onclick=close;lightbox.onclick=e=>{if(e.target===lightbox)close()};
 root.addEventListener('keydown',e=>{if(e.key==='Escape'&&!lightbox.hidden){e.preventDefault();close()}if(e.key==='Tab'&&!lightbox.hidden){e.preventDefault();lightbox.querySelector('button').focus()}});
 const snapshot=document.createElement('canvas'),ctx=snapshot.getContext('2d');snapshot.id='archive-dissolve';snapshot.hidden=true;document.body.append(snapshot);
 const saved=document.createElement('canvas'),savedCtx=saved.getContext('2d');
 const field=document.createElement('canvas'),mask=document.createElement('canvas'),maskCtx=mask.getContext('2d');field.width=mask.width=240;field.height=mask.height=140;
 const noise=new Float32Array(240*140);let min=Infinity,max=-Infinity;
 const hash=(x,y)=>{const n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n)};
 function smoothNoise(x,y){const ix=Math.floor(x),iy=Math.floor(y),tx=x-ix,ty=y-iy,u=tx*tx*(3-2*tx),v=ty*ty*(3-2*ty);return (hash(ix,iy)*(1-u)+hash(ix+1,iy)*u)*(1-v)+(hash(ix,iy+1)*(1-u)+hash(ix+1,iy+1)*u)*v}
 for(let y=0;y<140;y++)for(let x=0;x<240;x++){const value=smoothNoise(x/58,y/58)*.65+smoothNoise(x/25+7,y/25+3)*.25+smoothNoise(x/11,y/11)*.10;noise[y*240+x]=value;min=Math.min(min,value);max=Math.max(max,value)}
 for(let i=0;i<noise.length;i++)noise[i]=(noise[i]-min)/(max-min);
 const maskPixels=maskCtx.createImageData(240,140);
 let target=0,progress=0,started=false,complete=false,ready=false,raf=0,last=0;
 const readyPromise=Promise.all(Object.keys(assets).filter(k=>k.startsWith('archive-')).map(k=>{const im=new Image();im.src=assets[k];return im.decode()})).then(()=>{ready=true});readyPromise.catch(console.error);
 function start(){if(started)return;started=true;cardTransition.prepare();state.ending=true;state.charging=false;lock();root.hidden=false;root.classList.add('revealing');snapshot.width=saved.width=innerWidth;snapshot.height=saved.height=innerHeight;savedCtx.imageSmoothingEnabled=false;savedCtx.drawImage(source(),0,0,saved.width,saved.height);snapshot.hidden=false;document.body.classList.add('archive-exiting');paint();}
 function paint(){const w=innerWidth,h=innerHeight;if(snapshot.width!==w||snapshot.height!==h){snapshot.width=w;snapshot.height=h}const data=maskPixels.data,threshold=progress*1.16-.08;for(let i=0;i<noise.length;i++){const t=Math.max(0,Math.min(1,(threshold-noise[i])/.065));data[i*4+3]=Math.round(t*t*(3-2*t)*255)}maskCtx.putImageData(maskPixels,0,0);ctx.globalCompositeOperation='source-over';ctx.clearRect(0,0,w,h);ctx.imageSmoothingEnabled=false;ctx.drawImage(saved,0,0,w,h);ctx.globalCompositeOperation='destination-out';ctx.imageSmoothingEnabled=true;ctx.drawImage(mask,0,0,w,h);ctx.globalCompositeOperation='source-over';snapshot.dataset.progress=String(progress)}
 function animate(ms){const dt=Math.min(.05,(ms-last)/1000||.016);last=ms;progress+=(target-progress)*(1-Math.exp(-dt*10));if(target===1&&progress>.997)progress=1;paint();if(progress===1){complete=true;cardTransition.enable();state.endingComplete=true;snapshot.hidden=true;root.classList.remove('revealing');root.tabIndex=-1;root.focus({preventScroll:true});raf=0;return}if(Math.abs(target-progress)>.0005)raf=requestAnimationFrame(animate);else raf=0;}
 function scroll(delta){if(!ready||complete||state.sceneStyle!=='pixel'||state.transitioning)return false;if(!started&&delta<=0)return false;start();target=Math.max(0,Math.min(1,target+delta/1800));if(!raf){last=performance.now();raf=requestAnimationFrame(animate)}return true}
 addEventListener('wheel',e=>{if(state.sceneStyle!=='pixel'||state.transitioning||complete)return;e.preventDefault();e.stopImmediatePropagation();scroll(e.deltaY*(e.deltaMode===1?20:e.deltaMode===2?innerHeight:1))},{passive:false,capture:true});
 let touchY=null;addEventListener('touchstart',e=>{if(state.sceneStyle==='pixel'&&!complete)touchY=e.touches[0]?.clientY},{passive:true});addEventListener('touchmove',e=>{if(touchY===null||complete)return;const y=e.touches[0].clientY;if(scroll((touchY-y)*3)){e.preventDefault();e.stopImmediatePropagation()}touchY=y},{passive:false,capture:true});addEventListener('touchend',()=>touchY=null);
 return {root,cardTransition,ready:readyPromise,scroll,get progress(){return progress},get complete(){return complete}};
}
