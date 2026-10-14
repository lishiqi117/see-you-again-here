(() => {
  'use strict';
  const videos = [...document.querySelectorAll('.character video')];
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const scenes = [...document.querySelectorAll('.memory-scene')];
  const sections = [...document.querySelectorAll('.character')];
  // The final street leaves with the character; a document-height colour
  // passage continues below its lower edge, underneath the floating letters.
  const backgrounds=document.querySelector('.memory-backgrounds');
  const shade=document.querySelector('.memory-shade');
  const credits=document.querySelector('#credits');
  const ending=document.querySelector('#see-again');
  const passage=document.createElement('div');
  passage.className='ending-colour-passage';passage.setAttribute('aria-hidden','true');
  backgrounds.before(passage);
  function updateDeparture(){
    const edge=credits.getBoundingClientRect().bottom;
    const departure=Math.min(0,edge-innerHeight);
    backgrounds.style.transform=shade.style.transform='translateY('+departure+'px)';
    // The feather follows the street's document edge, so it enters gradually
    // before departure rather than switching on at a scroll threshold.
    const blend=innerHeight*.65;
    for(const layer of [backgrounds,shade]){
      layer.style.setProperty('--street-edge',(edge-departure)+'px');
      layer.style.setProperty('--street-blend',blend+'px');
    }
    passage.style.top=(credits.offsetTop+credits.offsetHeight-blend)+'px';
    passage.style.height=(ending.offsetHeight+blend)+'px';
  }
  addEventListener('scroll',updateDeparture,{passive:true});
  addEventListener('resize',updateDeparture);
  new ResizeObserver(updateDeparture).observe(credits);
  updateDeparture();
  const clamp = gsap.utils.clamp(0, 1);
  gsap.registerPlugin(ScrollTrigger);
  // One smoothed playhead controls the whole dissolve: weights always sum to 1.
  // Additive compositing avoids the dark dip of two ordinary alpha-over layers.
  const playhead = { position: 0 };
  const weights = [1, 0, 0];
  const clocks = [0, 0, 0];
  const frames = [];
  const ready = new Set();
  function loadScene(i) {
    if (i >= scenes.length || frames[i]) return;
    const frame = document.createElement('iframe');
    frame.title = ['Courtyard scan', 'Shopfront scan', 'Street scan'][i];
    frame.tabIndex = -1;
    frame.src = './assets/credits/scanned-scene.html#' + i;
    scenes[i].append(frame);
    frames[i] = frame;
    // A failed renderer must not prevent the other scenes from loading.
    setTimeout(() => loadScene(i + 1), 12000);
  }
  addEventListener('message', event => {
    const i = frames.findIndex(frame => frame?.contentWindow === event.source);
    if (i < 0 || event.data?.type !== 'credits-scene-ready') return;
    ready.add(i);
    scenes[i].classList.add('is-ready');
    loadScene(i + 1);
  });
  function draw() {
    const p = playhead.position;
    const a = clamp((p - .30) / .60), b = clamp((p - 1.30) / .60);
    weights[0] = 1 - a; weights[1] = a - b; weights[2] = b;
    scenes.forEach((scene, i) => { scene.style.opacity = weights[i]; });
    sections.forEach((section, i) => {
      // Background arrives first; the new character and copy follow behind it.
      const enter = i === 0 ? 1 : clamp((p - (i - .46)) / .38);
      const leave = i === 2 ? 1 : 1 - clamp((p - (i + .10)) / .38);
      const alpha = Math.min(enter, leave);
      gsap.set(section.children, { opacity: alpha });
    });
  }
  gsap.matchMedia().add({normal:'(prefers-reduced-motion: no-preference)',reduce:'(prefers-reduced-motion: reduce)'}, context => {
    gsap.to(playhead, {position:2,ease:'none',onUpdate:draw,scrollTrigger:{
      trigger:'#credits',start:'top top',end:'bottom bottom',scrub:context.conditions.reduce ? true : 1.35,
      invalidateOnRefresh:true
    }});
  });
  let previous = performance.now();
  let lastReduced = preference.matches;
  const tick = () => {
    const now = performance.now(), dt = Math.min((now - previous) / 1000, .05);
    previous = now;
    // Some local-file browsers do not dispatch MediaQueryList change events
    // reliably while other listeners rebuild their scroll animations.
    if (lastReduced !== preference.matches) {
      lastReduced = preference.matches;
      videos.forEach(sync);
    }
    scenes.forEach((scene, i) => {
      if (!document.hidden && !preference.matches && weights[i] > .001) clocks[i] += dt;
      // No loop, reset or yoyo while visible. Motion remains bounded even after a long pause.
      const push = preference.matches ? 0 : 1 - Math.exp(-clocks[i] / 180);
      gsap.set(scene.querySelector('img'), {scale:1 + push * .08,xPercent:push * (i === 1 ? -.3 : .25),yPercent:push * -.2});
      if (ready.has(i)) frames[i].contentWindow.postMessage({type:'credits-camera',push,active:!document.hidden && weights[i] > .001}, '*');
    });
  };
  gsap.ticker.add(tick);
  loadScene(0);
  draw();
  const visible = new Set();
  function sync(video) {
    if (preference.matches || document.hidden || !visible.has(video)) { video.pause(); return; }
    if (!video.src) { video.src = video.dataset.src; video.load(); }
    video.play().catch(() => video.parentElement.classList.remove('is-playing'));
  }
  for (const video of videos) {
    video.muted = true;
    video.autoplay = false;
    video.addEventListener('play', () => {
      if (preference.matches || document.hidden || !visible.has(video)) video.pause();
    });
    video.addEventListener('loadeddata', () => {
      // These local *-clean.webm exports have verified alpha. file:// blocks
      // canvas pixel reads, so use the exported format directly in that mode.
      if (location.protocol === 'file:') {
        video.parentElement.classList.add('is-playing'); sync(video); return;
      }
      // Validate actual decoded alpha before displaying any video pixels.
      // Unsupported decoders keep the transparent still instead of a black rectangle.
      try {
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 32;
        const ctx = canvas.getContext('2d', {willReadFrequently:true});
        ctx.drawImage(video, 0, 0, 32, 32);
        const pixels = ctx.getImageData(0, 0, 32, 32).data;
        let transparent = false;
        for (let i=3; i<pixels.length; i+=4) if (pixels[i]<128) { transparent=true; break; }
        if (transparent) { video.parentElement.classList.add('is-playing'); sync(video); }
        else { video.pause(); visible.delete(video); }
      } catch (_) { video.pause(); visible.delete(video); }
    });
    video.addEventListener('error', () => video.parentElement.classList.remove('is-playing'));
  }
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const video=entry.target.querySelector('video');
      if(entry.isIntersecting) visible.add(video); else visible.delete(video);
      sync(video);
    }
  }, {threshold: .12});
  document.querySelectorAll('.character').forEach(section=>observer.observe(section));
  preference.addEventListener('change', () => videos.forEach(sync));
  document.addEventListener('visibilitychange', () => videos.forEach(sync));
})();
