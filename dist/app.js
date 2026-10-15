(() => {
  "use strict";
  const $ = selector => document.querySelector(selector);
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const memoryLoader = $('#memoryLoader');
  const lampMemory = $('#lampMemory');
  const state = { screen: 'loading' };
  const parallaxEnabled = !reducedMotion && matchMedia('(hover: hover) and (pointer: fine)').matches;
  const parallaxRoot = document.documentElement;
  const parallaxStrength = { loading: 1, lampMemory: 0 };
  const parallaxMotion = { targetX: 0, targetY: 0, x: 0, y: 0, lastTime: 0 };
  let appliedParallaxX = NaN, appliedParallaxY = NaN;
  // Retired chapter links return to the remaining opening experience.
  const url = new URL(location.href);
  url.searchParams.set('part', 'opening');
  url.searchParams.delete('year');
  try { history.replaceState({ part: 'opening' }, '', url); } catch (_) {}
  document.title = 'SEE YOU AGAIN HERE';

  function setParallaxTarget(clientX, clientY, pointerType = "mouse") {
    if (!parallaxEnabled || pointerType === "touch") return;
    parallaxMotion.targetX = clamp((clientX / Math.max(1, window.innerWidth) - .5) * 2, -1, 1);
    parallaxMotion.targetY = clamp((clientY / Math.max(1, window.innerHeight) - .5) * 2, -1, 1);
  }

  function settleParallax() {
    parallaxMotion.targetX = 0;
    parallaxMotion.targetY = 0;
  }

  function advanceGlobalParallax(time) {
    if (!parallaxEnabled) return;
    if (!parallaxMotion.lastTime) parallaxMotion.lastTime = time;
    const elapsed = clamp(time - parallaxMotion.lastTime, 0, 48);
    parallaxMotion.lastTime = time;
    const follow = 1 - Math.exp(-elapsed / 310);
    parallaxMotion.x += (parallaxMotion.targetX - parallaxMotion.x) * follow;
    parallaxMotion.y += (parallaxMotion.targetY - parallaxMotion.y) * follow;

    const strength = parallaxStrength[state.screen] ?? .55;
    const x = parallaxMotion.x * strength;
    const y = parallaxMotion.y * strength;
    if (x === appliedParallaxX && y === appliedParallaxY) return;
    appliedParallaxX = x; appliedParallaxY = y;
    parallaxRoot.style.setProperty("--parallax-far-x", `${(x * 7.8).toFixed(3)}px`);
    parallaxRoot.style.setProperty("--parallax-far-y", `${(y * 5.8).toFixed(3)}px`);
    parallaxRoot.style.setProperty("--parallax-mid-x", `${(x * 14.6).toFixed(3)}px`);
    parallaxRoot.style.setProperty("--parallax-mid-y", `${(y * 10.8).toFixed(3)}px`);
    parallaxRoot.style.setProperty("--parallax-near-x", `${(x * 24).toFixed(3)}px`);
    parallaxRoot.style.setProperty("--parallax-near-y", `${(y * 17.5).toFixed(3)}px`);
    parallaxRoot.style.setProperty("--parallax-roll", `${(x * .52).toFixed(4)}deg`);
  }

  if (parallaxEnabled) {
    parallaxRoot.classList.add("parallax-enabled");
    window.addEventListener("pointermove", (event) => {
      setParallaxTarget(event.clientX, event.clientY, event.pointerType);
    }, { passive: true });
    window.addEventListener("blur", settleParallax);
    document.documentElement.addEventListener("mouseleave", settleParallax);
  }

  // Reuse the supplied cat opening, including its ball-to-black ending.
  function startMemoryLoading() {
    const loader = new CatLoader({
      container: memoryLoader,
      assetBase: './cat-loading/assets/',
      demo: false,
      async onComplete(loader) {

        lampMemory.classList.add('active');
        state.screen = 'lampMemory';
        const fade = loader.root.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: reducedMotion ? 80 : 850,
          easing: 'ease-out',
          fill: 'forwards'
        });
        await fade.finished;
        loader.destroy();
        memoryLoader.classList.remove('active');
        memoryLoader.setAttribute('aria-hidden', 'true');
        window.prepareNextMemory().catch(error=>console.warn('照片预加载暂未完成',error));
      }
    });
    const status=document.createElement('p');status.className='site-loading-status';status.setAttribute('role','status');
    const retry=document.createElement('button');retry.className='site-loading-retry';retry.type='button';retry.textContent='重试加载';retry.hidden=true;
    loader.root.append(status,retry);
    async function prepare(){
      retry.hidden=true;loader.root.dataset.state='loading';
      try{
        await loader.ready;
        await window.prepareWholeSite((value,message)=>{loader.setProgress(value);status.textContent=message;});
        loader.root.dataset.state='ready';
      }catch(error){loader.root.dataset.state='error';status.textContent=error.message;retry.hidden=false;console.error(error);}
    }
    retry.addEventListener('click',prepare);prepare();
  }

  let parallaxFrame = 0;
  const parallaxVisible = () => !document.hidden && !document.body.classList.contains('archive-world-active');
  function wakeParallax() {
    if (parallaxVisible() && !parallaxFrame) parallaxFrame = requestAnimationFrame(animate);
  }
  function animate(time) {
    parallaxFrame = 0;
    if (!parallaxVisible()) { parallaxMotion.lastTime = 0; return; }
    advanceGlobalParallax(time);
    wakeParallax();
  }
  document.addEventListener('visibilitychange', wakeParallax);
  new MutationObserver(wakeParallax).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  startMemoryLoading();
  wakeParallax();
})();
