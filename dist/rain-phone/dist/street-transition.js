(() => {
  'use strict';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = v => { v = clamp(v, 0, 1); return v * v * (3 - 2 * v); };
  const layer = document.createElement('section');
  layer.id = 'street-transition';
  layer.hidden = true;
  layer.setAttribute('aria-label', '向下滚动，穿过影片进入街道');
  layer.innerHTML = '<video muted playsinline preload="auto" disablepictureinpicture aria-label="滚轮控制的转场影片"></video><iframe title="街道扫描" allow="autoplay; fullscreen" tabindex="-1"></iframe><p role="status" hidden></p>';
  const style = document.createElement('style');
  style.textContent = '#street-transition{position:fixed;inset:0;z-index:20;background:#000;opacity:0;touch-action:none;cursor:auto}#street-transition[hidden]{display:none}#street-transition video,#street-transition iframe{position:absolute;inset:0;width:100%;height:100%;border:0;opacity:0}#street-transition video{object-fit:contain;pointer-events:none}#street-transition iframe{pointer-events:none;background:#000}#street-transition p{position:absolute;bottom:24px;left:0;right:0;text-align:center;color:#fff9;font:13px system-ui;pointer-events:none}';
  document.head.append(style); document.body.append(layer);
  const video = layer.querySelector('video'), street = layer.querySelector('iframe'), hint = layer.querySelector('p');
  video.muted = true; video.src = 'assets/street-transition.mp4';
  let target = 0, position = 0, frame = 0, last = 0, requested = 0;
  let loaded = false, finished = false, failed = false, touchY = null;
  const duration = () => Math.max(0, video.duration - .04);
  const filmEnd = () => 1000 + duration() * 520;
  const end = () => filmEnd() + 1400;
  function prepareStreet() {
    if (street.hasAttribute('src')) return;
    street.src = '../../街道扫描-双击打开.html';
  }
  street.addEventListener('load', () => { if(street.hasAttribute('src')) { loaded = true; wake(); } });
  video.addEventListener('error', () => {
    failed = true; target = position = 0; layer.hidden = true;
    document.querySelector('#hint').textContent = '转场视频未能加载，请刷新后重试。';
  });
  video.addEventListener('seeked', wake);
  video.addEventListener('loadeddata', wake);
  function render(now) {
    frame = 0;
    const dt = Math.min(50, last ? now - last : 16); last = now;
    // Hold on the final decoded frame until both it and the destination are ready.
    let goal = target;
    if (!loaded || video.seeking || Math.abs(video.currentTime - duration()) > .06) goal = Math.min(goal, filmEnd());
    position += (goal - position) * (1 - Math.exp(-dt / 95));
    if (Math.abs(goal - position) < .1) position = goal;
    layer.hidden = position <= 0;
    layer.style.opacity = smooth(position / 600);
    const time = clamp((position - 1000) / 520, 0, duration());
    const sameFrame = Math.floor((video.currentTime + 1e-6) * 25) === Math.floor((time + 1e-6) * 25);
    if (!video.seeking && Math.abs(time - video.currentTime) > .018 && (!sameFrame || time === 0 || time === duration())) { requested = time; video.currentTime = time; }
    video.style.opacity = smooth((position - 600) / 400) * (1 - smooth((position - filmEnd()) / 600));
    street.style.opacity = smooth((position - filmEnd() - 600) / 800);
    hint.style.opacity = position > filmEnd() + 600 ? '0' : '1';
    if (position >= end() - .1 && loaded) {
      finished = true; street.style.opacity = '1'; street.style.pointerEvents = 'auto';
      street.tabIndex = 0; street.focus(); hint.hidden = true; last = 0; return;
    }
    if (Math.abs(goal - position) > .1) wake(); else last = 0;
  }
  function wake() { if (!frame && !finished && Number.isFinite(video.duration)) frame = requestAnimationFrame(render); }
  function advance(delta) {
    const state = window.rainPhone?.getState();
    if (finished || failed || !state?.ready || !state.activated || !document.querySelector('#editor').hidden) return;
    if (!position && state.coverage < .8) return;
    if (!Number.isFinite(video.duration) || (!position && !target && video.readyState < 2)) return;
    prepareStreet(); target = clamp(target + delta, 0, end()); wake();
  }
  addEventListener('wheel', e => {
    if (finished || e.ctrlKey || !document.querySelector('#editor').hidden) return;
    e.preventDefault(); e.stopImmediatePropagation();
    advance(clamp(e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1), -220, 220));
  }, {capture:true, passive:false});
  addEventListener('keydown', e => {
    if (finished) return;
    if (position > 0 && e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); target = 0; wake(); return; }
    if (['PageDown','PageUp',' '].includes(e.key)) { e.preventDefault(); advance(e.key === 'PageUp' ? -220 : 220); }
  }, true);
  layer.addEventListener('touchstart', e => { touchY = e.touches[0]?.clientY ?? null; }, {passive:true});
  layer.addEventListener('touchmove', e => {
    if (touchY === null || finished) return;
    e.preventDefault(); const y = e.touches[0].clientY; advance((touchY - y) * 2); touchY = y;
  }, {passive:false});
  layer.addEventListener('touchend', () => { touchY = null; });
  window.streetTransition = {getState: () => ({position,target,loaded,finished,time:video.currentTime,requested,duration:video.duration,end:end()})};
})();
