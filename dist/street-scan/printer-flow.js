import {gsap} from './gsap.js';
import {createMemoryPlayback} from './memory-playback.js';
import {sounds} from '../sound-effects.source.js';

export function createPrintFlow() {
  const playback = createMemoryPlayback();
  const flow = document.querySelector('#print-flow');
  const stage = document.querySelector('#printer-stage');
  const machine = document.querySelector('#printer-machine');
  const image = document.querySelector('#printer-image');
  const dock = document.querySelector('#sd-dock');
  const slot = document.querySelector('#sd-slot');
  const hint = document.querySelector('#print-hint');
  const paper = document.querySelector('#receipt');
  const announce = document.querySelector('#print-announcement');
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  let phase = 'idle', drag = null, wheelAmount = 0, selected = false;
  const setPhase = value => { phase = value; flow.dataset.phase = value; };
  const home = () => ({left: innerWidth < 600 ? 18 : 30, top: innerWidth < 600 ? 18 : 26, width: innerWidth < 600 ? 66 : 90});
  function message(text) { hint.textContent = text; announce.textContent = text; }
  function resetCard() {
    drag = null; selected = false; dock.classList.remove('dragging'); slot.classList.remove('targeted');
    dock.setAttribute('aria-grabbed', 'false');
    gsap.to(dock, {...home(), x:0, y:0, rotation:0, scale:1, duration:reduced() ? 0 : .28, overwrite:true});
  }
  function collect(bounds) {
    if (phase !== 'idle') return;
    setPhase('collecting');
    document.querySelector('#view').inert = true;
    flow.hidden = false; dock.hidden = false;
    message('');
    gsap.set(stage, {clipPath:'inset(100% 0% 0% 0%)'});
    gsap.set(machine, {opacity:0, y:55});
    gsap.set(paper, {y:0, yPercent:-101});
    gsap.set(dock, {left:bounds.left,top:bounds.top,width:bounds.width,height:bounds.height});
    gsap.to(dock, {...home(),height:() => home().width,duration:reduced() ? 0 : .85,ease:'power2.inOut',onComplete:()=>{
      setPhase('awaiting-wheel'); dock.focus({preventScroll:true});
    }});
  }
  async function transition() {
    if (phase !== 'awaiting-wheel') return;
    setPhase('loading'); message('');
    try { await image.decode(); } catch {
      setPhase('awaiting-wheel'); message('Printer could not load. Click to retry.'); return;
    }
    setPhase('transitioning');
    const tl = gsap.timeline({onComplete:()=>{
      setPhase('ready'); slot.disabled = false;
      dock.setAttribute('aria-label','Drag SD card into the printer slot, or press Enter to select');
      message('');
    }});
    tl.to(stage, {clipPath:'inset(0% 0% 0% 0%)',duration:reduced() ? 0 : 1.15,ease:'power2.inOut'})
      .to(machine, {opacity:1,y:0,duration:reduced() ? 0 : .75,ease:'power2.out'},reduced() ? 0 : .48);
  }
  window.addEventListener('wheel', event => {
    if (phase === 'idle') return;
    event.preventDefault();
    if (phase !== 'awaiting-wheel' || event.deltaY <= 0) return;
    wheelAmount += event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1);
    if (wheelAmount >= 30) transition();
  }, {passive:false});
  hint.addEventListener('click', () => { if (phase === 'awaiting-wheel') transition(); });
  hint.addEventListener('keydown', event => { if (event.code === 'ArrowDown') transition(); });
  dock.addEventListener('click', event => {
    // Pointer clicks are handled by dragging; keyboard users can choose the slot.
    if (event.detail !== 0) return;
    if (phase === 'awaiting-wheel') { transition(); return; }
    if (phase !== 'ready') return;
    selected = true; slot.classList.add('targeted'); slot.focus();
    message('Press Enter to insert the SD card');
  });
  function insert() {
    if (phase !== 'ready') return;
    setPhase('inserting'); drag = null; selected = false; slot.disabled = true;
    sounds.play('printer',{loop:true});
    dock.classList.remove('dragging'); slot.classList.remove('targeted');
    message('');
    const sleeve = document.querySelector('#sd-insertion');
    const insertedCard = sleeve.querySelector('img');
    sleeve.hidden = false;
    gsap.set(insertedCard, {visibility:'hidden', y:0, yPercent:0});
    const rect = sleeve.getBoundingClientRect();
    const tl = gsap.timeline();
    tl.to(dock, {left:rect.left,top:rect.top,width:rect.width,height:rect.height,rotation:0,duration:reduced() ? 0 : .35,ease:'power2.inOut'})
      .call(()=>{
        dock.hidden = true;
        gsap.set(insertedCard,{visibility:'visible'});
        sleeve.dataset.moving = 'true';
      })
      // The full-size, opaque card travels downward behind the slot lip.
      // The stationary sleeve clips it at the mouth instead of fading or flattening it.
      .to(insertedCard,{yPercent:102,duration:reduced() ? .1 : 1.05,ease:'none'})
      .call(()=>{
        sleeve.hidden = true; sleeve.dataset.moving = 'false'; machine.classList.add('powered');
        announce.textContent = 'SD card inserted. Printer on.';
      })
      .to({}, {duration:reduced() ? .1 : .7})
      .call(()=>{setPhase('printing');announce.textContent='Printing receipt';})
      .to(paper,{yPercent:0,duration:reduced() ? .15 : 3.8,ease:reduced() ? 'none' : 'steps(55)'})
      .call(()=>{sounds.stop('printer');setPhase('printed');announce.textContent='Receipt printed. Play is available.';playback.enable();});
  }
  slot.addEventListener('click', () => { if (selected) insert(); });
  dock.addEventListener('pointerdown', event => {
    if (phase !== 'ready' || event.button !== 0) return;
    event.preventDefault(); gsap.killTweensOf(dock);
    const r = dock.getBoundingClientRect();
    drag = {id:event.pointerId,dx:event.clientX-r.left,dy:event.clientY-r.top};
    dock.setPointerCapture(event.pointerId); dock.classList.add('dragging');
    dock.setAttribute('aria-grabbed','true');
  });
  dock.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    gsap.set(dock,{left:event.clientX-drag.dx,top:event.clientY-drag.dy});
    slot.classList.toggle('targeted', isOverSlot(event));
  });
  function isOverSlot(event) {
    const r = slot.getBoundingClientRect();
    return event.clientX >= r.left-8 && event.clientX <= r.right+8 && event.clientY >= r.top-8 && event.clientY <= r.bottom+8;
  }
  dock.addEventListener('pointerup', event => {
    if (!drag || event.pointerId !== drag.id) return;
    const accepted = isOverSlot(event);
    drag = null;
    if (dock.hasPointerCapture(event.pointerId)) dock.releasePointerCapture(event.pointerId);
    if (accepted) insert(); else resetCard();
  });
  dock.addEventListener('pointercancel', resetCard);
  dock.addEventListener('lostpointercapture', () => { if (drag) resetCard(); });
  window.addEventListener('blur', () => { if (drag) resetCard(); });
  window.addEventListener('resize', () => {
    if (['ready','awaiting-wheel'].includes(phase)) resetCard();
  });
  window.addEventListener('keydown', event => {
    if (event.code === 'Escape' && phase === 'ready') { resetCard(); dock.focus(); message(''); }
  });
  return {collect,get started(){return phase !== 'idle';}};
}
