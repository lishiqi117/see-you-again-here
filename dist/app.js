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
  // Retired chapter links return to the remaining opening experience.
  const url = new URL(location.href);
  url.searchParams.set('part', 'opening');
  url.searchParams.delete('year');
  try { history.replaceState({ part: 'opening' }, '', url); } catch (_) {}
  document.title = '开场 · 童年档案｜记忆街道';

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
    new CatLoader({
      container: memoryLoader,
      assetBase: './cat-loading/assets/',
      demo: true,
      async onComplete(loader) {
        await window.lampBackgroundReady;
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
      }
    });
  }

  function animate(time) {
    if (document.hidden || document.body.classList.contains('archive-world-active')) { requestAnimationFrame(animate); return; }
    advanceGlobalParallax(time);
    requestAnimationFrame(animate);
  }
  startMemoryLoading();
  requestAnimationFrame(animate);
})();
