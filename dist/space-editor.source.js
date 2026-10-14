import { createStarfieldBackground } from "./starfield-background.js";
import { createPrintPostprocessing } from "./print-postprocessing.js";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TransformControls } from "three/addons/controls/TransformControls.js";
import { clone as cloneSkeleton } from "three/addons/utils/SkeletonUtils.js";
import { gsap } from "gsap";
import { createPlanetWalker } from "./planet-walker.js";
import { createSchoolPortal } from "./school-portal.js";
import { encodeLayout, decodeLayout } from "./scene-layout-link.js";
import projectDefault from './assets/space-editor/default-layout.json';
import { Observer } from "gsap/Observer";

gsap.registerPlugin(Observer);
const archiveEmbedded = new URLSearchParams(location.search).get('embedded') === 'archive';
let archiveIntroProgress = 0;
let pendingArchiveProgress = null;
function setArchiveIntroProgress(progress) {
  if (!archiveEmbedded || !introTimeline || state.introCompleted) return;
  archiveIntroProgress = Math.max(0, Math.min(1, Number(progress) || 0));
  introAdvanceTween?.kill();
  introTimeline.pause().progress(archiveIntroProgress, false);
  invalidateRender();
}
window.addEventListener('message', event => {
  if (!archiveEmbedded || event.source !== parent) return;
  if (event.data?.type === 'archive:seek-scene') pendingArchiveProgress = event.data.progress;
});

const modelFile = (name) => `./assets/space-editor/models-optimized/${name}.glb`;

const MODEL_LIBRARY = {
  earth: { label: "地球", file: modelFile("earth") },
  school: { label: "校园", file: modelFile("school") },
  sun: { label: "太阳", file: modelFile("sun") },
  moon: { label: "月亮", file: modelFile("moon") },
  cloudBlob: { label: "云朵 A", file: modelFile("cloud-blob") },
  cloudSlime: { label: "云朵 B", file: modelFile("cloud-slime") },
  bird: { label: "小鸟", file: modelFile("bird") },
  appleTree: { label: "苹果树", file: modelFile("apple-tree") },
  cartoonTreeA: { label: "卡通树 A", file: modelFile("cartoon-tree-a") },
  cartoonTreeB: { label: "卡通树 B", file: modelFile("cartoon-tree-b") },
  stylizedTreeA: { label: "造型树 A", file: modelFile("stylized-tree-a") },
  stylizedTreeB: { label: "造型树 B", file: modelFile("stylized-tree-b") },
  star: { label: "星星", file: modelFile("star") },
  grass: { label: "草丛", file: modelFile("grass") }
};

const item = (id, name, model, position, rotation, scale) => ({
  id,
  name,
  model,
  position,
  rotation,
  scale: Array.isArray(scale) ? scale : [scale, scale, scale]
});

const INITIAL_LAYOUT = [
  item("earth", "地球", "earth", [0, -0.35, 0], [0, 12, 0], 6.3),
  item("school", "校园", "school", [0, 3.25, 0.55], [0, 0, 0], 3.35),
  item("sun", "太阳", "sun", [-5.75, 3.55, 0.15], [0, -8, 4], 2.1),
  item("moon", "月亮", "moon", [5.65, -3.15, 0.1], [0, 16, 0], 1.55),
  item("cloud-a", "云朵 A", "cloudBlob", [4.65, 3.45, 0.15], [0, -12, 0], 2.05),
  item("cloud-b", "云朵 B", "cloudSlime", [-5.15, 0.9, 0.1], [0, 14, -4], 1.85),
  item("bird", "小鸟", "bird", [4.95, 1.45, 0.65], [0, -14, 4], 1.05),
  item("apple-tree", "苹果树", "appleTree", [-3.35, 2.45, 0.55], [0, 10, 54], 1.55),
  item("cartoon-tree-a", "卡通树 A", "cartoonTreeA", [3.38, 2.3, 0.55], [0, -12, -55], 1.55),
  item("cartoon-tree-b", "卡通树 B", "cartoonTreeB", [-3.95, 0.15, 0.35], [0, 12, 88], 1.55),
  item("stylized-tree-a", "造型树 A", "stylizedTreeA", [4.0, 0.1, 0.4], [0, -10, -88], 1.5),
  item("stylized-tree-b", "造型树 B", "stylizedTreeB", [2.75, -2.75, 0.45], [0, 8, -136], 1.4),
  item("star-01", "星星 01", "star", [-3.25, 4.55, -0.7], [0, 12, -8], 0.72),
  item("star-02", "星星 02", "star", [-6.75, 2.7, -0.8], [0, -15, 14], 0.52),
  item("star-03", "星星 03", "star", [-6.2, -1.35, -0.75], [0, 9, -10], 0.58),
  item("star-04", "星星 04", "star", [-5.1, -3.75, -0.8], [0, -8, 16], 0.72),
  item("star-05", "星星 05", "star", [-1.75, 4.35, -0.85], [0, 18, 7], 0.45),
  item("star-06", "星星 06", "star", [2.45, 4.4, -0.8], [0, -10, -12], 0.48),
  item("star-07", "星星 07", "star", [6.4, 3.7, -0.75], [0, 12, 10], 0.68),
  item("star-08", "星星 08", "star", [6.55, -0.15, -0.8], [0, -16, -6], 0.5),
  item("star-09", "星星 09", "star", [4.65, -4.15, -0.8], [0, 11, 12], 0.62),
  item("grass-01", "草丛 01", "grass", [-1.95, 1.15, 3.05], [4, 0, -9], 0.52),
  item("grass-02", "草丛 02", "grass", [-0.42, 1.72, 2.92], [2, 12, 4], 0.47),
  item("grass-03", "草丛 03", "grass", [1.55, 1.08, 3.0], [-2, -10, 7], 0.5),
  item("grass-04", "草丛 04", "grass", [-1.0, 0.15, 3.25], [0, 18, -4], 0.48),
  item("grass-05", "草丛 05", "grass", [0.95, -0.05, 3.22], [0, -14, 6], 0.5),
  item("grass-06", "草丛 06", "grass", [-0.35, -1.22, 3.02], [2, 8, -8], 0.48),
  item("grass-07", "草丛 07", "grass", [1.82, -1.45, 2.7], [5, -12, 9], 0.52),
  item("grass-08", "草丛 08", "grass", [-1.9, -1.35, 2.76], [-3, 16, -7], 0.5)
];

const STORAGE_KEY = "crayon-space-editor-layout-v1";
const AUTO_SAVE_DELAY = 700;
const DEFAULT_CAMERA = {
  position: [0, 2.35, 15.4],
  target: [0, 0.15, 0]
};
const DEFAULT_VIEWER_SETTINGS = {
  horizontalAngle: 34,
  verticalAngle: 9,
  zoomPercent: 100
};
const PLAYER_MOTION = {
  centerRotateSpeed: 0.24,
  edgeRotateSpeed: 0.055,
  dragSpring: 4.2,
  releaseSpring: 14.5
};
const MODEL_PLAY = {
  minimumRange: 0.3,
  maximumRange: 0.72,
  radiusRangeFactor: 0.16,
  pressedScale: 1.035,
  maximumTilt: THREE.MathUtils.degToRad(6),
  minimumReturnDuration: 0.62,
  maximumReturnDuration: 0.88
};
const RENDER_QUALITY = {
  desktopPixelRatio: 1.15,
  mobilePixelRatio: 1,
  interactionScale: 0.74,
  minimumPixelRatio: 0.7,
  introWaitingRefreshInterval: 1000 / 30,
  idleRefreshInterval: 1000
};
const DEFAULT_CAMERA_DISTANCE = new THREE.Vector3(...DEFAULT_CAMERA.position)
  .distanceTo(new THREE.Vector3(...DEFAULT_CAMERA.target));
const DEFAULT_CAMERA_POLAR = Math.acos(
  (DEFAULT_CAMERA.position[1] - DEFAULT_CAMERA.target[1]) / DEFAULT_CAMERA_DISTANCE
);

const canvas = document.querySelector("#sceneCanvas");
const introBackgroundCanvas = document.querySelector("#introBackgroundCanvas");
const viewport = document.querySelector("#viewport");
const assetList = document.querySelector("#assetList");
const assetCount = document.querySelector("#assetCount");
const loadingOverlay = document.querySelector("#loadingOverlay");
const loadingText = document.querySelector("#loadingText");
const loadingBar = document.querySelector("#loadingBar");
const selectedName = document.querySelector("#selectedName");
const transformFields = document.querySelector("#transformFields");
const saveState = document.querySelector("#saveState");
const toast = document.querySelector("#toast");
const uniformScale = document.querySelector("#uniformScale");
const viewerYawInput = document.querySelector("#viewerYaw");
const viewerPitchInput = document.querySelector("#viewerPitch");
const viewerZoomInput = document.querySelector("#viewerZoom");
const viewerInputs = [viewerYawInput, viewerPitchInput, viewerZoomInput];
const modeButtons = [...document.querySelectorAll("[data-mode]")];
const transformInputs = [...document.querySelectorAll("[data-transform]")];

const state = {
  ready: false,
  introRunning: false,
  introCompleted: false,
  introPhase: "loading",
  introStep: 0,
  introStepAnimating: false,
  introFrameTimes: [],
  introPerformance: null,
  renderRequested: true,
  renderedFrames: 0,
  interactionQuality: false,
  transformDragging: false,
  dirty: false,
  editorVisible: false,
  playerPointerActive: false,
  playerDraggingAsset: null,
  hoveredAsset: null,
  viewerSettings: { ...DEFAULT_VIEWER_SETTINGS },
  selected: null,
  assets: [],
  assetsById: new Map(),
  clickableMeshes: [],
  failedModels: [],
  toastTimer: 0,
  pointerStart: null,
  suppressCanvasClick: false
};

let renderer;
let printPostprocessing;
let planetWalker = null;
let schoolPortal = null;
let scene;
let camera;
let orbitControls;
let transformControls;
let selectionHelper;
let resizeObserver;
let autoSaveTimer = 0;
let liquidScrollTarget = 0;
let introTimeline = null;
let introAdvanceTween = null;
let introObserver = null;
let introSteps = [];
let introMedia = null;
let introBackgroundPainter = null;
let introRigs = [];
let introRopeSystem = null;
let interactionQualityTimer = 0;

const playerCameraOffset = new THREE.Vector3();
const playerCameraSpherical = new THREE.Spherical();
const playerRaycaster = new THREE.Raycaster();
const playerPointer = new THREE.Vector2();
const playerDragPlane = new THREE.Plane();
const playerDragPoint = new THREE.Vector3();
const playerDragTarget = new THREE.Vector3();
const playerDragDelta = new THREE.Vector3();
const playerDragNormal = new THREE.Vector3();
const introAttachmentWorld = new THREE.Vector3();
const introAttachmentVertex = new THREE.Vector3();

