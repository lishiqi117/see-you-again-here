(() => {
 if(new URLSearchParams(location.search).get('entry')!=='school'||parent===window)return;
 window.__skyHandoffHolding=true;
 document.documentElement.classList.add('school-entry');
 const scene=document.querySelector('.scene'),frame=document.createElement('div');frame.className='school-entry-frame';scene.before(frame);frame.append(scene);
 const style=document.createElement('style');style.textContent=`
 html.school-entry {scrollbar-width:none;} html.school-entry::-webkit-scrollbar {display:none;}
 .school-entry-frame {position:relative;height:100dvh;overflow:visible;background:transparent;}
 .school-entry .scene {position:absolute;min-height:0;margin:0;background:transparent;transform-origin:0 0;}
 .school-entry #study-chapter {margin-top:12vh!important;}
 `;document.head.append(style);
 let target=0,progress=0,raf=0,activated=false,touchY=null,started=0,from=0,returning=false;
 const clamp=n=>Math.max(0,Math.min(1,n));
 function hold(value){if(window.__skyHandoffHolding===value)return;window.__skyHandoffHolding=value;document.dispatchEvent(new Event('sky-handoff-change'));}
 function layout(){
  // Match the video's 16:9 coordinate system and its centered cover crop.
  const scale=Math.max(innerWidth/1920,innerHeight/1080);
  Object.assign(scene.style,{width:'1920px',height:'1080px',left:((innerWidth-1920*scale)/2)+'px',top:((innerHeight-1080*scale)/2)+'px',transform:`scale(${scale})`});
  window.__skyEntry={progress,target,active:activated};
  if(window.__paintSkyEntryObjects)window.__paintSkyEntryObjects();
  else scene.dispatchEvent(new Event('scene-layout-change'));
  hold(!activated||progress<1);
 }
 // Keep the same coordinate system when entering and when editing.
 function tick(now){
  raf=0;
  const t=clamp((now-started)/1100),ease=t*t*t*(t*(t*6-15)+10);
  progress=from+(target-from)*ease;
  layout();
  if(t<1)raf=requestAnimationFrame(tick);
  else if(returning){returning=false;parent.postMessage({type:'sky:back'},'*');}
 }
 function moveTo(value){cancelAnimationFrame(raf);from=progress;target=value;started=performance.now();raf=requestAnimationFrame(tick);}
 addEventListener('resize',layout);layout();
 addEventListener('message',event=>{
  if(event.source!==parent)return;
  if(event.data?.type==='school:activate'){activated=true;returning=false;moveTo(1);}
  if(event.data?.type==='school:reset'){activated=false;returning=false;target=progress=0;cancelAnimationFrame(raf);raf=0;hold(true);document.querySelectorAll('dialog[open]').forEach(dialog=>dialog.close());scrollTo(0,0);layout();}
 });
 function consume(delta){
  if(!activated)return true;
  if(document.querySelector('dialog[open]')||document.body.classList.contains('editing'))return false;
  if(scrollY>0)return false;
  if(delta<0){activated=false;returning=true;hold(true);moveTo(0);return true;}
  if(progress<1)return true;
  return false;
 }
 addEventListener('wheel',event=>{if(event.ctrlKey)return;const unit=event.deltaMode===1?16:event.deltaMode===2?innerHeight:1;if(consume(event.deltaY*unit)){event.preventDefault();event.stopImmediatePropagation();}},{passive:false,capture:true});
 addEventListener('touchstart',event=>{touchY=event.touches[0]?.clientY??null;},{passive:true});
 addEventListener('touchmove',event=>{if(touchY===null)return;const y=event.touches[0].clientY;if(consume((touchY-y)*2))event.preventDefault();touchY=y;},{passive:false});
 addEventListener('keydown',event=>{if(event.key==='Escape'&&!document.querySelector('dialog[open]'))parent.postMessage({type:'sky:exit'},'*');});
 addEventListener('load',async()=>{
  await Promise.all([...document.images].map(image=>image.decode().catch(()=>{})));
  const sky=new Image();sky.src='assets/sky.webp';await sky.decode().catch(()=>{});await document.fonts.ready;
  requestAnimationFrame(()=>requestAnimationFrame(()=>parent.postMessage({type:'sky:ready'},'*')));
 });
})();
