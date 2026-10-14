(() => {
  'use strict';

  const music = document.getElementById('backgroundMusic');
  music.volume = 0.3;

  function startMusic() {
    if (!music.paused) return;
    // Browsers may require a user gesture before allowing audible playback.
    music.play().catch(() => {});
  }

  for (const event of ['pointerdown', 'click', 'keydown']) {
    window.addEventListener(event, startMusic, { capture: true, passive: true });
  }
  window.addEventListener('pageshow', startMusic);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) startMusic();
  });
  startMusic();
})();