const degToRad = (value) => THREE.MathUtils.degToRad(value);
const radToDeg = (value) => THREE.MathUtils.radToDeg(value);
const round = (value) => Number(value.toFixed(3));
const copyArray = (value) => value.map(Number);

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(state.toastTimer);
  state.toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2200);
}

function invalidateRender() {
  state.renderRequested = true;
}

function setInteractionQuality(active) {
  window.clearTimeout(interactionQualityTimer);
  if (active) {
    if (!state.interactionQuality) {
      state.interactionQuality = true;
      resizeRenderer();
    }
    return;
  }
  interactionQualityTimer = window.setTimeout(() => {
    if (state.interactionQuality) {
      state.interactionQuality = false;
      resizeRenderer();
    }
  }, 320);
}

function setDirty(dirty) {
  state.dirty = dirty;
  saveState.textContent = dirty ? "有未保存的更改" : (location.protocol === 'file:' ? "已保存到当前浏览器" : "布局已保存");
  window.clearTimeout(autoSaveTimer);
  if (!dirty || !state.ready) return;
  autoSaveTimer = window.setTimeout(async () => {
    try {
      await persistLayout(serializeLayout());
      state.dirty = false;
      saveState.textContent = location.protocol === 'file:' ? "已自动保存到当前浏览器" : "布局已自动保存";
    } catch (error) {
      saveState.textContent = "自动保存失败";
    }
  }, AUTO_SAVE_DELAY);
}

function clampViewerValue(value, min, max, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? THREE.MathUtils.clamp(number, min, max) : fallback;
}

function updateViewerInputs() {
  viewerYawInput.value = round(state.viewerSettings.horizontalAngle);
  viewerPitchInput.value = round(state.viewerSettings.verticalAngle);
  viewerZoomInput.value = round(state.viewerSettings.zoomPercent);
}

function applyViewerZoom() {
  const distance = DEFAULT_CAMERA_DISTANCE * (100 / state.viewerSettings.zoomPercent);
  const direction = camera.position.clone().sub(orbitControls.target);
  if (direction.lengthSq() < 0.0001) {
    direction.fromArray(DEFAULT_CAMERA.position).sub(new THREE.Vector3(...DEFAULT_CAMERA.target));
  }
  camera.position.copy(orbitControls.target).addScaledVector(direction.normalize(), distance);
  orbitControls.update();
}

function captureViewerZoom(markDirty = false) {
  const distance = camera.position.distanceTo(orbitControls.target);
  const nextZoom = clampViewerValue(
    (DEFAULT_CAMERA_DISTANCE / Math.max(distance, 0.001)) * 100,
    60,
    160,
    state.viewerSettings.zoomPercent
  );
  const changed = Math.abs(nextZoom - state.viewerSettings.zoomPercent) > 0.05;
  state.viewerSettings.zoomPercent = round(nextZoom);
  updateViewerInputs();
  if (changed && markDirty) setDirty(true);
}

function applyViewerInput(input) {
  if (input === viewerYawInput) {
    state.viewerSettings.horizontalAngle = clampViewerValue(input.value, 5, 70, 34);
  }
  if (input === viewerPitchInput) {
    state.viewerSettings.verticalAngle = clampViewerValue(input.value, 0, 30, 9);
  }
  if (input === viewerZoomInput) {
    state.viewerSettings.zoomPercent = clampViewerValue(input.value, 60, 160, 100);
    applyViewerZoom();
  }
  updateViewerInputs();
  setDirty(true);
}

function setLoadingProgress(loaded, total) {
  loadingText.textContent = `${loaded} / ${total}`;
  loadingBar.style.width = `${(loaded / total) * 100}%`;
}

function loadGLTF(loader, file) {
  return new Promise((resolve, reject) => loader.load(file, resolve, undefined, reject));
}

function buildNormalizedTemplate(gltf, modelKey) {
  const source = gltf.scene;
  source.updateMatrixWorld(true);

  source.traverse((child) => {
    if (child.isLight || child.isCamera) child.visible = false;
    if (!child.isMesh) return;
    child.castShadow = false;
    child.receiveShadow = false;
    child.frustumCulled = true;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.filter(Boolean).forEach((material) => {
      if ("envMapIntensity" in material) material.envMapIntensity = 0.35;
      material.needsUpdate = true;
    });
  });

  const bounds = new THREE.Box3().setFromObject(source);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const longestSide = Math.max(size.x, size.y, size.z, 0.001);
  const template = new THREE.Group();
  template.name = `${modelKey}-template`;
  source.position.sub(center);
  template.add(source);
  template.scale.setScalar(1 / longestSide);
  template.updateMatrixWorld(true);
  return template;
}

function createSoftHaloTexture() {
  const size = 256;
  const center = size / 2;
  const canvasTexture = document.createElement("canvas");
  canvasTexture.width = size;
  canvasTexture.height = size;
  const context = canvasTexture.getContext("2d");
  const gradient = context.createRadialGradient(center, center, 0, center, center, center);
  gradient.addColorStop(0, "rgba(255,255,255,0)");
  gradient.addColorStop(0.78, "rgba(255,255,255,0)");
  gradient.addColorStop(0.82, "rgba(255,255,255,0.05)");
  gradient.addColorStop(0.86, "rgba(255,255,255,0.24)");
  gradient.addColorStop(0.92, "rgba(255,255,255,0.12)");
  gradient.addColorStop(0.97, "rgba(255,255,255,0.03)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvasTexture);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createEarthGlow() {
  const glowGroup = new THREE.Group();
  const geometry = new THREE.SphereGeometry(0.508, 64, 40);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      glowColor: { value: new THREE.Color(0xdff5ff) }
    },
    vertexShader: `
      varying vec3 vViewNormal;
      varying vec3 vViewDirection;
      void main() {
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
        vViewNormal = normalize(normalMatrix * normal);
        vViewDirection = normalize(-viewPosition.xyz);
        gl_Position = projectionMatrix * viewPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 glowColor;
      varying vec3 vViewNormal;
      varying vec3 vViewDirection;
      void main() {
        float facing = max(dot(normalize(vViewNormal), normalize(vViewDirection)), 0.0);
        float rim = pow(1.0 - facing, 3.2);
        gl_FragColor = vec4(glowColor, rim * 0.28);
      }
    `,
    side: THREE.BackSide,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthTest: true,
    depthWrite: false,
    toneMapped: false
  });
  const rimGlow = new THREE.Mesh(geometry, material);
  rimGlow.name = "earth-rim-glow";
  rimGlow.renderOrder = 2;

  const haloMaterial = new THREE.SpriteMaterial({
    map: createSoftHaloTexture(),
    color: 0xe4f6ff,
    transparent: true,
    opacity: 0.72,
    blending: THREE.AdditiveBlending,
    depthTest: true,
    depthWrite: false,
    toneMapped: false
  });
  const halo = new THREE.Sprite(haloMaterial);
  halo.name = "earth-soft-halo";
  halo.scale.set(1.18, 1.18, 1);
  halo.renderOrder = -1;

  glowGroup.name = "earth-outline-glow";
  glowGroup.userData.isEditorHelper = true;
  glowGroup.add(rimGlow, halo);
  return glowGroup;
}

function createSceneAsset(config, template) {
  const pivot = new THREE.Group();
  const content = cloneSkeleton(template);
  pivot.name = config.name;
  pivot.userData.assetId = config.id;
  pivot.userData.modelKey = config.model;
  pivot.userData.source = MODEL_LIBRARY[config.model].file;
  pivot.position.fromArray(config.position);
  pivot.rotation.set(...config.rotation.map(degToRad));
  pivot.scale.fromArray(config.scale);
  pivot.add(content);

  if (config.model === "earth") pivot.add(createEarthGlow());

  content.traverse((child) => {
    if (!child.isMesh) return;
    child.userData.assetId = config.id;
    state.clickableMeshes.push(child);
  });

  const asset = {
    id: config.id,
    name: config.name,
    model: config.model,
    source: MODEL_LIBRARY[config.model].file,
    pivot,
    content,
    initial: {
      position: copyArray(config.position),
      rotation: copyArray(config.rotation),
      scale: copyArray(config.scale)
    },
    playerRest: null,
    playerSpring: null,
    playerPressTween: null,
    listButton: null
  };

  state.assets.push(asset);
  state.assetsById.set(asset.id, asset);
  scene.add(pivot);
  invalidateRender();
  return asset;
}

