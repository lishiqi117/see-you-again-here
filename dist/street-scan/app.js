import {config} from './config.js';
import {ConstrainedRoute} from './route.js';
import {RegionScanner} from './scanner.js';
import {createHandCamera} from './camera-model.js';
import {applyRetroScene} from './retro-style.js';
import {createPrintFlow} from './printer-flow.js';
import {sounds} from '../sound-effects.source.js';
sounds.prepare(['shutter']);

const view = document.querySelector('#view');
const frame = document.querySelector('#street');
const startButton = document.querySelector('#start');
const progress = document.querySelector('#progress');
const fill = document.querySelector('#progress-fill');
const cursor = document.querySelector('#camera-model');
const entry = document.querySelector('#entry');
const result = document.querySelector('#result');
const finishNotice = document.querySelector('#finish-notice');
const status = document.querySelector('#record-status');
const thresholdPercent = Math.round(config.completionThreshold * 100);
const keys = new Set();
let engine, route, scanner, handCamera;
let active = false, finished = false, ready = false;
let yaw = 0, pitch = 0, lastTime = 0, pickTime = 0;
let pending = false, hit = null, hitTime = 0, epoch = 0, sampledPose = null;
let pointer = {x: innerWidth / 2, y: innerHeight / 2};
const lookAim = {x: 0, y: 0};
let scanHeld = false;
const rewardCard = document.querySelector('#reward-card');
const collectOptions = document.querySelector('#collect-options');
const collectedDetails = document.querySelector('#collected-details');
const printFlow = createPrintFlow();
let collected = false, savedCard = null;
try { savedCard = JSON.parse(localStorage.getItem('street-scan-sd-card')); } catch {}
if (!savedCard || !Number.isFinite(savedCard.percent) || !Number.isFinite(savedCard.count)) savedCard = null;
for (let i = 0; i < 26; i++) {
  const piece = document.createElement('i');
  piece.style.cssText = `--x:${(i * 37) % 100}%;--delay:${(i % 7) * -.23}s;--turn:${i * 47}deg;--drift:${(i % 2 ? 1 : -1) * (30 + i * 3)}px;--color:${['#d8d2b2','#74855b','#afb8c1','#b78950'][i % 4]}`;
  document.querySelector('#reward-confetti').append(piece);
}
function showReward(alreadyCollected = false) {
  collected = alreadyCollected;
  collectOptions.hidden = true; collectedDetails.hidden = !collected;
  rewardCard.setAttribute('aria-expanded', 'false');
  result.classList.toggle('collected', collected);
  document.querySelector('#result-title').textContent = collected ? 'Memory collected' : 'A memory to keep';
  document.querySelector('#result-description').textContent = collected ? '' : 'Click the SD card';
  result.showModal();
}
rewardCard.addEventListener('click', () => {
  if (collected) return;
  collectOptions.hidden = false; rewardCard.setAttribute('aria-expanded', 'true');
  document.querySelector('#collect-card').focus();
});
document.querySelector('#collect-cancel').addEventListener('click', () => {
  collectOptions.hidden = true; rewardCard.setAttribute('aria-expanded', 'false'); rewardCard.focus();
});
document.querySelector('#collect-card').addEventListener('click', () => {
  if (collected) return;
  collected = true;
  savedCard = {percent: Math.max(savedCard?.percent || 0, Math.floor(scanner.progress * 100)), count: Math.max(savedCard?.count || 0, scanner.done.size)};
  let persisted = true;
  try { localStorage.setItem('street-scan-sd-card', JSON.stringify(savedCard)); } catch { persisted = false; }
  collectOptions.hidden = true; collectedDetails.hidden = false;
  rewardCard.setAttribute('aria-expanded', 'false'); result.classList.add('collected');
  document.querySelector('#result-title').textContent = 'Memory collected';
  document.querySelector('#result-description').textContent = '';
  document.querySelector('#collection-status').textContent = persisted ? 'Added to your collection' : 'Collected for this session';
  const cardBounds = rewardCard.getBoundingClientRect();
  result.close();
  printFlow.collect(cardBounds);
});

