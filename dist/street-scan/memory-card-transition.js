import {gsap} from 'gsap';

// Keep the live scene and its paper mount in one transformed containing block.
export function createMemoryCardTransition({scene,canStart}){
 const host=document.createElement('section');host.id='memory-card-transition';
 host.innerHTML='<iframe class="memory-next-scene" title="人物与童年回忆" tabindex="-1"></iframe><div class="memory-scene-card"><div class="memory-card-mount" aria-hidden="true"></div></div>';
 scene.before(host);const card=host.querySelector('.memory-scene-card'),mount=host.querySelector('.memory-card-mount'),frame=host.querySelector('iframe');card.prepend(scene);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const playhead={p:0};let target=0,prepared=false,ready=false,enabled=false,tween=null,settled=0,timeout,pendingDelta=0;
 const base=new URL(document.baseURI),destination=new URL(base.pathname.includes('/street-scan/')?'../credits.html?memoryCard=1':'./credits.html?memoryCard=1',base);
 const targetOrigin=destination.protocol==='file:'?'*':destination.origin;
 const clamp=gsap.utils.clamp(0,1);
 function paint(){
  const p=playhead.p,border=clamp(p/.20),travel=p<.20?0:p<.36?(p-.20)/.16*.14:.14+((p-.36)/.64)*1.03;
  gsap.set(card,{yPercent:-travel*100,scale:1-border*.045,rotation:reduced?0:-Math.sin(clamp((p-.32)/.68)*Math.PI)*1.1,transformOrigin:'50% 48%'});
  mount.style.setProperty('--mount',border);host.dataset.progress=p.toFixed(4);
  const done=p>=.999;card.inert=done;frame.inert=!done;frame.style.pointerEvents=done?'auto':'none';

 }
 const timeline=gsap.timeline({paused:true}).to(playhead,{p:1,duration:1,ease:'none',onUpdate:paint});
 function move(next,snap=false){target=clamp(next);tween?.kill();host.classList.add('active');
  tween=gsap.to(timeline,{progress:target,duration:reduced?.16:snap?.48:.24,ease:snap?'power3.inOut':'power2.out',onComplete(){settled=performance.now();if(target===1){frame.tabIndex=0;frame.contentWindow.postMessage({type:'memory-card-active'},targetOrigin)}else if(target===0){host.classList.remove('active');paint()}}});
 }
 function prepare(){if(prepared)return;prepared=true;frame.src=destination.href;clearTimeout(timeout);timeout=setTimeout(()=>{if(!ready)prepared=false},15000)}
 function enable(){enabled=true;prepare();paint()}
 function scroll(delta){
  if(!enabled||!canStart()||!delta)return false;
  if(!ready){pendingDelta=Math.max(0,Math.min(1500,pendingDelta+delta));prepare();return true}
  if(target===1&&delta>0){if(playhead.p>=.999)frame.contentWindow.postMessage({type:'memory-card-scroll',delta},targetOrigin);return true}
  if(delta<0&&target===1){move(.24,true);return true}
  const next=clamp(target+delta/1500);
  move(delta>0&&next>=.36?1:next,delta>0&&next>=.36);return true;
 }
 addEventListener('message',e=>{if(e.source!==frame.contentWindow||(destination.protocol!=='file:'&&e.origin!==destination.origin))return;
  if(e.data?.type==='memory-card-ready'){ready=true;clearTimeout(timeout);paint();if(pendingDelta){const delta=pendingDelta;pendingDelta=0;scroll(delta)}}
  if(e.data?.type==='memory-card-back'&&playhead.p>.99&&performance.now()-settled>200)scroll(-240);
 });
 addEventListener('wheel',e=>{if(scroll(e.deltaY*(e.deltaMode===1?20:e.deltaMode===2?innerHeight:1))){e.preventDefault();e.stopImmediatePropagation()}},{passive:false,capture:true});
 let touchY=null;addEventListener('touchstart',e=>{touchY=e.touches[0]?.clientY},{passive:true});
 addEventListener('touchmove',e=>{const y=e.touches[0]?.clientY;if(touchY!==null&&scroll((touchY-y)*2)){e.preventDefault();e.stopImmediatePropagation()}touchY=y},{passive:false,capture:true});addEventListener('touchend',()=>touchY=null);
 addEventListener('keydown',e=>{if(e.target.closest('button,input,textarea')||!enabled)return;const delta=['ArrowDown','PageDown','Space'].includes(e.code)?240:['ArrowUp','PageUp'].includes(e.code)?-240:0;if(delta&&scroll(delta)){e.preventDefault();e.stopImmediatePropagation()}},{capture:true});
 paint();return {prepare,enable,scroll,get progress(){return playhead.p},get ready(){return ready}};
}