function stableUnit(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function findTopSurfaceAttachment(asset, bounds, size) {
  let foundSurface = false;
  let highestWorldY = -Infinity;
  const highestPoint = new THREE.Vector3();

  asset.content.traverse((child) => {
    if (!child.isMesh) return;
    const positionAttribute = child.geometry?.getAttribute("position");
    if (!positionAttribute) return;
    for (let index = 0; index < positionAttribute.count; index += 1) {
      if (typeof child.getVertexPosition === "function") {
        child.getVertexPosition(index, introAttachmentVertex);
      } else {
        introAttachmentVertex.fromBufferAttribute(positionAttribute, index);
      }
      introAttachmentVertex.applyMatrix4(child.matrixWorld);
      if (introAttachmentVertex.y <= highestWorldY) continue;
      highestWorldY = introAttachmentVertex.y;
      highestPoint.copy(introAttachmentVertex);
      foundSurface = true;
    }
  });

  if (!foundSurface) {
    bounds.getCenter(highestPoint);
    highestPoint.y = bounds.max.y;
  }
  highestPoint.y -= THREE.MathUtils.clamp(size.y * 0.012, 0.012, 0.04);
  return asset.pivot.worldToLocal(highestPoint.clone());
}

function rigAttachmentWorld(rig, target = introAttachmentWorld) {
  rig.asset.pivot.updateWorldMatrix(true, false);
  return target.copy(rig.attachmentLocal).applyMatrix4(rig.asset.pivot.matrixWorld);
}

function createMarionetteRig(asset) {
  asset.pivot.updateWorldMatrix(true, true);
  const bounds = new THREE.Box3().setFromObject(asset.content);
  const size = bounds.getSize(new THREE.Vector3());
  const seed = stableUnit(asset.id);
  const targetPosition = asset.pivot.position.clone();
  const targetRotation = asset.pivot.rotation.clone();
  const targetScale = asset.pivot.scale.clone();
  const halfHeight = Math.max(0.16, size.y * 0.48);
  const attachmentLocal = findTopSurfaceAttachment(asset, bounds, size);
  const startPosition = targetPosition.clone();
  startPosition.x += (seed - 0.5) * 0.72;
  startPosition.y = 7.2 + halfHeight + seed * 1.4;
  startPosition.z += (stableUnit(`${asset.id}-depth`) - 0.5) * 0.18;

  asset.pivot.position.copy(startPosition);
  asset.pivot.rotation.set(
    targetRotation.x + degToRad((seed - 0.5) * 18),
    targetRotation.y + degToRad((stableUnit(`${asset.id}-yaw`) - 0.5) * 14),
    targetRotation.z + degToRad((stableUnit(`${asset.id}-roll`) - 0.5) * 24),
    targetRotation.order
  );
  asset.pivot.updateWorldMatrix(true, false);
  const startAttachment = attachmentLocal.clone().applyMatrix4(asset.pivot.matrixWorld);
  const anchor = new THREE.Vector3(
    startAttachment.x + (stableUnit(`${asset.id}-anchor`) - 0.5) * 0.28,
    startAttachment.y + 1.05,
    startAttachment.z
  );
  asset.pivot.visible = false;

  return {
    asset,
    targetPosition,
    targetRotation,
    targetScale,
    anchor,
    attachmentLocal,
    seed,
    ropeOffset: 0,
    motion: { retract: 0, active: 0, startedAt: 0 }
  };
}

function createIntroRopeBatch(rigs) {
  const segmentCount = 5;
  const valuesPerRope = segmentCount * 2 * 3;
  const positions = new Float32Array(rigs.length * valuesPerRope);
  rigs.forEach((rig, rigIndex) => {
    rig.ropeOffset = rigIndex * valuesPerRope;
    for (let index = 0; index < valuesPerRope; index += 3) {
      positions[rig.ropeOffset + index] = rig.anchor.x;
      positions[rig.ropeOffset + index + 1] = rig.anchor.y;
      positions[rig.ropeOffset + index + 2] = rig.anchor.z;
    }
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.attributes.position.setUsage(THREE.DynamicDrawUsage);
  const material = new THREE.LineBasicMaterial({
    color: 0xddeaf2,
    transparent: true,
    opacity: 0.64,
    depthTest: true,
    depthWrite: false,
    toneMapped: false
  });
  const lines = new THREE.LineSegments(geometry, material);
  lines.name = "marionette-strings";
  lines.frustumCulled = false;
  lines.renderOrder = -2;
  lines.userData.isEditorHelper = true;
  scene.add(lines);
  return { lines, geometry, material, positions, segmentCount };
}

function updateIntroRopes(frameTime) {
  if (!introRigs.length || !introRopeSystem) return;
  const seconds = frameTime / 1000;
  let changed = false;
  introRigs.forEach((rig) => {
    if (!rig.motion.active) return;
    const positions = introRopeSystem.positions;
    const attachment = rigAttachmentWorld(rig);
    const endX = THREE.MathUtils.lerp(attachment.x, rig.anchor.x, rig.motion.retract);
    const endY = THREE.MathUtils.lerp(attachment.y, rig.anchor.y, rig.motion.retract);
    const endZ = THREE.MathUtils.lerp(attachment.z, rig.anchor.z, rig.motion.retract);
    const elapsed = Math.max(0, seconds - rig.motion.startedAt);
    const amplitude = 0.12 * (0.08 + Math.exp(-elapsed * 1.45) * 0.92) * (1 - rig.motion.retract);
    const sag = 0.08 * (1 - rig.motion.retract);
    for (let index = 0; index < introRopeSystem.segmentCount; index += 1) {
      const firstProgress = index / introRopeSystem.segmentCount;
      const secondProgress = (index + 1) / introRopeSystem.segmentCount;
      const firstCurve = Math.sin(firstProgress * Math.PI);
      const secondCurve = Math.sin(secondProgress * Math.PI);
      const firstWave = Math.sin(seconds * 4.1 + rig.seed * 12 + firstProgress * 3.5) * amplitude * firstCurve;
      const secondWave = Math.sin(seconds * 4.1 + rig.seed * 12 + secondProgress * 3.5) * amplitude * secondCurve;
      const offset = rig.ropeOffset + index * 6;
      positions[offset] = THREE.MathUtils.lerp(rig.anchor.x, endX, firstProgress) + firstWave;
      positions[offset + 1] = THREE.MathUtils.lerp(rig.anchor.y, endY, firstProgress) - firstCurve * sag;
      positions[offset + 2] = THREE.MathUtils.lerp(rig.anchor.z, endZ, firstProgress) + firstWave * 0.18;
      positions[offset + 3] = THREE.MathUtils.lerp(rig.anchor.x, endX, secondProgress) + secondWave;
      positions[offset + 4] = THREE.MathUtils.lerp(rig.anchor.y, endY, secondProgress) - secondCurve * sag;
      positions[offset + 5] = THREE.MathUtils.lerp(rig.anchor.z, endZ, secondProgress) + secondWave * 0.18;
    }
    changed = true;
  });
  if (changed) introRopeSystem.geometry.attributes.position.needsUpdate = true;
}

function introRopeConnectionReport() {
  if (!introRopeSystem) return { activeCount: 0, totalCount: introRigs.length, maximumError: 0 };
  let activeCount = 0;
  let maximumError = 0;
  const expected = new THREE.Vector3();
  const rendered = new THREE.Vector3();
  const lastPointOffset = introRopeSystem.segmentCount * 6 - 3;

  introRigs.forEach((rig) => {
    if (!rig.motion.active) return;
    activeCount += 1;
    const attachment = rigAttachmentWorld(rig, expected);
    expected.set(
      THREE.MathUtils.lerp(attachment.x, rig.anchor.x, rig.motion.retract),
      THREE.MathUtils.lerp(attachment.y, rig.anchor.y, rig.motion.retract),
      THREE.MathUtils.lerp(attachment.z, rig.anchor.z, rig.motion.retract)
    );
    const offset = rig.ropeOffset + lastPointOffset;
    rendered.fromArray(introRopeSystem.positions, offset);
    maximumError = Math.max(maximumError, rendered.distanceTo(expected));
  });

  return {
    activeCount,
    totalCount: introRigs.length,
    maximumError: Number(maximumError.toFixed(6))
  };
}

function revealRig(rig) {
  rig.asset.pivot.visible = true;
  rig.motion.active = 1;
  rig.motion.startedAt = performance.now() / 1000;
}

function addDropGroup(timeline, rigs, at, stagger, duration) {
  rigs.forEach((rig, index) => {
    const position = at + index * stagger;
    timeline.call(() => revealRig(rig), null, position);
    timeline.to(rig.asset.pivot.position, {
      x: rig.targetPosition.x,
      y: rig.targetPosition.y,
      z: rig.targetPosition.z,
      duration,
      ease: rig.asset.introEase || "back.out(1.12)",
      onComplete: () => {
        rig.asset.pivot.position.copy(rig.targetPosition);
        rig.asset.pivot.rotation.copy(rig.targetRotation);
        rig.asset.pivot.scale.copy(rig.targetScale);
      }
    }, position);
    timeline.to(rig.asset.pivot.rotation, {
      x: rig.targetRotation.x,
      y: rig.targetRotation.y,
      z: rig.targetRotation.z,
      duration: duration * 0.82,
      ease: "back.out(1.2)"
    }, position);
  });
}

function staggeredStageEnd(start, rigs, stagger, duration) {
  return start + duration + Math.max(0, rigs.length - 1) * stagger;
}

function announceIntroAwaitingInput() {
  const nextStep = introSteps[state.introStep];
  const awaitingInput = Boolean(state.introRunning && !state.introStepAnimating && nextStep);
  if (awaitingInput) {
    window.dispatchEvent(new CustomEvent("space-editor-intro-awaiting-input", {
      detail: { step: state.introStep + 1, total: introSteps.length, title: nextStep.title }
    }));
  }
}

function teardownIntroInteraction(killTween = false) {
  introObserver?.kill();
  introObserver = null;
  if (killTween) introAdvanceTween?.kill();
  introAdvanceTween = null;
}

function advanceOpeningStep() {
  const stepIndex = state.introStep;
  const step = introSteps[stepIndex];
  if (!state.introRunning || state.introStepAnimating || !introTimeline || !step) return false;

  state.introStep = stepIndex + 1;
  state.introStepAnimating = true;
  window.dispatchEvent(new CustomEvent("space-editor-intro-step-start", {
    detail: { step: state.introStep, total: introSteps.length, title: step.title }
  }));

  introAdvanceTween = introTimeline.tweenTo(step.target, {
    ease: "none",
    onComplete: () => {
      introAdvanceTween = null;
      if (state.introCompleted) return;
      state.introStepAnimating = false;
      announceIntroAwaitingInput();
      window.dispatchEvent(new CustomEvent("space-editor-intro-step-complete", {
        detail: { step: state.introStep, total: introSteps.length, title: step.title }
      }));
    }
  });
  return true;
}

function setupIntroInteraction() {
  teardownIntroInteraction(true);
  introObserver = Observer.create({
    target: viewport,
    type: "wheel,touch",
    preventDefault: true,
    tolerance: 1,
    debounce: true,
    onChangeY: (observer) => {
      const delta = observer.event?.type === 'wheel' ? observer.deltaY : -observer.deltaY;
      if (state.introStep !== 0) {
        if (delta > 0) advanceOpeningStep();
        return;
      }
      liquidScrollTarget = THREE.MathUtils.clamp(liquidScrollTarget + delta / 900, 0, 1);
      introAdvanceTween?.kill();
      state.introStepAnimating = true;
      introAdvanceTween = gsap.to(introTimeline, {
        time: liquidScrollTarget * introSteps[0].target,
        duration: 0.18,
        ease: 'power1.out',
        onComplete: () => {
          introAdvanceTween = null;
          state.introStepAnimating = false;
          if (liquidScrollTarget >= 1) {
            state.introStep = 1;
            announceIntroAwaitingInput();
            window.dispatchEvent(new CustomEvent('space-editor-intro-step-complete', {
              detail: { step: 1, total: introSteps.length, title: introSteps[0].title }
            }));
          }
        }
      });
    }
  });
  announceIntroAwaitingInput();
}

function cleanupIntroRigs(restoreTransforms = true) {
  introRigs.forEach((rig) => {
    if (restoreTransforms) {
      rig.asset.pivot.position.copy(rig.targetPosition);
      rig.asset.pivot.rotation.copy(rig.targetRotation);
      rig.asset.pivot.scale.copy(rig.targetScale);
      rig.asset.pivot.visible = true;
    }
  });
  if (introRopeSystem) {
    scene.remove(introRopeSystem.lines);
    introRopeSystem.geometry.dispose();
    introRopeSystem.material.dispose();
    introRopeSystem = null;
  }
  introRigs = [];
  planetWalker?.finishIntro();
  invalidateRender();
}

function finishOpeningSequence(restoredSavedLayout) {
  if (state.introCompleted) return;
  teardownIntroInteraction(false);
  state.introStepAnimating = false;
  introBackgroundPainter?.paint(1);
  document.body.classList.remove("intro-pending");

  gsap.set(canvas, { clearProps: "opacity" });
  cleanupIntroRigs(true);
  if (state.introFrameTimes.length) {
    const frameTimes = [...state.introFrameTimes].sort((first, second) => first - second);
    const average = state.introFrameTimes.reduce((sum, value) => sum + value, 0) / state.introFrameTimes.length;
    state.introPerformance = {
      averageMs: round(average),
      p95Ms: round(frameTimes[Math.floor(frameTimes.length * 0.95)]),
      framesOver25ms: frameTimes.filter((value) => value > 25).length,
      sampleCount: frameTimes.length
    };
  }
  state.ready = true;
  state.introRunning = false;
  state.introCompleted = true;
  state.introPhase = "complete";
  orbitControls.enabled = true;
  canvas.focus({ preventScroll: true });
  resizeRenderer();
  setDirty(!restoredSavedLayout);
  if (state.failedModels.length) {
    showToast(`有 ${state.failedModels.length} 个模型加载失败，其他资产仍可编辑`);
  }
  window.dispatchEvent(new CustomEvent("space-editor-intro-complete"));
  window.dispatchEvent(new CustomEvent("space-editor-ready"));
}

function playOpeningTimeline(restoredSavedLayout) {
  state.introRunning = true;
  state.introPhase = "background";
  liquidScrollTarget = 0;
  state.introStep = 0;
  state.introStepAnimating = false;
  state.introFrameTimes = [];
  state.introPerformance = null;
  orbitControls.enabled = false;
  const characterIntroAsset = planetWalker?.prepareIntro();
  introRigs = [...state.assets, ...(characterIntroAsset ? [characterIntroAsset] : [])].map(createMarionetteRig);
  introRopeSystem = createIntroRopeBatch(introRigs);
  document.body.classList.add('scene-prepared');
  resizeRenderer();
  invalidateRender();

  const byIds = (ids) => ids.map((id) => introRigs.find((rig) => rig.asset.id === id)).filter(Boolean);
  const primary = byIds(["earth", "school"]);
  const vegetation = introRigs.filter((rig) => rig.asset.model.includes("Tree"));
  const sky = byIds(["sun", "moon", "cloud-a", "cloud-b", "bird"]);
  const stars = introRigs.filter((rig) => rig.asset.model === "star");
  const grass = introRigs.filter((rig) => rig.asset.model === "grass");
  const paint = { progress: 0 };

  introTimeline = gsap.timeline({
    paused: true,
    defaults: { overwrite: "auto" },
    onComplete: () => finishOpeningSequence(restoredSavedLayout)
  });

  const backgroundAt = 0;
  const backgroundEnd = backgroundAt + 2.55;
  introTimeline.addLabel("draw", backgroundAt).to(paint, {
    progress: 1,
    duration: 2.55,
    ease: "power1.inOut",
    onUpdate: () => introBackgroundPainter?.paint(paint.progress),
    onComplete: () => {
      introBackgroundPainter?.paint(1);
      state.introPhase = "models-primary";
      window.dispatchEvent(new CustomEvent("space-editor-intro-background-complete"));
    }
  }, "draw");

  const primaryAt = backgroundEnd;
  const primaryEnd = staggeredStageEnd(primaryAt, primary, 0.2, 1.8);
  introTimeline.addLabel("primary", primaryAt);
  addDropGroup(introTimeline, primary, primaryAt, 0.2, 1.8);

  const vegetationAt = primaryEnd;
  const vegetationEnd = staggeredStageEnd(vegetationAt, vegetation, 0.1, 1.5);
  introTimeline.call(() => { state.introPhase = "models-vegetation"; }, null, vegetationAt);
  introTimeline.addLabel("vegetation", vegetationAt);
  addDropGroup(introTimeline, vegetation, vegetationAt, 0.1, 1.5);

  const skyAt = vegetationEnd;
  const skyEnd = staggeredStageEnd(skyAt, sky, 0.11, 1.45);
  introTimeline.call(() => { state.introPhase = "models-sky"; }, null, skyAt);
  introTimeline.addLabel("sky", skyAt);
  addDropGroup(introTimeline, sky, skyAt, 0.11, 1.45);

  const detailsAt = skyEnd;
  const starsEnd = staggeredStageEnd(detailsAt, stars, 0.055, 1.05);
  const grassAt = detailsAt + 0.4;
  const grassEnd = staggeredStageEnd(grassAt, grass, 0.065, 1.05);
  const character = byIds(['walking-girl']);
  const characterAt = Math.max(starsEnd, grassEnd) + 0.12;
  const detailsEnd = character.length ? characterAt + 1.65 : Math.max(starsEnd, grassEnd);
  introTimeline.call(() => { state.introPhase = "models-details"; }, null, detailsAt);
  introTimeline.addLabel("details", detailsAt);
  addDropGroup(introTimeline, stars, detailsAt, 0.055, 1.05);
  addDropGroup(introTimeline, grass, grassAt, 0.065, 1.05);
  introTimeline.addLabel('character', characterAt);
  addDropGroup(introTimeline, character, characterAt, 0, 1.65);

  const retractAt = detailsEnd + 0.18;
  const retractEnd = retractAt + 0.62 + Math.max(0, introRigs.length - 1) * 0.012;
  introTimeline.call(() => {
    state.introPhase = "strings-retracting";
    window.dispatchEvent(new CustomEvent("space-editor-intro-strings-retracting"));
  }, null, retractAt);
  introTimeline.to(introRigs.map((rig) => rig.motion), {
    retract: 1,
    duration: 0.62,
    ease: "power3.in",
    stagger: 0.012,
    onComplete: () => {
      updateIntroRopes(performance.now());
      introRigs.forEach((rig) => { rig.motion.active = 0; });
      if (introRopeSystem) introRopeSystem.lines.visible = false;
    }
  }, retractAt);

  introSteps = [
    { target: backgroundEnd, title: "第一幕 · 背景" },
    { target: primaryEnd, title: "第二幕 · 主体" },
    { target: vegetationEnd, title: "第三幕 · 树木" },
    { target: skyEnd, title: "第四幕 · 天空" },
    { target: retractEnd, title: "第五幕 · 细节与收尾" }
  ];
  if (!archiveEmbedded) setupIntroInteraction();
  else requestAnimationFrame(() => requestAnimationFrame(() => parent.postMessage({ type: 'archive:scene-ready' }, '*')));
}

async function startOpeningSequence(restoredSavedLayout) {
  introBackgroundPainter = createStarfieldBackground(introBackgroundCanvas, viewport);

  if (archiveEmbedded) {
    playOpeningTimeline(restoredSavedLayout);
    return;
  }
  introMedia = gsap.matchMedia();
  introMedia.add({
    reduced: "(prefers-reduced-motion: reduce)",
    animated: "(prefers-reduced-motion: no-preference)"
  }, (context) => {
    if (state.introCompleted) return undefined;
    if (context.conditions.reduced) {
      document.body.classList.add('scene-prepared');
      teardownIntroInteraction(true);
      state.introRunning = true;
      state.introPhase = "reduced-motion";
      orbitControls.enabled = false;
      document.body.classList.remove("intro-pending");
      introBackgroundPainter?.paint(1);
      state.assets.forEach((asset) => { asset.pivot.visible = true; });
      gsap.fromTo(canvas, { opacity: 0 }, {
        opacity: 1,
        duration: 0.45,
        ease: "power1.out",
        onComplete: () => finishOpeningSequence(restoredSavedLayout)
      });
    } else {
      playOpeningTimeline(restoredSavedLayout);
    }

    return () => {
      teardownIntroInteraction(true);
      introTimeline?.kill();
      introTimeline = null;
      if (!state.introCompleted) cleanupIntroRigs(true);
    };
  });
}

function buildAssetList() {
  const fragment = document.createDocumentFragment();
  state.assets.forEach((asset) => {
    const button = document.createElement("button");
    const name = document.createElement("strong");
    const kind = document.createElement("small");
    button.type = "button";
    button.className = "asset-item";
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", "false");
    button.dataset.assetId = asset.id;
    name.textContent = asset.name;
    kind.textContent = MODEL_LIBRARY[asset.model].label;
    button.append(name, kind);
    button.addEventListener("click", () => {
      selectAsset(asset);
      if (window.matchMedia("(max-width: 840px)").matches) closeMobilePanels();
    });
    asset.listButton = button;
    fragment.append(button);
  });
  assetList.replaceChildren(fragment);
  assetCount.textContent = String(state.assets.length);
}

function clearSelection() {
  if (state.selected?.isAll) {
    scene.remove(state.selected.pivot);
    state.assets.forEach(asset => {
      asset.listButton?.classList.remove('is-selected');
      asset.listButton?.setAttribute('aria-selected', 'false');
    });
  }
  modeButtons.forEach(button => { button.disabled = false; });
  transformInputs.forEach(input => { input.disabled = false; });
  document.querySelector('#resetSelected').disabled = false;
  if (state.selected?.listButton) {
    state.selected.listButton.classList.remove("is-selected");
    state.selected.listButton.setAttribute("aria-selected", "false");
  }
  state.selected = null;
  selectedName.textContent = "未选择资产";
  transformFields.disabled = true;
  transformControls.detach();
  selectionHelper.visible = false;
  invalidateRender();
}

function selectAsset(asset) {
  if (state.selected?.isAll) clearSelection();
  if (!asset) {
    clearSelection();
    return;
  }
  if (state.selected?.listButton && state.selected !== asset) {
    state.selected.listButton.classList.remove("is-selected");
    state.selected.listButton.setAttribute("aria-selected", "false");
  }
  state.selected = asset;
  selectedName.textContent = asset.name;
  transformFields.disabled = false;
  asset.listButton?.classList.add("is-selected");
  asset.listButton?.setAttribute("aria-selected", "true");
  asset.listButton?.scrollIntoView({ block: "nearest" });
  transformControls.attach(asset.pivot);
  selectionHelper.setFromObject(asset.content);
  selectionHelper.visible = true;
  updateInspector();
  invalidateRender();
}

function selectAllAssets() {
  if (!state.ready || !state.editorVisible || state.introRunning) return;
  clearSelection();
  const pivot = new THREE.Group();
  state.assets.forEach(asset => pivot.position.add(asset.pivot.position));
  pivot.position.divideScalar(state.assets.length);
  scene.add(pivot);
  // Bounds-only container: asset parents remain the scene, preserving saved transforms.
  const content = new THREE.Group();
  content.children = state.assets.map(asset => asset.pivot);
  state.selected = { id: 'all', name: '全部物体', isAll: true, pivot, content, previousPosition: pivot.position.clone() };
  selectedName.textContent = `全部 ${state.assets.length} 个物体 · 整体移动`;
  transformFields.disabled = false;
  state.assets.forEach(asset => {
    asset.listButton?.classList.add('is-selected');
    asset.listButton?.setAttribute('aria-selected', 'true');
  });
  setTransformMode('translate');
  modeButtons.forEach(button => { button.disabled = button.dataset.mode !== 'translate'; });
  transformInputs.forEach(input => { input.disabled = !input.dataset.transform.startsWith('position.'); });
  document.querySelector('#resetSelected').disabled = true;
  transformControls.attach(pivot);
  selectionHelper.setFromObject(content);
  selectionHelper.visible = true;
  updateInspector();
  invalidateRender();
}

function applyWholeSceneTranslation() {
  const selection = state.selected;
  if (!selection?.isAll) return;
  const delta = selection.pivot.position.clone().sub(selection.previousPosition);
  state.assets.forEach(asset => { asset.pivot.position.add(delta); asset.pivot.updateMatrixWorld(true); });
  selection.previousPosition.copy(selection.pivot.position);
}

function updateInspector() {
  if (!state.selected) return;
  const { position, rotation, scale } = state.selected.pivot;
  const values = {
    "position.x": position.x,
    "position.y": position.y,
    "position.z": position.z,
    "rotation.x": radToDeg(rotation.x),
    "rotation.y": radToDeg(rotation.y),
    "rotation.z": radToDeg(rotation.z),
    "scale.x": scale.x,
    "scale.y": scale.y,
    "scale.z": scale.z
  };
  transformInputs.forEach((input) => {
    const key = input.dataset.transform;
    input.value = round(values[key] ?? 0);
  });
}

function applyInputChange(input) {
  if (!state.selected) return;
  const value = Number(input.value);
  if (!Number.isFinite(value)) {
    updateInspector();
    return;
  }
  const [group, axis] = input.dataset.transform.split(".");
  const pivot = state.selected.pivot;

  if (group === "position") pivot.position[axis] = value;
  if (group === "rotation") pivot.rotation[axis] = degToRad(value);
  if (group === "scale") {
    const nextScale = Math.max(0.05, value);
    if (uniformScale.checked) pivot.scale.setScalar(nextScale);
    else pivot.scale[axis] = nextScale;
  }

  applyWholeSceneTranslation();
  selectionHelper.setFromObject(state.selected.content);
  updateInspector();
  setDirty(true);
  invalidateRender();
}

function setTransformMode(mode) {
  if (state.selected?.isAll && mode !== 'translate') return;
  transformControls.setMode(mode);
  transformControls.setSpace(mode === "scale" ? "local" : "world");
  modeButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.mode === mode));
  invalidateRender();
}

function resetSelectedAsset() {
  if (!state.selected) return;
  const { pivot, initial } = state.selected;
  pivot.position.fromArray(initial.position);
  pivot.rotation.set(...initial.rotation.map(degToRad));
  pivot.scale.fromArray(initial.scale);
  selectionHelper.setFromObject(state.selected.content);
  updateInspector();
  setDirty(true);
  showToast("当前资产已恢复初始状态");
  invalidateRender();
}

function resetCamera() {
  camera.position.fromArray(DEFAULT_CAMERA.position);
  orbitControls.target.fromArray(DEFAULT_CAMERA.target);
  applyViewerZoom();
  orbitControls.update();
}

function focusSelected() {
  if (!state.selected) return;
  const bounds = new THREE.Box3().setFromObject(state.selected.content);
  const sphere = bounds.getBoundingSphere(new THREE.Sphere());
  const direction = camera.position.clone().sub(orbitControls.target).normalize();
  const distance = Math.max(3.8, sphere.radius * 5.2);
  orbitControls.target.copy(sphere.center);
  camera.position.copy(sphere.center).addScaledVector(direction, distance);
  orbitControls.update();
}

function serializeLayout() {
  return {
    schemaVersion: 1,
    scene: "crayon-space",
    savedAt: new Date().toISOString(),
    background: "procedural-starfield",
    camera: {
      position: camera.position.toArray().map(round),
      target: orbitControls.target.toArray().map(round)
    },
    viewerSettings: {
      horizontalAngle: round(state.viewerSettings.horizontalAngle),
      verticalAngle: round(state.viewerSettings.verticalAngle),
      zoomPercent: round(state.viewerSettings.zoomPercent)
    },
    assets: state.assets.map((asset) => ({
      id: asset.id,
      name: asset.name,
      model: asset.model,
      source: asset.source,
      transform: {
        position: asset.pivot.position.toArray().map(round),
        rotationDegrees: [asset.pivot.rotation.x, asset.pivot.rotation.y, asset.pivot.rotation.z]
          .map(radToDeg)
          .map(round),
        scale: asset.pivot.scale.toArray().map(round)
      }
    }))
  };
}

function validVector(value) {
  return Array.isArray(value) && value.length === 3 && value.every((number) => Number.isFinite(Number(number)));
}

function applySerializedLayout(layout) {
  if (state.selected?.isAll) clearSelection();
  if (!layout || !Array.isArray(layout.assets)) throw new Error("布局数据格式不正确");
  layout.assets.forEach((savedAsset) => {
    const asset = state.assetsById.get(savedAsset.id);
    const transform = savedAsset.transform;
    if (!asset || !transform) return;
    if (validVector(transform.position)) asset.pivot.position.fromArray(transform.position.map(Number));
    if (validVector(transform.rotationDegrees)) {
      asset.pivot.rotation.set(...transform.rotationDegrees.map((value) => degToRad(Number(value))));
    }
    if (validVector(transform.scale)) {
      asset.pivot.scale.fromArray(transform.scale.map((value) => Math.max(0.05, Number(value))));
    }
  });
  if (validVector(layout.camera?.position)) camera.position.fromArray(layout.camera.position.map(Number));
  if (validVector(layout.camera?.target)) orbitControls.target.fromArray(layout.camera.target.map(Number));
  if (layout.viewerSettings) {
    state.viewerSettings.horizontalAngle = clampViewerValue(
      layout.viewerSettings.horizontalAngle,
      5,
      70,
      DEFAULT_VIEWER_SETTINGS.horizontalAngle
    );
    state.viewerSettings.verticalAngle = clampViewerValue(
      layout.viewerSettings.verticalAngle,
      0,
      30,
      DEFAULT_VIEWER_SETTINGS.verticalAngle
    );
    state.viewerSettings.zoomPercent = clampViewerValue(
      layout.viewerSettings.zoomPercent,
      60,
      160,
      DEFAULT_VIEWER_SETTINGS.zoomPercent
    );
  }
  updateViewerInputs();
  orbitControls.update();
  if (state.selected) {
    selectionHelper.setFromObject(state.selected.content);
    updateInspector();
  }
  invalidateRender();
}

function updateLayoutLink(layout) {
  const url = new URL(location.href);
  url.hash = location.protocol === 'file:' && layout ? `layout=${encodeLayout(layout)}` : '';
  // File URLs keep the live page address stable; only copied links carry a snapshot.
  if (location.protocol !== 'file:') history.replaceState(null, '', url.href);
  return url.href;
}

async function persistLayout(layout) {
  if (location.protocol === 'file:') {
    // localStorage can throw when storage is disabled or full: report that as a failure.
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
    return;
  }
  const response = await fetch('./api/layout', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({encoded:encodeLayout(layout)})});
  if (!response.ok) throw new Error('项目布局写入失败');
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(layout)); } catch {}
  updateLayoutLink(layout);
}