function clearInput() {
  keys.clear(); hit = null; scanHeld = false;
  scanner?.resetDwell(); epoch++;
}
function positionCursor(x, y) {
  pointer = {x, y};
  // A small center zone makes returning to straight ahead easy and repeatable.
  const axis = value => Math.abs(value) <= .08 ? 0 : Math.sign(value) * Math.min(1, (Math.abs(value) - .08) / .92);
  lookAim.x = axis(x / innerWidth * 2 - 1);
  lookAim.y = axis(y / innerHeight * 2 - 1);
}
let lastProgress=-1,lastFinished=null;
function updateUI() {
  if(scanner.progress===lastProgress && finished===lastFinished)return;
  lastProgress=scanner.progress;lastFinished=finished;
  const percent = scanner.progress * 100;
  fill.style.width = `${percent}%`;
  progress.setAttribute('aria-label', `Captured ${Math.floor(percent)}%`);
  progress.setAttribute('aria-valuenow', String(Math.floor(percent)));
  document.querySelector('#progress-value').textContent = `${Math.floor(percent)}%`;
  finishNotice.hidden = finished || scanner.progress < config.completionThreshold;
  document.querySelector('#finish-message').textContent = percent >= 100 ? 'Every fragment captured!' : 'Goal reached!';
  finishNotice.querySelector('p:nth-child(2)').textContent = percent >= 100 ? 'Ready when you are.' : 'You can keep scanning to 100%.';
}
function complete() {
  if (finished || !scanner || scanner.progress < config.completionThreshold) return;
  finishNotice.hidden = true;
  finished = true; active = false; clearInput();
  document.body.classList.remove('running');
  entry.hidden = true;
  status.textContent = 'Scan complete';
  document.querySelector('#result-percent').textContent = `${Math.floor(scanner.progress * 100)}%`;
  document.querySelector('#result-count').textContent = `${scanner.done.size} / ${scanner.regions.length} street fragments`;
  showReward();
}
function review() {
  result.close(); entry.hidden = finished;
  if (!finished) { startButton.focus(); return; }
  document.querySelector('#review-again')?.remove();
  const button = document.createElement('button');
  button.id = 'review-again'; button.className = 'game-button'; button.textContent = collected ? 'View SD card' : 'Claim SD card';
  button.addEventListener('click', () => result.showModal());
  view.append(button); button.focus();
}
document.querySelector('#finish-scan').addEventListener('click', complete);
document.querySelector('#review').addEventListener('click', review);
document.querySelector('#restart').addEventListener('click', () => { result.close(); finished = true; start(); });
result.addEventListener('cancel', event => { event.preventDefault(); review(); });
let lastCameraPose='';
function setCamera() {
  const pose=[...route.pose().position,pitch,yaw].join(',');
  if(pose===lastCameraPose)return;
  lastCameraPose=pose;
  engine.viewer.global.camera.setPosition(...route.pose().position);
  engine.viewer.global.camera.setEulerAngles(pitch, yaw, 0);
  engine.viewer.global.app.renderNextFrame = true;
}
function pause() {
  if (!active) return;
  active = false; clearInput();
  document.body.classList.remove('running');
  startButton.hidden = false;
  entry.hidden = false; startButton.textContent = 'Resume scan';
  status.textContent = 'Paused';
}
function start(event) {
  if (!ready || printFlow.started) return;
  if (finished) {
    finished = false; route.reset(); scanner.reset();
    yaw = Math.atan2(-route.pose().direction[0], -route.pose().direction[2]) * 180 / Math.PI;
    pitch = 0; setCamera(); updateUI();
  }
  clearInput(); active = true;
  entry.hidden = true;
  document.querySelector('#review-again')?.remove();
  status.textContent = 'Recording';
  startButton.hidden = true;
  document.body.classList.add('running');
  positionCursor(innerWidth / 2, innerHeight / 2);
  view.focus();
}
startButton.addEventListener('click', start);
window.addEventListener('keydown', event => {
  if (event.code === 'Escape') { pause(); return; }
  if (!active) return;
  if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown'].includes(event.code)) {
    event.preventDefault(); keys.add(event.code);
  }
});
window.addEventListener('keyup', event => keys.delete(event.code));
window.addEventListener('blur', pause);
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
view.addEventListener('pointermove', event => {
  if (active) {
    if (event.target.closest('#finish-notice')) { positionCursor(innerWidth / 2, innerHeight / 2); return; }
    positionCursor(event.clientX, event.clientY);
  }
});
function stopScan() {
  scanHeld = false; hit = null; scanner?.resetDwell(); epoch++;
}
view.addEventListener('pointerdown', event => {
  if (!active || event.button !== 0 || event.target.closest('button, #finish-notice')) return;
  if(!scanHeld)sounds.play('shutter');
  scanHeld = true; hit = null; pickTime = 0; epoch++;
  positionCursor(event.clientX, event.clientY);
  if (event.isTrusted) view.setPointerCapture(event.pointerId);
});
window.addEventListener('pointerup', event => { if (event.button === 0) stopScan(); });
view.addEventListener('lostpointercapture', stopScan);
view.addEventListener('pointerleave', () => {positionCursor(innerWidth / 2, innerHeight / 2); stopScan();});
view.addEventListener('pointercancel', clearInput);
window.addEventListener('resize', () => positionCursor(Math.min(pointer.x, innerWidth), Math.min(pointer.y, innerHeight)));

