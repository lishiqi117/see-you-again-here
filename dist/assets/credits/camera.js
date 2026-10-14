// Surveyed viewpoints in the original Gaussian-splat scan. Translate the
// camera (real parallax), keeping the lens fixed instead of scaling the DOM.
window.installCreditsCamera = viewer => {
  const slot = Math.max(0, Math.min(2, Number(location.hash.slice(1)) || 0));
  const shots = [
    {from:[9,1.7,4],to:[0,1.7,4],travel:.45},
    {from:[-8,1.7,-37],to:[-10,1.5,-30],travel:.38},
    {from:[-4,1.7,-17],to:[-8,1.4,-21],travel:.38}
  ];
  const shot = shots[slot], camera = viewer.cameraManager.camera;
  const V = camera.position.constructor;
  const from = new V(...shot.from), target = new V(...shot.to);
  const direction = target.clone().sub(from).normalize();
  const position = from.clone(), focus = target.clone(), offset = from.clone();
  let push = 0, active = true;
  const apply = () => {
    offset.copy(direction).mulScalar(push * shot.travel);
    position.copy(from).add(offset);
    focus.copy(target).add(offset);
    camera.look(position, focus);
    camera.fov = 65;
    viewer.global.app.renderNextFrame = active;
  };
  viewer.cameraManager.update = apply;
  viewer.global.app.autoRender = false;
  addEventListener('message', event => {
    if (event.source !== parent || event.data?.type !== 'credits-camera') return;
    const next = Number(event.data.push);
    if (!Number.isFinite(next)) return;
    push = Math.max(0, Math.min(1, next));
    active = !!event.data.active;
    apply();
  });
  apply();
  let rendered = 0;
  const announce = () => {
    if (++rendered < 4) { viewer.global.app.renderNextFrame = true; return; }
    viewer.global.app.off('postrender', announce);
    window.creditsReady = true;
    parent.postMessage({type:'credits-scene-ready',slot}, '*');
  };
  viewer.global.app.on('postrender', announce);
};