async function copyLayoutLink() {
  if (!state.ready || state.introRunning) return;
  try {
    if (state.editorVisible) {
      resetPlayerModelMotion();
      captureViewerZoom(false);
      await persistLayout(serializeLayout());
      setDirty(false);
    }
    const link = updateLayoutLink(serializeLayout());
    try {
      await navigator.clipboard.writeText(link);
      showToast(location.protocol === 'file:' ? '已复制包含当前布局的链接' : '已复制场景链接：打开即采用项目保存的位置');
    } catch {
      window.prompt('请复制场景地址：', link);
    }
    return link;
  } catch (error) { showToast('链接保存失败，请重试'); }
}

async function saveLayout() {
  try {
    if (state.editorVisible) captureViewerZoom(false);
    resetPlayerModelMotion();
    await persistLayout(serializeLayout());
    setDirty(false);
    showToast(location.protocol === 'file:' ? "已保存到当前浏览器，重新打开此文件会恢复布局" : "已写入项目，普通链接也会使用这些位置");
  } catch (error) {
    showToast(location.protocol === 'file:' ? "浏览器存储不可用，请导出 JSON 保留布局，或用启动文件打开后保存" : "项目保存失败，请用启动文件重新打开场景后重试");
  }
}

function loadSavedLayout() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      showToast("还没有保存过布局");
      return;
    }
    const layout = JSON.parse(saved);
    applySerializedLayout(layout);
    updateLayoutLink(layout);
    setDirty(false);
    showToast("已读取保存的布局");
  } catch (error) {
    showToast("保存的布局无法读取");
  }
}