async function sample(now) {
  if (!scanHeld || pending || now - pickTime < config.pickInterval) return;
  pending = true; pickTime = now;
  const token = epoch;
  const pose = {yaw, pitch, distance: route.distance, x: pointer.x, y: pointer.y};
  // The centered camera scans straight ahead, only while the left button is held.
  try {
    const point = await engine.viewer.picker.pick(.5, .5);
    if (token !== epoch || !active || !scanHeld) return;
    const camera = engine.viewer.global.camera.getPosition();
    hit = point && Math.hypot(point.x-camera.x, point.y-camera.y, point.z-camera.z) <= config.scanDistance ? point : null;
    sampledPose = pose; hitTime = performance.now() / 1000;
  } catch (error) {hit = null; console.warn(error);}
  finally {pending = false;}
}
function tick(ms) {
  requestAnimationFrame(tick);
  const now = ms / 1000, dt = Math.min(.25, lastTime ? now-lastTime : 0);
  lastTime = now;
  if (!ready) return;
  if (active) {
    route.update(dt, keys);
    const direction = route.pose().direction;
    const forwardYaw = Math.atan2(-direction[0], -direction[2]) * 180 / Math.PI;
    const follow = 1 - Math.exp(-14 * dt);
    yaw += (forwardYaw - lookAim.x * 85 - yaw) * follow;
    pitch += (-lookAim.y * 65 - pitch) * follow;
    if (Math.abs(yaw - forwardYaw) < .01 && lookAim.x === 0) yaw = forwardYaw;
    if (Math.abs(pitch) < .01 && lookAim.y === 0) pitch = 0;
    setCamera(); sample(now);
    const stable = sampledPose && Math.abs(yaw-sampledPose.yaw) < 3 && Math.abs(pitch-sampledPose.pitch) < 3 && Math.abs(route.distance-sampledPose.distance) < .3;
    if(scanner.update(scanHeld && stable && now-hitTime < 1.5 ? scanner.identify(hit) : -1, config.dwellSeconds))engine.viewer.global.app.renderNextFrame=true;
    updateUI();
  }
  handCamera?.setState(active, keys.has('KeyW'), {
    x: lookAim.x,
    y: lookAim.y,
    scanning: scanHeld
  });
}
async function initialize() {
  if (engine) return;
  engine = frame.contentWindow.scanEngine;
  if (!engine) return;
  window.engine = engine;
  const v = engine.viewer, started = performance.now();
  await new Promise((resolve, reject) => {
    function wait() {
      if (v.global.state.loaded) return resolve();
      if (performance.now()-started > 90000) return reject(Error('Scene load timeout'));
      setTimeout(wait, 100);
    }
    wait();
  });
  v.inputController = null; v.global.state.performanceMode = true;
  route = new ConstrainedRoute(config.route, config.speed, config.maxLateralOffset);
  scanner = new RegionScanner(config, route, v.global.app.scene.gsplat.material);
  yaw = Math.atan2(-route.pose().direction[0], -route.pose().direction[2]) * 180 / Math.PI;
  applyRetroScene(v);
  v.global.camera.camera.fov = config.fov;
  v.global.camera.camera.horizontalFov = true;
  setCamera(); ready = true; updateUI(); startButton.disabled = false;
  startButton.textContent = 'Start recording';
  window.streetScan = {get ready(){return ready;},get active(){return active;},get finished(){return finished;},get scanHeld(){return scanHeld;},route,scanner,config,get yaw(){return yaw;},get pitch(){return pitch;}};
  createHandCamera(cursor, config.handCamera).then(model => {
    handCamera = model; window.streetScan.handCamera = model;
    document.body.classList.add('model-ready');
  }).catch(error => {console.warn(error); cursor.hidden = true;});
}
function load() {
  initialize().catch(error => {
    console.error(error); startButton.disabled = false;
    startButton.textContent = 'Reload street';
    status.textContent = 'Load failed';
   
    startButton.onclick = () => location.reload();
  });
}
window.addEventListener('street-engine-ready', load);
frame.addEventListener('load', load);
load(); requestAnimationFrame(tick);
