(() => {
  'use strict';
  const archive = document.querySelector('#deskArchiveDialog');
  if (!archive) return;
  const root = './assets/lamp/archive-items/';
  // Positions use the same 1920 × 1080 coordinate system as the final frame.
  const objects = [
    { id: 'map', name: '街区地图', file: 'map.png', x: 286, y: 94, w: 562, h: 337, z: 1 },
    { id: 'newspaper', name: '社区报纸', file: 'newspaper.png', x: 1193, y: 735, w: 475, h: 277, z: 1 },
    { id: 'book', name: '蓝色学生手册', file: 'book-pocket.png', full: 'book-full.png', x: 568, y: 352, w: 333, h: 298, z: 2 },
    { id: 'character', name: '人物档案', file: 'character.png', x: 984, y: 87, w: 603, h: 856, z: 3 },
    { id: 'ticket', name: '巴士车票', file: 'ticket.png', x: 573, y: 827, w: 341, h: 184, z: 4 },
    { id: 'portrait', name: '彩色小照片', file: 'portrait.png', x: 1009, y: 451, w: 167, h: 178, z: 5 }
  ];
  const stage = document.createElement('div');
  stage.className = 'archive-objects';
  stage.setAttribute('aria-label', '档案里的物品');
  stage.setAttribute('aria-hidden', 'true');
  stage.inert = true;
  const plane = document.createElement('div');
  plane.className = 'archive-objects-plane';
  const base = document.createElement('img');
  base.src = root + 'folder.png';
  base.alt = '';
  base.className = 'archive-folder-base';
  plane.append(base);
  const frozen = document.createElement('canvas');
  frozen.width = 1920; frozen.height = 1080;
  frozen.className = 'archive-frozen-frame';
  plane.append(frozen);
  const layers = new Map();
  let frameCaptured = false;

  function shape(ctx, item, ox = 0, oy = 0, pad = 0) {
    const points = item.id === 'portrait'
      ? [[0,.17],[.8,0],[1,.87],[.17,1]]
      : item.id === 'book'
        ? [[.03,.04],[.96,0],[1,1],[.015,1]]
        : [[.015,.008],[.985,.008],[.995,.025],[.995,.985],[.015,.995],[.005,.97],[.005,.025]];
    points.forEach(([x,y],i) => {
      const px=item.x+x*item.w-ox+(x-.5)*pad*2, py=item.y+y*item.h-oy+(y-.5)*pad*2;
      if (!i) ctx.moveTo(px,py); else ctx.lineTo(px,py);
    });
    ctx.closePath();
  }

  function captureFrame() {
    const source = document.querySelector('#archiveOpeningCanvas');
    frozen.getContext('2d').drawImage(source, 0, 0, 1920, 1080);
    for (const item of objects) {
      const layer = layers.get(item.id);
      const ctx = layer.surface.getContext('2d');
      ctx.clearRect(0,0,item.w,item.h);
      ctx.save(); ctx.beginPath(); shape(ctx,item,item.x,item.y); ctx.clip();
      // Hidden paper under overlapping objects comes from its supplied cutout.
      // Every visible pixel comes from the SAME decoded frame as the backdrop.
      ctx.filter = 'blur(.85px) saturate(.94)';
      ctx.drawImage(layer.image,0,0,item.w,item.h);
      ctx.filter = 'none';
      ctx.beginPath(); ctx.rect(0,0,item.w,item.h);
      for (const upper of objects.filter(other=>other.z>item.z)) shape(ctx,upper,item.x,item.y,upper.id === 'portrait' ? 6 : 0);
      ctx.clip('evenodd');
      ctx.drawImage(frozen,item.x,item.y,item.w,item.h,0,0,item.w,item.h);
      ctx.restore();

      const under = layer.patch.getContext('2d');
      under.clearRect(0,0,item.w,item.h);
      under.save(); under.beginPath(); shape(under,item,item.x,item.y); under.clip();
      under.translate(-item.x,-item.y);
      under.filter = 'blur(.85px) saturate(.94)';
      under.drawImage(base,234,45,1447,991);
      for (const lower of objects.filter(other=>other.z<item.z)) {
        under.drawImage(layers.get(lower.id).image,lower.x,lower.y,lower.w,lower.h);
      }
      under.restore();
    }
    frameCaptured = true;
  }
  stage.append(plane);
  archive.insertBefore(stage, archive.querySelector('.desk-archive-close'));

  const viewer = document.createElement('dialog');
  viewer.className = 'archive-item-viewer';
  viewer.setAttribute('aria-label', '查看档案物品');
  viewer.innerHTML = '<img alt="" draggable="false"><button type="button" aria-label="放回档案">×</button>';
  archive.append(viewer);
  const preview = viewer.querySelector('img');
  let activeButton = null;
  for (const item of objects) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'archive-object';
    button.dataset.object = item.id;
    button.setAttribute('aria-label', `查看${item.name}`);
    button.setAttribute('aria-haspopup', 'dialog');
    Object.assign(button.style, {
      left: `${item.x}px`, top: `${item.y}px`, width: `${item.w}px`, height: `${item.h}px`, zIndex: item.z
    });
    const image = document.createElement('img');
    image.src = root + item.file;
    image.alt = item.name;
    image.draggable = false;
    button.append(image);
    const surface = document.createElement('canvas');
    surface.width = item.w; surface.height = item.h;
    surface.setAttribute('aria-hidden','true');
    button.append(surface);
    const patch = document.createElement('canvas');
    patch.width=item.w; patch.height=item.h;
    patch.className='archive-object-underlay';
    Object.assign(patch.style,{left: item.x+'px',top:item.y+'px',width:item.w+'px',height:item.h+'px',zIndex:0});
    plane.append(patch);
    let patchTimer;
    const lift=()=>{clearTimeout(patchTimer);patch.classList.add('exposed');};
    const settle=()=>{clearTimeout(patchTimer);patchTimer=setTimeout(()=>patch.classList.remove('exposed'),260);};
    button.addEventListener('pointerenter',lift);
    button.addEventListener('pointerleave',settle);
    button.addEventListener('focus',lift);
    button.addEventListener('blur',settle);
    layers.set(item.id,{image,surface,patch});
    button.addEventListener('click', () => {
      activeButton = button;
      if (item.id === 'portrait') {
        window.dispatchEvent(new CustomEvent('archive-portrait:open'));
        return;
      }
      preview.src = root + (item.full || item.file);
      preview.alt = item.id === 'book' ? '蓝色学生手册完整封面' : item.name;
      viewer.setAttribute('aria-label', preview.alt);
      viewer.showModal();
    });
    plane.append(button);
  }
  viewer.querySelector('button').addEventListener('click', () => viewer.close());
  viewer.addEventListener('click', event => { if (event.target === viewer) viewer.close(); });
  for (const type of ['wheel', 'pointerdown', 'pointermove', 'pointerup', 'keydown', 'keyup', 'touchstart', 'touchmove']) {
    viewer.addEventListener(type, event => {
      event.stopPropagation();
      if (type === 'wheel' || type === 'touchmove') event.preventDefault();
      if (type === 'keydown' && event.key === 'Escape') { event.preventDefault(); viewer.close(); }
    }, { passive: false });
  }
  viewer.addEventListener('close', event => {
    event.stopPropagation();
    if (archive.open && !stage.inert) activeButton?.focus({ preventScroll: true });
  });

  let assetsReady = false, complete = false;
  function update() {
    const show = assetsReady && complete && archive.open;
    if (show && !frameCaptured) captureFrame();
    if (!show) {
      frameCaptured=false;
      for (const {patch} of layers.values()) patch.classList.remove('exposed');
    }
    if (!show && stage.contains(document.activeElement) && archive.open) archive.focus({ preventScroll: true });
    stage.classList.toggle('visible', show);
    stage.inert = !show;
    stage.setAttribute('aria-hidden', String(!show));
    if (!show && viewer.open) viewer.close();
  }
  Promise.all([...plane.querySelectorAll('img')].map(image => image.decode()))
    .then(() => { assetsReady = true; update(); })
    .catch(error => console.error('档案物品加载失败', error));
  // Preload the complete cover before the player picks up the pocket version.
  const fullBook = new Image();
  fullBook.src = root + 'book-full.png';
  archive.addEventListener('archive:frame', event => { complete = event.detail.complete; update(); });
  archive.addEventListener('close', () => { complete = false; update(); });
  function resize() {
    const scale = Math.min(archive.clientWidth / 1920, archive.clientHeight / 1080);
    plane.style.transform = `translate(-50%, -50%) scale(${scale})`;
  }
  new ResizeObserver(resize).observe(archive);
  archive.addEventListener('archive:open', resize);
})();