async function loadSavedLayoutOnStartup() {
  if (location.protocol === 'file:') {
    const snapshot = new URLSearchParams(location.hash.slice(1)).get('layout');
    if (snapshot) {
      try { applySerializedLayout(decodeLayout(snapshot)); return true; } catch {}
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        // Validate cached data using the same schema as project layouts.
        applySerializedLayout(decodeLayout(encodeLayout(JSON.parse(saved))));
        return true;
      }
    } catch {}
  }
  let data = projectDefault;
  try {
    const response = await fetch('./assets/space-editor/default-layout.json',{cache:'no-store'});
    if(response.ok) data = await response.json();
  } catch {}
  const layout = decodeLayout(data.encoded || btoa(JSON.stringify(data)));
  applySerializedLayout(layout);
  updateLayoutLink(layout);
  try {localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));}catch{}
  return true;
}

function restoreInitialLayout() {
  if (!window.confirm("确定要恢复参考图布局吗？当前未保存的调整会消失。")) return;
  if (state.selected?.isAll) clearSelection();
  INITIAL_LAYOUT.forEach((config) => {
    const asset = state.assetsById.get(config.id);
    if (!asset) return;
    asset.pivot.position.fromArray(config.position);
    asset.pivot.rotation.set(...config.rotation.map(degToRad));
    asset.pivot.scale.fromArray(config.scale);
  });
  resetCamera();
  if (state.selected) {
    selectionHelper.setFromObject(state.selected.content);
    updateInspector();
  }
  setDirty(true);
  showToast("已恢复参考图布局");
  invalidateRender();
}

