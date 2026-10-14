(() => {
  // sound-effects.source.js
  var page = new URL(document.baseURI);
  var relativeRoot = page.pathname.includes("/street-scan/") ? "../" : page.pathname.includes("/rain-phone/dist/") ? "../../" : "./";
  var base = new URL(relativeRoot + "assets/audio/effects/", page);
  var names = { lamp: "lamp.mp3", archive: "archive.mp3", wipe: "wipe-tight.mp3", printer: "printer.mp3", click: "click.mp3", drawer: "drawer-tight.mp3", shutter: "shutter.mp3" };
  var tracks = /* @__PURE__ */ new Map();
  function track(name) {
    if (!tracks.has(name)) {
      const audio = new Audio(new URL(names[name], base).href);
      audio.preload = "auto";
      tracks.set(name, { audio, wanted: false });
    }
    return tracks.get(name);
  }
  var sounds = {
    prepare(names2) {
      for (const name of names2) track(name);
    },
    play(name, { loop = false, restart = true } = {}) {
      const item = track(name), audio = item.audio;
      if (!restart && item.wanted && !audio.paused) return;
      item.wanted = true;
      audio.loop = loop;
      if (restart) audio.currentTime = 0;
      audio.play().then(() => {
        if (!item.wanted) audio.pause();
      }).catch(() => {
      });
    },
    stop(name) {
      const item = tracks.get(name);
      if (!item) return;
      item.wanted = false;
      item.audio.pause();
      item.audio.currentTime = 0;
    },
    stopAll() {
      for (const name of tracks.keys()) this.stop(name);
    }
  };
  window.SiteSounds = sounds;
  window.addEventListener("pagehide", () => sounds.stopAll());
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) sounds.stopAll();
  });
})();
