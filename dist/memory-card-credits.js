(() => {
 if(window.parent===window||new URLSearchParams(location.search).get('memoryCard')!=='1')return;
 const send=type=>parent.postMessage({type},'*');
 // The host checks this frame's identity and origin; this bridge only signals navigation.
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>send('memory-card-ready'),{once:true});
 else send('memory-card-ready');
 addEventListener('message',e=>{if(e.source===parent&&e.data?.type==='memory-card-active'){window.scrollTo(0,0);document.body.focus({preventScroll:true})}});
 addEventListener('message',e=>{if(e.source===parent&&e.data?.type==='memory-card-scroll'&&Number.isFinite(e.data.delta))window.scrollBy(0,e.data.delta)});
 const back=e=>{e.preventDefault();send('memory-card-back')};
 addEventListener('wheel',e=>{if(scrollY<=2&&e.deltaY<0)back(e)},{passive:false});
 let y=null;addEventListener('touchstart',e=>y=e.touches[0]?.clientY,{passive:true});
 addEventListener('touchmove',e=>{const next=e.touches[0]?.clientY;if(y!==null&&next-y>4&&scrollY<=2)back(e);y=next},{passive:false});
 addEventListener('keydown',e=>{if(scrollY<=2&&['ArrowUp','PageUp'].includes(e.code))back(e)});
})();
