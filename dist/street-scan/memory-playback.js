import {gsap} from './gsap.js';

export function createMemoryPlayback() {
  const button = document.querySelector('#receipt-play');
  const root = document.querySelector('#memory-playback');
  const screen = document.querySelector('#memory-screen');
  const loader = document.querySelector('#memory-loading');
  const status = document.querySelector('#memory-load-status');
  const bar = document.querySelector('#memory-load-progress');
  const fill = document.querySelector('#memory-load-fill');
  const retry = document.querySelector('#memory-retry');
  let busy = false, run = 0;
  const sleep = ms => new Promise(resolve=>setTimeout(resolve,ms));
  function sceneApi() {
    const api=screen.querySelector('iframe')?.contentWindow?.memoryPlayback;
    if(!api?.ready) throw Error('The Gaussian scene is still loading.');
    return api;
  }
  window.startPortalReveal = async options => {
    const api=sceneApi();
    root.dataset.phase='revealing';
    const completed=await api.startPortalReveal(options);
    if(completed) {
      api.activate();root.dataset.phase='playing';loader.hidden=true;
      const iframe=screen.querySelector('iframe');
      iframe.tabIndex=0;iframe.focus();busy=false;
    }
    return completed;
  };
  window.resetPortalReveal = () => {
    sceneApi().resetPortalReveal();
    root.dataset.phase='ready';
  };
  window.startSplatReveal = window.startPortalReveal;
  window.resetSplatReveal = window.resetPortalReveal;
  async function play() {
    if (busy) return;
    busy = true; button.disabled = true;
    const token = ++run;
    root.hidden = false; root.dataset.phase = 'loading';
    loader.hidden = false; gsap.set(loader,{opacity:1});
    document.querySelector('#print-flow').inert = true;
    retry.hidden = true; status.textContent = 'Reading SD card…';
    bar.removeAttribute('aria-valuenow'); fill.style.width = '0%';
    document.querySelector('#memory-loading-title').textContent='Loading memory';
    screen.replaceChildren();
    const iframe = document.createElement('iframe');
    iframe.id = 'memory-frame'; iframe.title = 'Recorded street memory';
    iframe.setAttribute('allow','fullscreen'); iframe.tabIndex = -1;
    try {
      // Keep the loading frame visible before parsing the large embedded scene.
      await new Promise(resolve=>requestAnimationFrame(resolve));
      const embedded = document.querySelector('#memory-scene-source');
      // Embedded offline exports still use srcdoc; hosted pages navigate directly.
      if(token!==run)return;
      if(embedded)iframe.srcdoc=JSON.parse(embedded.textContent);else iframe.src='./playback-scene.html'; screen.append(iframe);
      const started = performance.now();
      let api;
      while(token===run) {
        api = iframe.contentWindow?.memoryPlayback;
        const child=iframe.contentWindow;
        if(child?.streetGameError)throw Error(child.streetGameError);
        const assets=child?.streetGameLoading;
        const background=api?.progress ?? child?.memoryProgress?.();
        const progress=api?.ready ? 70+25*(assets?.completed||0)/(assets?.total||1)+(assets?.gpuReady?4:0) : Math.min(70,(background||0)*.7);
        if(Number.isFinite(progress)) {
          const percent=Math.min(99,Math.max(0,Math.floor(progress)));
          fill.style.width=percent+'%';bar.setAttribute('aria-valuenow',String(percent));
          status.textContent = api?.ready ? 'Preparing characters and camera…' : `Loading ${percent}%`;
        }
        if(api?.ready&&child?.streetGame?.ready&&assets?.gpuReady)break;
        if(performance.now()-started>120000)throw Error('Scene load timed out');
        await sleep(100);
      }
      if(token!==run)return;
      api.reveal(0);
      fill.style.width='100%';bar.setAttribute('aria-valuenow','100');status.textContent='Memory ready';

      root.dataset.phase='revealing';
      const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
      await gsap.to(loader,{opacity:0,duration:reduced?.15:.35,ease:'power1.out'});
      loader.hidden=true;
      await window.startPortalReveal(reduced?{duration:.25}:undefined);
    } catch(error) {
      console.error('Memory playback failed:',error);
      root.dataset.phase='error';busy=false;
      screen.replaceChildren();
      document.querySelector('#memory-loading-title').textContent='Unable to load memory';
      status.textContent='Please try again.';retry.hidden=false;retry.focus();
    }
  }
  button.addEventListener('click',play);
  retry.addEventListener('click',play);
  return {enable(){button.disabled=false;}};
}