function exportLayout() {
  if (state.editorVisible) captureViewerZoom(false);
  const json = JSON.stringify(serializeLayout(), null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "crayon-space-layout.json";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast("JSON 已导出");
}

function closeMobilePanels() {
  document.body.classList.remove("assets-open", "inspector-open");
  document.querySelectorAll("[data-toggle-panel]").forEach((button) => {
    button.setAttribute("aria-expanded", "false");
  });
}

function setEditorVisible(visible) {
  if (schoolPortal?.active) schoolPortal.leave();
  if (visible) planetWalker?.stop();
  const wasVisible = state.editorVisible;
  if (visible) resetPlayerModelMotion();
  if (wasVisible && !visible) captureViewerZoom(true);
  state.editorVisible = visible;
  document.body.classList.toggle("editor-hidden", !visible);
  transformControls.enabled = visible;
  orbitControls.enablePan = visible;
  orbitControls.enableZoom = visible;
  orbitControls.dampingFactor = visible ? 0.08 : 0.045;
  orbitControls.rotateSpeed = visible ? 0.65 : PLAYER_MOTION.centerRotateSpeed;
  orbitControls.zoomSpeed = visible ? 0.8 : 0.5;
  const yawBuffer = degToRad(THREE.MathUtils.clamp(state.viewerSettings.horizontalAngle * 0.16, 2, 5));
  const pitchBuffer = degToRad(THREE.MathUtils.clamp(state.viewerSettings.verticalAngle * 0.3, 1.5, 3.5));
  orbitControls.minAzimuthAngle = visible
    ? -Infinity
    : degToRad(-state.viewerSettings.horizontalAngle) - yawBuffer;
  orbitControls.maxAzimuthAngle = visible
    ? Infinity
    : degToRad(state.viewerSettings.horizontalAngle) + yawBuffer;
  orbitControls.minPolarAngle = visible
    ? 0.01
    : DEFAULT_CAMERA_POLAR - degToRad(state.viewerSettings.verticalAngle) - pitchBuffer;
  orbitControls.maxPolarAngle = visible
    ? Math.PI - 0.01
    : DEFAULT_CAMERA_POLAR + degToRad(state.viewerSettings.verticalAngle) + pitchBuffer;
  if (visible) {
    orbitControls.minDistance = 5;
    orbitControls.maxDistance = 34;
  } else {
    const lockedDistance = DEFAULT_CAMERA_DISTANCE * (100 / state.viewerSettings.zoomPercent);
    orbitControls.minDistance = lockedDistance;
    orbitControls.maxDistance = lockedDistance;
  }
  if (!visible) {
    clearSelection();
    closeMobilePanels();
    applyViewerZoom();
    if (state.ready && wasVisible) {
      try {
        persistLayout(serializeLayout()).then(()=>setDirty(false)).catch(()=>{saveState.textContent='项目保存失败，请重新保存';});
      } catch (error) {
        state.dirty = true;
      }
    }
  }
  orbitControls.update();
  window.requestAnimationFrame(resizeRenderer);
}

function toggleEditor() {
  if (state.introRunning) return;
  setEditorVisible(!state.editorVisible);
}

function smoothStep(minimum, maximum, value) {
  const progress = THREE.MathUtils.clamp((value - minimum) / (maximum - minimum), 0, 1);
  return progress * progress * (3 - 2 * progress);
}

function applyPlayerCameraResistance(deltaTime) {
  if (state.editorVisible) return false;

  const horizontalLimit = degToRad(state.viewerSettings.horizontalAngle);
  const verticalLimit = degToRad(state.viewerSettings.verticalAngle);
  const yaw = orbitControls.getAzimuthalAngle();
  const polar = orbitControls.getPolarAngle();
  const yawPressure = Math.abs(yaw) / Math.max(horizontalLimit, degToRad(1));
  const pitchPressure = Math.abs(polar - DEFAULT_CAMERA_POLAR) / Math.max(verticalLimit, degToRad(1));
  const edgePressure = smoothStep(0.55, 1.08, Math.max(yawPressure, pitchPressure));
  orbitControls.dampingFactor = state.playerPointerActive
    ? 0.045
    : THREE.MathUtils.lerp(0.065, 0.18, edgePressure);
  orbitControls.rotateSpeed = THREE.MathUtils.lerp(
    PLAYER_MOTION.centerRotateSpeed,
    PLAYER_MOTION.edgeRotateSpeed,
    edgePressure
  );

  const targetYaw = THREE.MathUtils.clamp(yaw, -horizontalLimit, horizontalLimit);
  const targetPolar = THREE.MathUtils.clamp(
    polar,
    DEFAULT_CAMERA_POLAR - verticalLimit,
    DEFAULT_CAMERA_POLAR + verticalLimit
  );
  if (Math.abs(targetYaw - yaw) < 0.00005 && Math.abs(targetPolar - polar) < 0.00005) return false;

  const springRate = state.playerPointerActive ? PLAYER_MOTION.dragSpring : PLAYER_MOTION.releaseSpring;
  const springAmount = 1 - Math.exp(-springRate * deltaTime);
  playerCameraOffset.copy(camera.position).sub(orbitControls.target);
  playerCameraSpherical.setFromVector3(playerCameraOffset);
  playerCameraSpherical.theta = THREE.MathUtils.lerp(playerCameraSpherical.theta, targetYaw, springAmount);
  playerCameraSpherical.phi = THREE.MathUtils.lerp(playerCameraSpherical.phi, targetPolar, springAmount);
  playerCameraOffset.setFromSpherical(playerCameraSpherical);
  camera.position.copy(orbitControls.target).add(playerCameraOffset);
  camera.lookAt(orbitControls.target);
  return true;
}

function setupMobilePanels() {
  document.querySelectorAll("[data-toggle-panel]").forEach((button) => {
    button.addEventListener("click", () => {
      const panel = button.dataset.togglePanel;
      const className = `${panel}-open`;
      const willOpen = !document.body.classList.contains(className);
      closeMobilePanels();
      if (willOpen) {
        document.body.classList.add(className);
        button.setAttribute("aria-expanded", "true");
      }
    });
  });
}

function resizeRenderer() {
  const width = Math.max(1, viewport.clientWidth);
  const height = Math.max(1, viewport.clientHeight);
  const deviceRatio = window.devicePixelRatio || 1;
  const isMobile = window.matchMedia("(max-width: 840px)").matches;
  const normalRatio = Math.min(
    deviceRatio,
    isMobile ? RENDER_QUALITY.mobilePixelRatio : RENDER_QUALITY.desktopPixelRatio
  );
  const interactionRatio = Math.max(
    RENDER_QUALITY.minimumPixelRatio,
    normalRatio * RENDER_QUALITY.interactionScale
  );
  const targetRatio = state.ready && !state.introRunning && state.interactionQuality
    ? interactionRatio
    : normalRatio;
  const bufferWidth = Math.round(width * targetRatio);
  const bufferHeight = Math.round(height * targetRatio);

  if (
    Math.abs(renderer.getPixelRatio() - targetRatio) > 0.001
    || canvas.width !== bufferWidth
    || canvas.height !== bufferHeight
  ) {
    renderer.setPixelRatio(targetRatio);
    renderer.setSize(width, height, false);
  }
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  if (introBackgroundPainter) {
    introBackgroundPainter.resize(width, height);
  }
  invalidateRender();
}

function setPointerRay(event) {
  const rect = canvas.getBoundingClientRect();
  playerPointer.set(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1
  );
  playerRaycaster.setFromCamera(playerPointer, camera);
}

function assetFromPointer(event) {
  setPointerRay(event);
  const hit = playerRaycaster.intersectObjects(state.clickableMeshes, false)[0];
  return hit ? state.assetsById.get(hit.object.userData.assetId) : null;
}

function setHoveredAsset(asset) {
  if (state.hoveredAsset === asset) return;
  state.hoveredAsset = asset || null;
  canvas.classList.toggle("is-model-hovered", Boolean(asset));
}

function snapshotAssetTransform(asset) {
  return {
    position: asset.pivot.position.clone(),
    rotation: asset.pivot.rotation.clone(),
    scale: asset.pivot.scale.clone()
  };
}

function restoreAssetTransform(asset, transform) {
  asset.pivot.position.copy(transform.position);
  asset.pivot.rotation.copy(transform.rotation);
  asset.pivot.scale.copy(transform.scale);
  invalidateRender();
}

function stopAssetPlayerMotion(asset, restore = false) {
  const rest = asset.playerRest;
  asset.playerPressTween?.kill();
  asset.playerSpring?.kill();
  asset.playerPressTween = null;
  asset.playerSpring = null;
  asset.playerRest = null;
  if (restore && rest) restoreAssetTransform(asset, rest);
  return rest;
}

function modelDragRange(asset) {
  const sphere = new THREE.Box3().setFromObject(asset.content).getBoundingSphere(new THREE.Sphere());
  const radius = Number.isFinite(sphere.radius) ? sphere.radius : MODEL_PLAY.minimumRange;
  return THREE.MathUtils.clamp(
    radius * MODEL_PLAY.radiusRangeFactor,
    MODEL_PLAY.minimumRange,
    MODEL_PLAY.maximumRange
  );
}

function beginPlayerModelDrag(event, asset) {
  if (asset?.id === 'earth') return false;
  if (!asset || !state.ready || state.introRunning || state.editorVisible) return false;

  const interruptedRest = stopAssetPlayerMotion(asset, false);
  const rest = interruptedRest || snapshotAssetTransform(asset);
  camera.getWorldDirection(playerDragNormal);
  playerDragPlane.setFromNormalAndCoplanarPoint(playerDragNormal, asset.pivot.position);
  setPointerRay(event);
  if (!playerRaycaster.ray.intersectPlane(playerDragPlane, playerDragPoint)) return false;

  state.playerDraggingAsset = {
    asset,
    pointerId: event.pointerId,
    rest,
    grabOffset: asset.pivot.position.clone().sub(playerDragPoint),
    maximumDistance: modelDragRange(asset),
    startClientX: event.clientX,
    startClientY: event.clientY,
    movedDistance: 0
  };
  state.playerPointerActive = true;
  orbitControls.enabled = false;
  setHoveredAsset(asset);
  canvas.classList.add("is-model-dragging");
  canvas.setPointerCapture?.(event.pointerId);

  const pressedScale = rest.scale.clone().multiplyScalar(MODEL_PLAY.pressedScale);
  asset.playerPressTween = gsap.to(asset.pivot.scale, {
    x: pressedScale.x,
    y: pressedScale.y,
    z: pressedScale.z,
    duration: 0.16,
    ease: "power2.out",
    overwrite: "auto",
    onUpdate: invalidateRender
  });
  window.dispatchEvent(new CustomEvent("space-editor-model-drag-start", {
    detail: { assetId: asset.id, maximumDistance: state.playerDraggingAsset.maximumDistance }
  }));
  return true;
}

function updatePlayerModelDrag(event) {
  const drag = state.playerDraggingAsset;
  if (!drag || drag.pointerId !== event.pointerId) return false;

  setPointerRay(event);
  if (!playerRaycaster.ray.intersectPlane(playerDragPlane, playerDragPoint)) return true;
  playerDragTarget.copy(playerDragPoint).add(drag.grabOffset);
  playerDragDelta.copy(playerDragTarget).sub(drag.rest.position);
  if (playerDragDelta.length() > drag.maximumDistance) playerDragDelta.setLength(drag.maximumDistance);

  drag.asset.pivot.position.copy(drag.rest.position).add(playerDragDelta);
  drag.movedDistance = Math.max(drag.movedDistance, playerDragDelta.length());
  const horizontalTilt = THREE.MathUtils.clamp((event.clientX - drag.startClientX) / 120, -1, 1);
  const verticalTilt = THREE.MathUtils.clamp((event.clientY - drag.startClientY) / 120, -1, 1);
  drag.asset.pivot.rotation.set(
    drag.rest.rotation.x + verticalTilt * MODEL_PLAY.maximumTilt,
    drag.rest.rotation.y,
    drag.rest.rotation.z - horizontalTilt * MODEL_PLAY.maximumTilt,
    drag.rest.rotation.order
  );
  invalidateRender();
  return true;
}

function springAssetHome(asset, rest, movedDistance, maximumDistance) {
  asset.playerPressTween?.kill();
  asset.playerPressTween = null;
  const from = snapshotAssetTransform(asset);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reducedMotion) {
    restoreAssetTransform(asset, rest);
    return;
  }

  asset.playerRest = rest;
  const progress = { value: 0 };
  const travelRatio = THREE.MathUtils.clamp(movedDistance / Math.max(maximumDistance, 0.001), 0, 1);
  const duration = THREE.MathUtils.lerp(
    MODEL_PLAY.minimumReturnDuration,
    MODEL_PLAY.maximumReturnDuration,
    travelRatio
  );
  const tween = gsap.to(progress, {
    value: 1,
    duration,
    ease: "elastic.out(1, 0.36)",
    onUpdate: () => {
      asset.pivot.position.lerpVectors(from.position, rest.position, progress.value);
      asset.pivot.scale.lerpVectors(from.scale, rest.scale, progress.value);
      asset.pivot.rotation.set(
        THREE.MathUtils.lerp(from.rotation.x, rest.rotation.x, progress.value),
        THREE.MathUtils.lerp(from.rotation.y, rest.rotation.y, progress.value),
        THREE.MathUtils.lerp(from.rotation.z, rest.rotation.z, progress.value),
        rest.rotation.order
      );
      invalidateRender();
    },
    onComplete: () => {
      if (asset.playerSpring !== tween) return;
      restoreAssetTransform(asset, rest);
      asset.playerSpring = null;
      asset.playerRest = null;
    }
  });
  asset.playerSpring = tween;
}

