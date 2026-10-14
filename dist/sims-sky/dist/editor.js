'use strict';
(() => {
  const key = 'lishiqi-sky-layout-v2';
  const defaults = {
    'graduation-banner': [50,50,84,76],
    scarf: [1.8,2.3,16,58], keys: [16.7,8.3,7.5,29.5],
    'photo-green': [23.8,13.35,17.2,39.7], 'photo-stars': [61.1,19.15,15.7,38.7],
    badge: [76.45,16.1,14,22.5], umbrella: [90.3,12.9,6.9,66.3],
    earphones: [36.5,13.8,30,20],
    ...Object.fromEntries(Object.entries(window.SCHOOL_ITEMS || {}).map(([id,item])=>[id,item.box])),
    ...Object.fromEntries(Object.entries(window.CAMPUS_ITEMS || {}).map(([id,item])=>[id,item.box]))
  };
  const $ = id => document.getElementById(id);
  const scene = document.querySelector('.scene'), panel = $('layout-editor');
  const objects = Object.fromEntries(Object.keys(defaults).map(id => [id,document.querySelector('.'+id)]));
  const clone = value => JSON.parse(JSON.stringify(value));
  const clamp = (n,min,max) => Math.max(min,Math.min(max,n));
  const initial = Object.fromEntries(Object.entries(defaults).map(([id,d])=>[id,{x:d[0],y:d[1],size:100}]));
  const groupOf=id=>objects[id].dataset.graduation?'graduation':objects[id].dataset.campus?'campus':objects[id].dataset.study?'study':'rope';
  const groups={rope:[],study:[],campus:[],graduation:[]};
  Object.keys(objects).forEach(id=>groups[groupOf(id)].push(id));
  const naturalDepth=id=>window.SCHOOL_ITEMS?.[id]?.z ?? (objects[id].dataset.campus?+objects[id].parentElement.dataset.depth:id==='earphones'?4:2);
  Object.values(groups).forEach(ids=>ids.sort((a,b)=>naturalDepth(a)-naturalDepth(b)));
  const defaultLayer=Object.fromEntries(Object.values(groups).flatMap(ids=>ids.map((id,i)=>[id,i])));
  function valid(record) {
    return record && record.v === 2 && Number.isFinite(record.savedAt) && record.savedAt >= 0 && record.savedAt <= Date.now()+60000 &&
      Object.keys(defaults).every(id => {
        const item = record.items?.[id];
        if((id === 'graduation-banner' || id === 'earphones' || window.SCHOOL_ITEMS?.[id] || window.CAMPUS_ITEMS?.[id]) && item === undefined) return true;
        return item && Number.isFinite(item.x) && item.x >= -30 && item.x <= 130 &&
          Number.isFinite(item.y) && item.y >= -30 && item.y <= 130 &&
          Number.isFinite(item.size) && item.size >= 20 && item.size <= 300 &&
          (item.layer===undefined || (Number.isInteger(item.layer) && item.layer>=0 && item.layer<1000));
      });
  }
  let saved = {v:2,savedAt:0,items:initial};
  // The latest local save wins over an older link in the same browser.
  for (const read of [()=>localStorage.getItem(key),()=>new URLSearchParams(location.hash.slice(1)).get('layout')]) {
    try { const candidate = JSON.parse(read()); if(valid(candidate) && candidate.savedAt > saved.savedAt) saved={...candidate,items:{...clone(initial),...candidate.items}}; } catch {}
  }
  let draft = clone(saved.items), selected = 'photo-green', editing = false, drag = null;
  let selection=new Set([selected]), sizeBase=null;
  const multi=()=>$('edit-multi').checked;
  function select(id,additive=false) {
    if(additive) {
      if(selection.has(id)) { if(selection.size>1)selection.delete(id); }
      else selection.add(id);
      selected=selection.has(id)?id:[...selection].at(-1);
    } else {selected=id;selection=new Set([id]);}
    sizeBase=null;paint();fields();
  }
  function resizeSelection(factor,base) {
    const values=Object.values(base);
    const lower=Math.max(...values.map(size=>20/size));
    const upper=Math.min(...values.map(size=>300/size));
    factor=clamp(factor,lower,upper);
    for(const [id,size] of Object.entries(base))draft[id].size=clamp(size*factor,20,300);
    changed();return factor;
  }
  const status = text => { $('editor-status').textContent=text; };
  const dirty = () => JSON.stringify(draft)!==JSON.stringify(saved.items);
  const anchors = {scarf:[.61,.08],keys:[.73,.12],'photo-green':[.6,.12],'photo-stars':[.55,.12],badge:[.4,.19],umbrella:[.44,.055],earphones:[.5,.35]};
  function paint() {
    // Keep sprites proportional and wholly visible; their hanging points stay
    // on the full-width rope as the viewport becomes wider or taller.
    const fit=Math.min(scene.clientWidth/1448,scene.clientHeight/1086);
    const widthScale=1448*fit/scene.clientWidth, heightScale=1086*fit/scene.clientHeight;
    for(const [id,el] of Object.entries(objects)) {
      const d=draft[id], base=defaults[id];
      if(el.dataset.study || el.dataset.campus || el.dataset.graduation) Object.assign(el.style,{left:d.x+'%',top:d.y+'%',width:base[2]*d.size/100+'%',height:base[3]*d.size/100+'%'});
      else if(document.documentElement.classList.contains('school-entry')) {
        const boxes={scarf:[73,26,177.1,482.02],keys:[335,88,114.48,337.08],'photo-green':[503,145,197.6,342.4],'photo-stars':[1226,191,203.4,375.3],badge:[1504,172,209.04,252.72],umbrella:[1760,137,99,716],earphones:[770,175,436.32,218.16]};
        const b=boxes[id];
        // Begin at the video's exact composition, then move into the saved layout.
        // The saved record itself is never rewritten by the entrance animation.
        const p=editing?1:(window.__skyEntry?.progress??0),size=100+(d.size-100)*p;
        Object.assign(el.style,{left:(b[0]/1920*100+(d.x-base[0])*p)+'%',top:(b[1]/1080*100+(d.y-base[1])*p)+'%',width:b[2]/1920*size+'%',height:b[3]/1080*size+'%'});
      }
      else Object.assign(el.style,{
        left:(d.x+base[2]*(1-widthScale)*anchors[id][0])+'%',
        top:(d.y+base[3]*(1-heightScale)*anchors[id][1])+'%',
        width:base[2]*d.size/100*widthScale+'%',height:base[3]*d.size/100*heightScale+'%'
      });
      el.classList.toggle('selected',editing && selection.has(id));
    }
    for(const [group,ids] of Object.entries(groups)) {
      const custom=ids.some(id=>draft[id].layer!==undefined);
      const container=group==='graduation'?document.getElementById('graduation-chapter'):group==='campus'?document.getElementById('campus-camera'):group==='study'?document.getElementById('study-scene'):scene;
      if(group!=='rope')container.classList.toggle('layer-ordered',custom);
      ids.forEach(id=>{
        const target=(group==='rope'||group==='graduation')?objects[id]:objects[id].parentElement;
        if(custom)target.style.zIndex=String(10+(draft[id].layer??defaultLayer[id]));
        else target.style.removeProperty('z-index');
      });
    }
    scene.dispatchEvent(new Event('scene-layout-change'));
  }
  function fields() {
    $('edit-object').value=selected;
    $('edit-x').value=Number(draft[selected].x.toFixed(2));
    $('edit-y').value=Number(draft[selected].y.toFixed(2));
    const grouped=selection.size>1;
    $('size-label').textContent=grouped?'统一缩放':'大小';
    $('selection-count').textContent=`已选 ${selection.size} 个物件${grouped?' · 位置栏仅调整当前物件':''}`;
    $('multi-size-actions').hidden=!grouped;
    $('multi-controls').hidden=!multi();
    document.querySelectorAll('#multi-list input').forEach(input=>input.checked=selection.has(input.value));
    const sizes=[...selection].map(id=>draft[id].size);
    $('edit-size').min=grouped?Math.ceil(Math.max(...sizes.map(size=>20/size))*100):20;
    $('edit-size').max=grouped?Math.floor(Math.min(...sizes.map(size=>300/size))*100):300;
    $('edit-size').value=grouped?100:draft[selected].size;
    $('size-value').textContent=(grouped?100:Number(draft[selected].size.toFixed(1)))+'%';
  }
  function changed() { paint(); status(dirty()?'有未保存修改，复制链接仍使用上次保存的布局。':'与已保存布局一致。'); $('copy-fallback').hidden=true; }
  function toggle(open) {
    editing=open; panel.hidden=!open; document.body.classList.toggle('editing',open);
    const chapter=document.getElementById('study-chapter');
    const campus=document.querySelector('.campus-viewport').getBoundingClientRect();
    if(open && selection.size===1) {
      if(document.getElementById('graduation-chapter').getBoundingClientRect().top<innerHeight*.5) {
        selected='graduation-banner';
      } else if(campus.top<innerHeight*.5 && campus.bottom>innerHeight*.5) {
        if(!objects[selected].dataset.campus)selected='campus-item-0';
      } else if(chapter.getBoundingClientRect().top<innerHeight*.5 && chapter.getBoundingClientRect().bottom>0) {
        if(!objects[selected].dataset.study)selected='books';
      }
      selection=new Set([selected]);sizeBase=null;
    }
    document.dispatchEvent(new CustomEvent('layout-editor-toggle',{detail:{open}}));
    document.querySelector('.touch-editor-toggle').setAttribute('aria-expanded',String(open));
    paint(); fields();
    if(!open && panel.contains(document.activeElement)) document.activeElement.blur();
  }
  document.addEventListener('keydown',event=>{
    if(document.getElementById('photo-viewer').open) return;
    if(event.key.toLowerCase()==='q' && !event.ctrlKey && !event.metaKey && !event.altKey && !event.repeat &&
      !event.target.closest('input,textarea,select,[contenteditable="true"]')) { event.preventDefault(); toggle(!editing); }
    if(event.key==='Escape' && editing) toggle(false);
  });
  $('close-editor').onclick=()=>toggle(false);
  document.querySelector('.touch-editor-toggle').onclick=()=>toggle(!editing);
  $('edit-multi').onchange=()=>{if(!multi())selection=new Set([selected]);sizeBase=null;paint();fields();};
  function moveLayers(direction) {
    for(const ids of Object.values(groups)) {
      if(!ids.some(id=>selection.has(id)))continue;
      let order=[...ids].sort((a,b)=>(draft[a].layer??defaultLayer[a])-(draft[b].layer??defaultLayer[b]));
      if(direction==='top')order=[...order.filter(id=>!selection.has(id)),...order.filter(id=>selection.has(id))];
      else if(direction==='bottom')order=[...order.filter(id=>selection.has(id)),...order.filter(id=>!selection.has(id))];
      else if(direction==='up') {
        for(let i=order.length-2;i>=0;i--)if(selection.has(order[i])&&!selection.has(order[i+1]))[order[i],order[i+1]]=[order[i+1],order[i]];
      } else {
        for(let i=1;i<order.length;i++)if(selection.has(order[i])&&!selection.has(order[i-1]))[order[i],order[i-1]]=[order[i-1],order[i]];
      }
      order.forEach((id,i)=>draft[id].layer=i);
    }
    changed();fields();$('layer-status').textContent=`已调整 ${selection.size} 个物件的层级，点击“保存布局”保留。`;
  }
  for(const direction of ['up','down','top','bottom'])$('layer-'+direction).onclick=()=>moveLayers(direction);
  for(const [id,factor] of [['shrink-selection',.9],['grow-selection',1.1]]) {
    $(id).onclick=()=>{resizeSelection(factor,Object.fromEntries([...selection].map(key=>[key,draft[key].size])));sizeBase=null;fields();};
  }
  for(const [id,object] of Object.entries(objects)) {
    const option=document.createElement('option'); option.value=id; option.textContent=object.getAttribute('aria-label'); $('edit-object').append(option);
    const label=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.value=id;
    label.append(check,document.createTextNode(option.textContent));$('multi-list').append(label);
    check.onchange=()=>select(id,true);
    object.addEventListener('click',event=>{if(editing) {if(event.shiftKey)$('edit-multi').checked=true;select(id,multi()||event.shiftKey);}});
    object.addEventListener('pointerdown',event=>{
      if(!editing || event.button!==0) return;
      if(multi() || event.shiftKey) return;
      event.preventDefault(); select(id);
      const bounds=(object.dataset.graduation?document.getElementById('graduation-chapter'):object.dataset.campus?document.getElementById('campus-camera'):object.dataset.study?document.getElementById('study-scene'):scene).getBoundingClientRect();
      drag={id,pointer:event.pointerId,startX:event.clientX,startY:event.clientY,x:draft[id].x,y:draft[id].y,width:bounds.width,height:bounds.height};
      object.setPointerCapture(event.pointerId);
    });
    object.addEventListener('pointermove',event=>{
      if(!drag || drag.id!==id || drag.pointer!==event.pointerId) return;
      draft[id].x=clamp(drag.x+(event.clientX-drag.startX)/drag.width*100,-30,130);
      draft[id].y=clamp(drag.y+(event.clientY-drag.startY)/drag.height*100,-30,130);
      changed(); fields();
    });
    const finish=()=>{drag=null;};
    object.addEventListener('pointerup',finish); object.addEventListener('pointercancel',finish); object.addEventListener('lostpointercapture',finish);
  }
  $('edit-object').onchange=event=>{const id=event.target.value;if(multi()){selection.add(id);selected=id;sizeBase=null;paint();fields();}else select(id);if(objects[selected].dataset.graduation) document.getElementById('graduation-chapter').scrollIntoView({behavior:'instant'});else if(objects[selected].dataset.campus) document.dispatchEvent(new Event('campus-select'));else if(objects[selected].dataset.study) document.dispatchEvent(new Event('study-select'));else window.scrollTo({top:0,behavior:'instant'});};
  for(const [id,field,min,max] of [['edit-x','x',-30,130],['edit-y','y',-30,130],['edit-size','size',20,300]]) {
    $(id).oninput=event=>{
      const value=event.target.valueAsNumber; if(!Number.isFinite(value)) return;
      if(field==='size' && selection.size>1) {
        sizeBase??=Object.fromEntries([...selection].map(key=>[key,draft[key].size]));
        const factor=resizeSelection(value/100,sizeBase);
        $('size-value').textContent=Number((factor*100).toFixed(1))+'%';return;
      }
      draft[selected][field]=clamp(value,min,max); changed(); $('size-value').textContent=draft[selected].size+'%';
    };
    $(id).onchange=()=>{sizeBase=null;fields();};
  }
  function savedLink() { const url=new URL(location.href); url.hash=new URLSearchParams({layout:JSON.stringify(saved)}).toString(); return url.href; }
  $('save-layout').onclick=()=>{
    saved={v:2,savedAt:Math.max(Date.now(),saved.savedAt+1),items:clone(draft)};
    let persisted=false, linked=false;
    try { localStorage.setItem(key,JSON.stringify(saved)); persisted=true; } catch {}
    try { history.replaceState(null,'',savedLink()); linked=true; } catch {}
    status(persisted?'已保存。下次打开和复制链接均使用这次布局。':linked?'已保存到当前链接，请复制链接保留布局。':'浏览器无法持久保存，请复制布局链接保留这次修改。');
    $('copy-fallback').hidden=true;
  };
  $('copy-layout').onclick=async()=>{
    const url=savedLink();
    try { await navigator.clipboard.writeText(url); status(dirty()?'已复制上次保存的布局，未包含当前修改。':'已复制保存后的布局链接。'); }
    catch { $('copy-fallback').hidden=false; $('saved-link').value=url; $('saved-link').focus(); $('saved-link').select(); status('浏览器不允许自动复制，请复制下方已选中的链接。'); }
  };
  $('revert-layout').onclick=()=>{draft=clone(saved.items);sizeBase=null;paint();fields();status('已恢复为最后保存的布局。');};
  window.addEventListener('beforeunload',event=>{if(dirty()){event.preventDefault();event.returnValue='';}});
  window.__paintSkyEntryObjects=paint;
  new ResizeObserver(paint).observe(scene);
  paint(); fields();
})();
