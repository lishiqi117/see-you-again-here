(() => {
  // Retired navigation links now return to the single continuous experience.
  if (new URLSearchParams(location.search).get('from') === 'archive-portrait') {
    location.replace('./index.html?part=opening');
  }
})();