function endPlayerModelDrag(event, cancelled = false) {
  const drag = state.playerDraggingAsset;
  if (!drag || (event && drag.pointerId !== event.pointerId)) return false;

  state.playerDraggingAsset = null;
  if (canvas.hasPointerCapture?.(drag.pointerId)) canvas.releasePointerCapture(drag.pointerId);
  canvas.classList.remove("is-model-dragging");
  state.playerPointerActive = false;
  orbitControls.enabled = !state.introRunning && !state.transformDragging;
  setInteractionQuality(false);
  setHoveredAsset(cancelled || !event ? null : assetFromPointer(event));
  springAssetHome(drag.asset, drag.rest, drag.movedDistance, drag.maximumDistance);
  window.dispatchEvent(new CustomEvent("space-editor-model-drag-end", {
    detail: { assetId: drag.asset.id, movedDistance: drag.movedDistance }
  }));
  return true;
}

function resetPlayerModelMotion() {
  const drag = state.playerDraggingAsset;
  if (drag) {
    state.playerDraggingAsset = null;
    drag.asset.playerPressTween?.kill();
    drag.asset.playerPressTween = null;
    restoreAssetTransform(drag.asset, drag.rest);
    if (canvas.hasPointerCapture?.(drag.pointerId)) canvas.releasePointerCapture(drag.pointerId);
  }
  state.assets.forEach((asset) => stopAssetPlayerMotion(asset, true));
  state.playerPointerActive = false;
  setHoveredAsset(null);
  canvas.classList.remove("is-model-dragging");
  if (orbitControls) orbitControls.enabled = !state.introRunning && !state.transformDragging;
  setInteractionQuality(false);
}

