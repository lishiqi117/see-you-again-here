(() => {
  'use strict';
  const dialog = document.querySelector('#deskArchiveDialog');
  const video = document.querySelector('#archiveOpeningSource');
  const canvas = document.querySelector('#archiveOpeningCanvas');
  const hint = document.querySelector('#archiveOpeningHint');
  if (!dialog || !video || !canvas) return;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return;

  // Only decoded still frames are displayed. The media clock never plays.
  // Skip the leading hold; 1,800 wheel pixels traverse the opening gesture.
  const SCROLL_DISTANCE = 1800;
  const clamp = value => Math.max(0, Math.min(1, value));
  let start = 1.05, end = 5, target = 0, position = 0;
  let ready = false, seeking = false, resetting = true, raf = 0, lastTime = 0;
  let touchY = null;
  video.muted = true;
  video.pause();

  function paint() {
    if (video.readyState < 2) return;
    // Do not flash a frame from the last visit while resetting to the cover.
    if (resetting && Math.abs(video.currentTime - start) > .035) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.classList.add('ready');
    resetting = false;
    dialog.dispatchEvent(new CustomEvent('archive:frame', { detail: {
      complete: target >= .999 && position >= .995 && Math.abs(video.currentTime - end) < .04
    } }));
  }

  function requestFrame(time) {
    if (!ready || seeking) return;
    if (Math.abs(video.currentTime - time) < .008) { paint(); return; }
    seeking = true;
    video.currentTime = time;
  }

  function tick(now) {
    raf = 0;
    if (!dialog.open || !ready) return;
    const dt = Math.min(50, lastTime ? now - lastTime : 16);
    lastTime = now;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    position += (target - position) * (reduced ? 1 : 1 - Math.exp(-dt / 65));
    if (Math.abs(target - position) < .001) position = target;
    requestFrame(resetting ? start : start + position * (end - start));
    if (Math.abs(target - position) > .0001) raf = requestAnimationFrame(tick);
    else lastTime = 0;
  }

  function wake() {
    if (dialog.open && ready && !raf) raf = requestAnimationFrame(tick);
  }

  function advance(pixels) {
    if (!dialog.open || !Number.isFinite(pixels)) return;
    target = clamp(target + pixels / SCROLL_DISTANCE);
    if (target < .999) dialog.dispatchEvent(new CustomEvent('archive:frame', { detail: { complete: false } }));
    dialog.classList.toggle('archive-opening', target > .015);
    wake();
  }

  function initialize() {
    if (ready || !Number.isFinite(video.duration)) return;
    start = Math.min(1.05, video.duration * .22);
    end = Math.max(start, video.duration - .055);
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ready = true;
    requestFrame(start);
    wake();
  }
  video.addEventListener('loadeddata', initialize, { once: true });
  video.addEventListener('seeked', () => {
    seeking = false;
    paint();
    if (resetting) requestFrame(start);
    else if (dialog.open && Math.abs(video.currentTime - (start + position * (end - start))) > .015) wake();
  });
  video.addEventListener('error', () => {
    canvas.classList.remove('ready');
    dialog.classList.remove('archive-opening');
    hint.textContent = '档案暂时无法翻开，请关闭后刷新重试';
  });

  function reset() {
    cancelAnimationFrame(raf);
    raf = 0; lastTime = 0; target = 0; position = 0; touchY = null;
    resetting = true;
    dialog.dispatchEvent(new CustomEvent('archive:frame', { detail: { complete: false } }));
    video.pause();
    canvas.classList.remove('ready');
    dialog.classList.remove('archive-opening');
    requestFrame(start);
  }
  dialog.addEventListener('archive:open', () => { reset(); window.SiteSounds?.play('archive'); wake(); });
  dialog.addEventListener('close', () => { window.SiteSounds?.stop('archive'); reset(); });
  dialog.addEventListener('wheel', event => {
    event.preventDefault();
    event.stopPropagation();
    if (event.ctrlKey) return;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1;
    // Bound a single wheel packet so a coarse mouse cannot jump past the turn.
    advance(Math.max(-240, Math.min(240, event.deltaY * unit)));
  }, { passive: false });
  dialog.addEventListener('keydown', event => {
    const steps = { ArrowDown: 120, ArrowUp: -120, PageDown: 420, PageUp: -420 };
    if (event.key in steps) { event.preventDefault(); advance(steps[event.key]); }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault(); advance(event.key === 'Home' ? -SCROLL_DISTANCE : SCROLL_DISTANCE);
    }
  });
  dialog.addEventListener('touchstart', event => { touchY = event.touches[0]?.clientY ?? null; }, { passive: true });
  dialog.addEventListener('touchmove', event => {
    if (touchY === null || event.touches.length !== 1) return;
    event.preventDefault();
    const y = event.touches[0].clientY;
    advance((touchY - y) * 2.4);
    touchY = y;
  }, { passive: false });
  dialog.addEventListener('touchend', () => { touchY = null; });
  dialog.addEventListener('contextmenu', event => event.preventDefault());
  if (video.readyState >= 2) initialize();
})();
