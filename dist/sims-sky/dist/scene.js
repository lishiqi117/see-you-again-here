'use strict';
const viewer = document.getElementById('photo-viewer');
const viewerImage = document.getElementById('viewer-image');
let viewerTrigger;
document.getElementById('close-viewer').onclick = () => viewer.close();
viewer.addEventListener('click', event => { if(event.target === viewer) viewer.close(); });
viewer.addEventListener('close', () => {
  document.body.classList.remove('viewing');
  viewerImage.removeAttribute('src');
  viewerTrigger?.focus({preventScroll:true});
});
// Enlarged pictures intentionally use the earlier independent, peg-free assets.
document.querySelectorAll('.object').forEach(object => {
  let release;
  object.addEventListener('click', () => {
    if(document.body.classList.contains('editing') || ['power','wind'].includes(object.dataset.interaction)) return;
    clearTimeout(release);
    object.classList.add('is-lifted');
    release = setTimeout(() => object.classList.remove('is-lifted'), 1000);
    viewerTrigger = object;
    viewerImage.src = object.dataset.full;
    viewerImage.alt = object.querySelector('img').alt.replace(/木夹子|夹着的|夹着|的木夹子/g,'');
    viewer.showModal();
    document.body.classList.add('viewing');
  });
});
