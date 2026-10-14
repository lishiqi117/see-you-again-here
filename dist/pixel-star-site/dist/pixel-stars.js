(() => {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const HOLD_MS = 1800;
  // Story, sound and page changes can be added here. Called once per full hold.
  function activateStar(starElement) {
    starElement.dispatchEvent(new CustomEvent('staractivate', { bubbles: true }));
  }
  window.activateStar = window.activateStar || activateStar;
  function svgNode(tag, attributes = {}) {
    const element = document.createElementNS(NS, tag);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
    return element;
  }
  function pixel(parent, x, y, size = 1) {
    const rect = svgNode('rect', { x, y, width: size, height: size });
    parent.append(rect);
    return rect;
  }
  function mount(host) {
    if (host.dataset.pixelStarsMounted) return;
    host.dataset.pixelStarsMounted = 'true';
    const layout = [
      [47.5, 49.7, 132, 'large', 2.7, -.8, 47.5, 49.7],
      [80, 31.4, 72, 'medium', 2.1, -1.5, 80, 31.4],
      [26, 22.9, 44, 'small', 2.9, -.4, 26, 22.9],
      [67, 72.5, 44, 'small', 1.9, -1.2, 67, 72.5],
      [25, 79.7, 58, 'tiny', 2.4, -2.1, 25, 79.7]
    ];
    layout.forEach(([x, y, size, kind, duration, delay, mx, my]) => {
      const star = document.createElement('button');
      star.type = 'button';
      star.className = 'pixel-star';
      star.setAttribute('aria-label', '长按激活星星');
      star.dataset.kind = kind;
      star.style.cssText = `--x:${x}%;--y:${y}%;--mobile-x:${mx}%;--mobile-y:${my}%;--size:${size}px;--duration:${duration}s;--delay:${delay}s`;
      const svg = svgNode('svg', { viewBox: '0 0 33 33', 'aria-hidden': 'true', 'shape-rendering': 'crispEdges' });
      const feedback = svgNode('g', { class: 'pixel-star-feedback' });
      const art = svgNode('g', { class: 'pixel-star-art', fill: 'currentColor' });
      const radius = kind === 'large' ? 12 : kind === 'medium' ? 10 : kind === 'small' ? 5 : 10;
      if (kind === 'large') {
        // Stepped diamond with a dark, empty centre and four long cardinal tips.
        for (let py = -5; py <= 5; py++) for (let px = -5; px <= 5; px++) {
          if (Math.abs(px) + Math.abs(py) === 5) pixel(art, 16 + px, 16 + py);
        }
        pixel(art, 15, 15, 3).setAttribute('fill', '#17151b');
      }
      for (let n = -radius; n <= radius; n++) {
        if (kind === 'large' && Math.abs(n) < 5) continue;
        if (kind === 'small' || kind === 'tiny' || kind === 'medium') continue;
        pixel(art, 16 + n, 16);
        if (n !== 0) pixel(art, 16, 16 + n);
      }
      if (kind === 'small') {
        [[16,10],[10,16],[22,16],[16,22]].forEach(([px,py]) => pixel(art,px-1,py-1,3));
      }
      if (kind === 'medium') {
        pixel(art,14,14,5);
        [[16,8],[8,16],[24,16],[16,24]].forEach(([px,py]) => pixel(art,px-1,py-1,3));
        [[16,3],[3,16],[29,16],[16,29]].forEach(([px,py]) => pixel(art,px-1,py-1,2));
      }
      if (kind === 'tiny') {
        [[16,7],[7,16],[25,16],[16,25]].forEach(([px,py]) => pixel(art,px-1,py-1,3));
      }
      if (kind === 'large') {
        const tips = svgNode('g', { class: 'pixel-star-tip' });
        [[3,16],[29,16],[16,3],[16,29]].forEach(([px,py]) => pixel(tips,px,py));
        art.append(tips);
      }
      const ring = svgNode('g', { class: 'pixel-star-ring' });
      // One-pixel circumference; sorting by angle draws clockwise from twelve o'clock.
      const ringRadius = kind === 'large' || kind === 'medium' ? 17 : kind === 'tiny' ? 14 : 11;
      const points = [];
      for (let py = -ringRadius; py <= ringRadius; py++) for (let px = -ringRadius; px <= ringRadius; px++) {
        if (Math.abs(Math.hypot(px, py) - ringRadius) < .52) points.push({ x: px + 16, y: py + 16, angle: (Math.atan2(px, -py) + Math.PI * 2) % (Math.PI * 2) });
      }
      const segments = points.sort((a,b) => a.angle-b.angle).map(p => {
        const rect = pixel(ring, p.x, p.y); rect.style.visibility = 'hidden'; return rect;
      });
      const spark = svgNode('g', { class: 'pixel-star-spark', fill: 'currentColor' });
      [[5,5],[27,7],[7,27]].forEach(([px,py]) => {
        [[0,0],[-1,0],[1,0],[0,-1],[0,1]].forEach(([dx,dy]) => pixel(spark,px+dx,py+dy));
      });
      feedback.append(art); svg.append(feedback, ring, spark); star.append(svg); host.append(star);
      let active = null, started = 0, progress = 0, frame = 0, completionTimer = 0, visibleCount = 0;
      const draw = value => {
        progress = Math.max(0, Math.min(1, value));
        const count = Math.floor(progress * segments.length);
        for (let i = Math.min(count, visibleCount); i < Math.max(count, visibleCount); i++) segments[i].style.visibility = i < count ? 'visible' : 'hidden';
        visibleCount = count;
        star.style.setProperty('--activation-scale', 1 + progress * .05);
        star.style.setProperty('--hold-opacity', .8 + progress * .2);
        star.dataset.progress = progress.toFixed(4);
      };
      const retreat = () => {
        cancelAnimationFrame(frame);
        const initial = progress, time = performance.now();
        const tick = now => {
          const t = Math.min(1, (now-time)/180);
          draw(initial * (1-t) ** 2);
          if (t < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      };
      const stop = () => {
        if (active === null) return;
        active = null;
        star.classList.remove('is-holding');
        retreat();
      };
      const complete = () => {
        active = null;
        draw(1);
        star.classList.remove('is-holding');
        star.classList.add('is-complete');
        completionTimer = setTimeout(() => { star.classList.remove('is-complete'); retreat(); }, 500);
        window.activateStar(star);
      };
      const begin = id => {
        if (active !== null || star.classList.contains('is-complete')) return;
        cancelAnimationFrame(frame); clearTimeout(completionTimer); draw(0);
        active = id; started = performance.now(); star.classList.add('is-holding');
        const tick = now => {
          if (active === null) return;
          draw((now-started)/HOLD_MS);
          if (progress >= 1) complete(); else frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      };
      star.addEventListener('pointerdown', event => {
        if (!event.isPrimary || event.button !== 0) return;
        event.preventDefault(); event.stopPropagation(); begin(event.pointerId);
      });
      // Touch implicit capture can suppress pointerleave: check its actual coordinates too.
      star.addEventListener('pointermove', event => {
        if (active !== event.pointerId) return;
        const box = star.getBoundingClientRect();
        if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) stop();
      });
      ['pointerleave','pointercancel','lostpointercapture'].forEach(type => star.addEventListener(type, event => { if (active === event.pointerId) stop(); }));
      window.addEventListener('pointerup', event => {
        if (active !== event.pointerId) return;
        if (performance.now()-started >= HOLD_MS) { cancelAnimationFrame(frame); complete(); } else stop();
      });
      star.addEventListener('keydown', event => {
        if (![' ', 'Enter'].includes(event.key)) return;
        event.preventDefault(); if (!event.repeat) begin('keyboard');
      });
      star.addEventListener('keyup', event => { if ([' ', 'Enter'].includes(event.key) && active === 'keyboard') stop(); });
      star.addEventListener('blur', stop);
      star.addEventListener('contextmenu', event => event.preventDefault());
      star.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); });
      window.addEventListener('blur', stop);
      document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
      draw(0);
    });
  }
  document.querySelectorAll('[data-pixel-stars]').forEach(mount);
})();