function setupPointerSelection() {
  canvas.addEventListener("pointerdown", (event) => {
    if (state.portalActive) { event.stopImmediatePropagation(); return; }
    if (!state.editorVisible) {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      const asset = state.ready ? assetFromPointer(event) : null;
      if (beginPlayerModelDrag(event, asset)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      state.playerPointerActive = true;
      setInteractionQuality(true);
      setHoveredAsset(null);
      state.pointerStart = null;
      return;
    }
    state.pointerStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
  }, true);

  canvas.addEventListener("pointermove", (event) => {
    if (state.portalActive) { event.stopImmediatePropagation(); return; }
    if (updatePlayerModelDrag(event)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    if (state.playerPointerActive) return;
    if (!state.editorVisible && state.ready && !state.introRunning) {
      const asset = assetFromPointer(event);
      setHoveredAsset(asset?.id === 'earth' ? null : asset);
    } else {
      setHoveredAsset(null);
    }
  }, true);

  canvas.addEventListener("pointerup", (event) => {
    if (state.portalActive) { event.stopImmediatePropagation(); return; }
    if (endPlayerModelDrag(event)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    if (!state.editorVisible) {
      state.playerPointerActive = false;
      setInteractionQuality(false);
      return;
    }
    if (!state.pointerStart || state.pointerStart.id !== event.pointerId) return;
    const distance = Math.hypot(event.clientX - state.pointerStart.x, event.clientY - state.pointerStart.y);
    state.pointerStart = null;
    if (distance > 5 || state.suppressCanvasClick) return;
    selectAsset(assetFromPointer(event));
    if (window.matchMedia("(max-width: 840px)").matches) closeMobilePanels();
  }, true);

  canvas.addEventListener("pointercancel", (event) => {
    endPlayerModelDrag(event, true);
    state.playerPointerActive = false;
    state.pointerStart = null;
    setInteractionQuality(false);
  }, true);

  canvas.addEventListener("lostpointercapture", (event) => endPlayerModelDrag(event, true));
  canvas.addEventListener("pointerleave", () => {
    if (!state.playerDraggingAsset) setHoveredAsset(null);
  });
  window.addEventListener("blur", resetPlayerModelMotion);

  window.addEventListener("pointerup", () => {
    state.playerPointerActive = false;
    setInteractionQuality(false);
  });
}

function setupInterfaceEvents() {
  modeButtons.forEach((button) => button.addEventListener("click", () => setTransformMode(button.dataset.mode)));
  transformInputs.forEach((input) => input.addEventListener("change", () => applyInputChange(input)));
  viewerInputs.forEach((input) => input.addEventListener("change", () => applyViewerInput(input)));
  document.querySelector("#resetCamera").addEventListener("click", resetCamera);
  document.querySelector("#restoreInitial").addEventListener("click", restoreInitialLayout);
  document.querySelector("#loadLayout").addEventListener("click", loadSavedLayout);
  document.querySelector("#saveLayout").addEventListener("click", saveLayout);
  document.querySelector("#copyLayoutLink").addEventListener("click", copyLayoutLink);
  document.querySelector("#exportLayout").addEventListener("click", exportLayout);
  document.querySelector("#resetSelected").addEventListener("click", resetSelectedAsset);
  document.querySelector('#selectAllAssets').addEventListener('click', selectAllAssets);
  document.querySelector('#moveAllDown').addEventListener('click', () => {
    if (!state.selected?.isAll) selectAllAssets();
    if (!state.selected?.isAll) return;
    state.selected.pivot.position.y -= 0.25;
    applyWholeSceneTranslation();
    selectionHelper.setFromObject(state.selected.content);
    updateInspector();
    setDirty(true);
    invalidateRender();
  });
  document.addEventListener("keydown", (event) => {
    const tag = event.target?.tagName;
    if (tag === "INPUT" || tag === "BUTTON" || event.target?.isContentEditable) return;
    const key = event.key.toLowerCase();
    if (state.introRunning && (key === " " || key === "arrowdown" || key === "pagedown")) {
      event.preventDefault();
      advanceOpeningStep();
      return;
    }
    if (key === "p") {
      event.preventDefault();
      toggleEditor();
      return;
    }
    if (!state.editorVisible) return;
    if (key === "w") setTransformMode("translate");
    if (key === "e") setTransformMode("rotate");
    if (key === "r") setTransformMode("scale");
    if (key === "f") focusSelected();
    if (key === "escape") clearSelection();
  });

  setupMobilePanels();
}

function setupThreeScene() {
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance"
  });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(42, 1, 0.05, 120);
  camera.position.fromArray(DEFAULT_CAMERA.position);
  printPostprocessing = createPrintPostprocessing(renderer, scene, camera, introBackgroundCanvas);

  const hemisphere = new THREE.HemisphereLight(0xd8efff, 0x1a2940, 2.4);
  const keyLight = new THREE.DirectionalLight(0xfff0c9, 3.8);
  const fillLight = new THREE.DirectionalLight(0x88cfff, 1.7);
  keyLight.position.set(-6, 8, 9);
  fillLight.position.set(6, -2, 7);
  scene.add(hemisphere, keyLight, fillLight);

  orbitControls = new OrbitControls(camera, canvas);
  orbitControls.enableDamping = true;
  orbitControls.dampingFactor = 0.08;
  orbitControls.minDistance = 5;
  orbitControls.maxDistance = 34;
  orbitControls.target.fromArray(DEFAULT_CAMERA.target);
  orbitControls.update();
  orbitControls.addEventListener("start", () => setInteractionQuality(true));
  orbitControls.addEventListener("change", invalidateRender);
  orbitControls.addEventListener("end", () => {
    if (state.editorVisible) captureViewerZoom(true);
    setInteractionQuality(false);
  });

  transformControls = new TransformControls(camera, canvas);
  transformControls.setSize(0.72);
  transformControls.setMode("translate");
  transformControls.setSpace("world");
  scene.add(transformControls.getHelper());

  selectionHelper = new THREE.BoxHelper();
  selectionHelper.material.color.set(0xe7c23b);
  selectionHelper.material.depthTest = false;
  selectionHelper.material.transparent = true;
  selectionHelper.material.opacity = 0.9;
  selectionHelper.renderOrder = 1000;
  selectionHelper.visible = false;
  selectionHelper.userData.isEditorHelper = true;
  scene.add(selectionHelper);

  transformControls.addEventListener("dragging-changed", (event) => {
    state.transformDragging = event.value;
    orbitControls.enabled = !event.value;
    state.suppressCanvasClick = event.value;
    setInteractionQuality(event.value);
    invalidateRender();
    if (!event.value) window.setTimeout(() => { state.suppressCanvasClick = false; }, 0);
  });
  transformControls.addEventListener("objectChange", () => {
    if (!state.selected) return;
    applyWholeSceneTranslation();
    selectionHelper.setFromObject(state.selected.content);
    updateInspector();
    setDirty(true);
    invalidateRender();
  });

  resizeObserver = new ResizeObserver(resizeRenderer);
  resizeObserver.observe(viewport);
  resizeRenderer();
}

async function loadModelTemplates() {
  const loader = new GLTFLoader();
  const entries = Object.entries(MODEL_LIBRARY);
  const templates = new Map();
  let nextIndex = 0;
  let complete = 0;

  const worker = async () => {
    while (nextIndex < entries.length) {
      const current = nextIndex;
      nextIndex += 1;
      const [key, definition] = entries[current];
      try {
        const gltf = await loadGLTF(loader, definition.file);
        templates.set(key, buildNormalizedTemplate(gltf, key));
      } catch (error) {
        state.failedModels.push({ key, file: definition.file, message: String(error?.message || error) });
      }
      complete += 1;
      setLoadingProgress(complete, entries.length);
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
  };

  await Promise.all([worker(), worker(), worker()]);
  return templates;
}

let previousFrameTime = performance.now();
let previousRenderedFrameTime = 0;

function renderLoop(frameTime = performance.now()) {
  requestAnimationFrame(renderLoop);
  if (document.hidden || (archiveEmbedded && window.frameElement?.hidden)) {
    previousFrameTime = frameTime;
    return;
  }
  if (schoolPortal?.covered) {
    previousFrameTime = frameTime;
    return;
  }
  if (pendingArchiveProgress !== null) {
    const progress = pendingArchiveProgress;
    pendingArchiveProgress = null;
    setArchiveIntroProgress(progress);
  }
  introBackgroundPainter?.tick(frameTime);
  const deltaTime = Math.min(Math.max((frameTime - previousFrameTime) / 1000, 0), 0.05);
  previousFrameTime = frameTime;
  const controlsChanged = !schoolPortal?.active && orbitControls.update();
  const cameraAdjusted = !schoolPortal?.active && (state.playerPointerActive || controlsChanged)
    && applyPlayerCameraResistance(deltaTime);
  const walkerMoving = !schoolPortal?.active && (planetWalker?.tick(deltaTime) || false);
  const portalMoving = schoolPortal?.tick(deltaTime) || false;
  const activelyAnimating = state.introStepAnimating
    || state.playerPointerActive
    || state.transformDragging
    || controlsChanged
    || cameraAdjusted || walkerMoving || portalMoving;
  const introRopesActive = state.introRunning && introRigs.some((rig) => rig.motion.active);
  const introWaitingRefreshDue = introRopesActive
    && !state.introStepAnimating
    && frameTime - previousRenderedFrameTime >= RENDER_QUALITY.introWaitingRefreshInterval;
  // The opaque transition covers the planet; release the GPU for video decoding.
  if (schoolPortal?.covered) return;
  const idleRefreshDue = frameTime - previousRenderedFrameTime >= RENDER_QUALITY.idleRefreshInterval;
  if (!state.renderRequested && !activelyAnimating && !introWaitingRefreshDue && !idleRefreshDue) return;

  state.renderRequested = false;
  if (state.introStepAnimating && state.introFrameTimes.length < 600) {
    state.introFrameTimes.push(deltaTime * 1000);
  }
  if (state.introRunning) updateIntroRopes(frameTime);
  printPostprocessing.render(schoolPortal?.renderScene || scene, schoolPortal?.renderScene ? schoolPortal.renderCamera : camera);
  previousRenderedFrameTime = frameTime;
  state.renderedFrames += 1;
}

async function init() {
  setupInterfaceEvents();
  setupThreeScene();
  setupPointerSelection();
  renderLoop();

  const templates = await loadModelTemplates();
  INITIAL_LAYOUT.forEach((config) => {
    const template = templates.get(config.model);
    if (template) createSceneAsset(config, template);
  });
  buildAssetList();
  const restoredSavedLayout = await loadSavedLayoutOnStartup();
  try {
    loadingText.textContent = "正在为人物准备骨骼和球面行走";
    planetWalker = await createPlanetWalker({ scene, camera, canvas, state, controls: orbitControls, toast: showToast, invalidate: invalidateRender });
    schoolPortal = createSchoolPortal({scene,camera,canvas,state,controls:orbitControls,walker:planetWalker,invalidate:invalidateRender,resetInteraction:resetPlayerModelMotion,
      captureFrame() {
        // Capture immediately after rendering the exact final camera/pose. This
        // works without preserveDrawingBuffer and includes the paper backdrop.
        printPostprocessing.render(scene,camera);
        const frame=document.createElement('canvas');
        frame.width=canvas.width;frame.height=canvas.height;
        const context=frame.getContext('2d');
        context.drawImage(introBackgroundCanvas,0,0,frame.width,frame.height);
        context.drawImage(canvas,0,0,frame.width,frame.height);
        return frame;
      }
    });
  } catch (error) { console.error(error); showToast("人物加载失败，请刷新重试"); }
  clearSelection();
  if (!restoredSavedLayout) resetCamera();
  setEditorVisible(false);
  loadingOverlay.classList.add("is-hidden");
  if (archiveEmbedded) {
    // Compile ink materials while hidden, before individual models enter view.
    printPostprocessing.prepareScene(scene);
    if (renderer.compileAsync) await renderer.compileAsync(scene, camera);
  }
  await startOpeningSequence(restoredSavedLayout);
}

window.__spaceEditor = {
  get portal() { return schoolPortal?.report; },
  get walker() { return planetWalker?.report; },
  isGroundBlocked: (n) => planetWalker?.blocked(new THREE.Vector3(...n).normalize()),
  walkTo: (n) => planetWalker?.plan(new THREE.Vector3(...n).normalize()),
  getGroundScreenPosition: (n) => planetWalker?.screenPoint(n),
  get archiveProgress() { return archiveIntroProgress; },
  get ready() { return state.ready; },
  get introRunning() { return state.introRunning; },
  get introCompleted() { return state.introCompleted; },
  get introPhase() { return state.introPhase; },
  get introStep() { return state.introStep; },
  get introStepCount() { return introSteps.length; },
  get introStepAnimating() { return state.introStepAnimating; },
  get introPerformance() { return state.introPerformance ? { ...state.introPerformance } : null; },
  get introRopeConnections() { return introRopeConnectionReport(); },
  get renderStats() {
    return {
      calls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      lines: renderer.info.render.lines,
      pixelRatio: renderer.getPixelRatio(),
      renderedFrames: state.renderedFrames,
      interactionQuality: state.interactionQuality
    };
  },
  get assetCount() { return state.assets.length; },
  get failedModels() { return [...state.failedModels]; },
  get selectedId() { return state.selected?.id || null; },
  get editorVisible() { return state.editorVisible; },
  get viewLimits() {
    return {
      minAzimuthDegrees: round(radToDeg(orbitControls.minAzimuthAngle)),
      maxAzimuthDegrees: round(radToDeg(orbitControls.maxAzimuthAngle)),
      minPolarDegrees: round(radToDeg(orbitControls.minPolarAngle)),
      maxPolarDegrees: round(radToDeg(orbitControls.maxPolarAngle)),
      panEnabled: orbitControls.enablePan,
      zoomEnabled: orbitControls.enableZoom,
      minDistance: round(orbitControls.minDistance),
      maxDistance: round(orbitControls.maxDistance)
    };
  },
  get viewerSettings() { return { ...state.viewerSettings }; },
  get cameraMotion() {
    return {
      yawDegrees: round(radToDeg(orbitControls.getAzimuthalAngle())),
      polarOffsetDegrees: round(radToDeg(orbitControls.getPolarAngle() - DEFAULT_CAMERA_POLAR)),
      rotateSpeed: round(orbitControls.rotateSpeed),
      pointerActive: state.playerPointerActive
    };
  },
  get playerModelInteraction() {
    return {
      dragging: Boolean(state.playerDraggingAsset),
      assetId: state.playerDraggingAsset?.asset.id || null,
      maximumDistance: round(state.playerDraggingAsset?.maximumDistance || 0),
      returningAssetIds: state.assets.filter((asset) => asset.playerSpring).map((asset) => asset.id)
    };
  },
  getAssetScreenPosition: (id) => {
    const asset = state.assetsById.get(id);
    if (!asset) return null;
    const center = new THREE.Box3().setFromObject(asset.content).getCenter(new THREE.Vector3()).project(camera);
    const rect = canvas.getBoundingClientRect();
    return {
      x: rect.left + (center.x + 1) * rect.width * 0.5,
      y: rect.top + (1 - center.y) * rect.height * 0.5
    };
  },
  select: (id) => selectAsset(state.assetsById.get(id)),
  setMode: setTransformMode,
  setEditorVisible,
  advanceIntro: advanceOpeningStep,
  getLayout: serializeLayout,
  save: saveLayout,
  copyLayoutLink,
  load: loadSavedLayout,
  export: exportLayout,
  resetCamera
};

init().catch((error) => {
  loadingText.textContent = "场景启动失败";
  loadingBar.style.width = "100%";
  console.error(error);
});
