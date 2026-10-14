import * as THREE from "./vendor/three/three.module.js";
import { FBXLoader } from "./vendor/three/examples/jsm/loaders/FBXLoader.js";
import lampFbx from "./assets/lamp/Tischlampe_rigged.fbx";

(() => {
  "use strict";

  const screen = document.querySelector("#lampMemory");
  const canvas = document.querySelector("#lampCanvas");
  const hotspot = document.querySelector("#lampHotspot");
  const beam = document.querySelector("#lampBeam");
  const hintTitle = document.querySelector("#lampHintTitle");
  const hintDetail = document.querySelector("#lampHintDetail");
  const editorUi = document.querySelector(".lamp-editor-ui");
  const editToggle = document.querySelector("#lampEditToggle");
  const editor = document.querySelector("#lampEditor");
  const positionReadout = document.querySelector("#lampPositionReadout");
  const positionReset = document.querySelector("#lampPositionReset");
  const positionCancel = document.querySelector("#lampPositionCancel");
  const positionSave = document.querySelector("#lampPositionSave");
  const editorStatus = document.querySelector("#lampEditorStatus");
  const lightEditorUi = document.querySelector(".lamp-light-editor-ui");
  const lightEditor = document.querySelector("#lampLightEditor");
  const boardBrightnessInput = document.querySelector("#lampBoardBrightness");
  const boardBrightnessValue = document.querySelector("#lampBoardBrightnessValue");
  const lampBrightnessInput = document.querySelector("#lampBrightness");
  const lampBrightnessValue = document.querySelector("#lampBrightnessValue");
  const lightingReset = document.querySelector("#lampLightingReset");
  if (!screen || !canvas || !hotspot || !beam) return;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const POSITION_STORAGE_KEY = "memory-street:lamp-position:v1";
  const LIGHTING_STORAGE_KEY = "memory-street:lamp-lighting:v1";
  const DEFAULT_POSITION = Object.freeze({ x: -3.9, y: -.24, z: 0 });
  const DEFAULT_LIGHTING = Object.freeze({ board: .6, lamp: 1.35 });
  const positionLimits = {
    x: [-6.2, 3.8],
    y: [-2.1, 3.1],
    z: [-2.8, 3.2]
  };

  function readSavedPosition() {
    try {
      const saved = JSON.parse(localStorage.getItem(POSITION_STORAGE_KEY));
      if (![saved?.x, saved?.y, saved?.z].every(Number.isFinite)) return { ...DEFAULT_POSITION };
      return {
        x: clamp(saved.x, ...positionLimits.x),
        y: clamp(saved.y, ...positionLimits.y),
        z: clamp(saved.z, ...positionLimits.z)
      };
    } catch (_) {
      return { ...DEFAULT_POSITION };
    }
  }

  function readSavedLighting() {
    try {
      const saved = JSON.parse(localStorage.getItem(LIGHTING_STORAGE_KEY));
      if (![saved?.board, saved?.lamp].every(Number.isFinite)) return { ...DEFAULT_LIGHTING };
      return {
        board: clamp(saved.board, .3, .9),
        lamp: clamp(saved.lamp, .7, 1.8)
      };
    } catch (_) {
      return { ...DEFAULT_LIGHTING };
    }
  }

  const lampPosition = readSavedPosition();
  const lampLighting = readSavedLighting();
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.65));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .86;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, .1, 60);
  camera.position.set(0, 2.35, 8.2);
  camera.lookAt(0, 1.85, 0);

  const lampRig = new THREE.Group();
  lampRig.position.set(lampPosition.x, lampPosition.y, lampPosition.z);
  lampRig.scale.setScalar(1.08);
  scene.add(lampRig);

  const ambient = new THREE.HemisphereLight(0xffdfad, 0x17100d, .16);
  const keyLight = new THREE.DirectionalLight(0xffd395, .22);
  const bulbLight = new THREE.PointLight(0xffbc67, 0, 9, 1.65);
  keyLight.position.set(2.4, 5.4, 5.2);
  bulbLight.position.set(-.15, 3.15, 1.1);
  scene.add(ambient, keyLight, bulbLight);

  let lampModel = null;
  let headBone = null;
  const bulbMaterials = [];
  let poseMixer = null;
  let poseDuration = 0;
  let currentPoseTime = 0;
  let headQuaternionInterpolant = null;
  const bulbMeshes = [];
  const headWorldPosition = new THREE.Vector3();
  const bulbWorldPosition = new THREE.Vector3();
  const projectedLightPosition = new THREE.Vector3();
  const bulbLocalCenter = new THREE.Vector3();
  const headRotationAxis = new THREE.Vector3(0, 0, 1);
  const headRotation = new THREE.Quaternion();

  try {
    const decoded = atob(lampFbx);
    const bytes = new Uint8Array(decoded.length);
    for (let index = 0; index < decoded.length; index += 1) bytes[index] = decoded.charCodeAt(index);
    lampModel = new FBXLoader().parse(bytes.buffer, "");

    const rawBounds = new THREE.Box3().setFromObject(lampModel);
    const rawSize = rawBounds.getSize(new THREE.Vector3());
    const normalization = rawSize.y > .001 ? 3.82 / rawSize.y : 1;
    lampModel.scale.setScalar(normalization);
    lampModel.updateMatrixWorld(true);
    const normalizedBounds = new THREE.Box3().setFromObject(lampModel);
    const center = normalizedBounds.getCenter(new THREE.Vector3());
    lampModel.position.x -= center.x;
    lampModel.position.y -= normalizedBounds.min.y;
    lampModel.position.z -= center.z;

    lampModel.traverse((object) => {
      if (object.isBone) {
        if (object.name === "Lamp_Head") {
          headBone ||= object;
        }
        return;
      }
      if (object.isLine || object.isLineSegments) {
        const lineMaterials = Array.isArray(object.material) ? object.material : [object.material];
        lineMaterials.forEach((material) => {
          material?.color?.set(0x050403);
          material?.emissive?.set(0x000000);
          if (material) {
            material.transparent = false;
            material.opacity = 1;
            material.depthWrite = true;
            material.needsUpdate = true;
          }
        });
      }
      if (!object.isMesh) return;
      object.frustumCulled = false;
      const isBulbMesh = object.isSkinnedMesh && object.name.startsWith("Sphere020");
      if (isBulbMesh) {
        const sourceMaterials = Array.isArray(object.material) ? object.material : [object.material];
        const clonedMaterials = sourceMaterials.map((material) => material?.clone?.() || material);
        object.material = Array.isArray(object.material) ? clonedMaterials : clonedMaterials[0];
      }
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => {
        if (!material) return;
        const materialName = (material.name || "").toLowerCase();
        if (materialName.includes("wire")) {
          material.color?.set(0x030302);
          material.emissive?.set(0x000000);
          material.specular?.set(0x050403);
          if ("shininess" in material) material.shininess = 4;
        } else if (materialName === "01 - default" || materialName === "04 - default") {
          material.color?.set(0x0b0a09);
          material.emissive?.set(0x000000);
          material.specular?.set(0x6c5945);
          if ("shininess" in material) material.shininess = 46;
          if ("roughness" in material) material.roughness = .38;
          if ("metalness" in material) material.metalness = .34;
        } else if (materialName === "ceramic" || materialName === "05 - default") {
          material.color?.set(0xfff4de);
          material.emissive?.set(isBulbMesh ? 0xffb764 : 0x000000);
          material.emissiveIntensity = 0;
          if (isBulbMesh && material.emissive && !bulbMaterials.includes(material)) bulbMaterials.push(material);
        }
        if (!bulbMaterials.includes(material)) material.emissiveIntensity = 0;
        material.envMapIntensity = .55;
        material.transparent = false;
        material.opacity = 1;
        material.depthWrite = true;
        material.alphaTest = 0;
        material.needsUpdate = true;
      });
      if (isBulbMesh) {
        object.computeBoundingBox();
        bulbMeshes.push(object);
      }
    });

    lampRig.add(lampModel);
    if (lampModel.animations.length) {
      poseMixer = new THREE.AnimationMixer(lampModel);
      const poseClip = lampModel.animations[0];
      poseMixer.clipAction(poseClip).play();
      poseDuration = poseClip.duration;
      const headQuaternionTrack = poseClip.tracks.find((track) => track.name === "Lamp_Head.quaternion");
      headQuaternionInterpolant = headQuaternionTrack?.createInterpolant(new Float32Array(4)) || null;
    }
    window.__lampRigInfo = {
      format: "FBX",
      model: "Tischlampe_rigged.fbx",
      bones: ["Lamp_Head", "Lower_Arm", "Upper_Arm"].filter((name) => lampModel.getObjectByName(name)),
      bulbMeshes: bulbMeshes.length,
      skeletonVisible: false
    };
    screen.classList.add("model-ready");
  } catch (_) {
    screen.classList.add("model-unavailable");
  }

  const motion = {
    aimX: .18,
    aimY: -.12,
    currentAimX: .18,
    currentAimY: -.12,
    pointerX: innerWidth * .63,
    pointerY: innerHeight * .54,
    sourceX: innerWidth * .33,
    sourceY: innerHeight * .34,
    headAngle: 0,
    currentHeadAngle: 0,
    headResponsiveness: 1,
    jointX: 0,
    targetJointX: 0,
    jointY: 0,
    targetJointY: 0,
    lastTime: 0
  };
  let lit = false;
  let dragging = false;

  let lastPointerX = 0;
  let lastPointerY = 0;
  let editingPosition = false;
  let draggingPosition = false;
  let positionBeforeEdit = { ...lampPosition };
  let editingLight = false;

  function applyLighting() {
    screen.style.setProperty("--lamp-board-brightness", lampLighting.board.toFixed(2));
    screen.style.setProperty("--lamp-wash-opacity", clamp(.08 + lampLighting.lamp * .5, .35, 1).toFixed(2));
    screen.style.setProperty("--lamp-beam-opacity", clamp(.05 + lampLighting.lamp * .42, .32, .82).toFixed(2));
    if (boardBrightnessInput) boardBrightnessInput.value = String(Math.round(lampLighting.board * 100));
    if (lampBrightnessInput) lampBrightnessInput.value = String(Math.round(lampLighting.lamp * 100));
    if (boardBrightnessValue) boardBrightnessValue.textContent = `${Math.round(lampLighting.board * 100)}%`;
    if (lampBrightnessValue) lampBrightnessValue.textContent = `${Math.round(lampLighting.lamp * 100)}%`;
  }

  function saveLighting() {
    try {
      localStorage.setItem(LIGHTING_STORAGE_KEY, JSON.stringify({
        board: Number(lampLighting.board.toFixed(2)),
        lamp: Number(lampLighting.lamp.toFixed(2))
      }));
    } catch (_) {
      // 即使浏览器禁止本地存储，本次调节仍然即时生效。
    }
  }

  function setLightEditing(enabled) {
    editingLight = enabled;
    if (enabled) {
      if (editingPosition) setEditingPosition(false, true);
      turnOn();
      screen.classList.add("editing-light");
      lightEditor?.setAttribute("aria-hidden", "false");
      hintTitle.textContent = "正在调节台灯光线";
      hintDetail.textContent = "木板与灯光亮度会自动保存 · 按 E 关闭";
      return;
    }
    screen.classList.remove("editing-light");
    lightEditor?.setAttribute("aria-hidden", "true");
    if (lit) {
      hintTitle.textContent = "移动鼠标，让灯光寻找记忆";
      hintDetail.textContent = "按住左键调节关节 · 点击桌上档案查看";
    }
  }

  function updatePositionReadout() {
    if (!positionReadout) return;
    positionReadout.textContent = `X ${lampPosition.x.toFixed(2)} · Y ${lampPosition.y.toFixed(2)} · Z ${lampPosition.z.toFixed(2)}`;
  }

  function setLampPosition(nextPosition) {
    lampPosition.x = clamp(nextPosition.x, ...positionLimits.x);
    lampPosition.y = clamp(nextPosition.y, ...positionLimits.y);
    lampPosition.z = clamp(nextPosition.z, ...positionLimits.z);
    updatePositionReadout();
  }

  function showEditorStatus(message) {
    if (editorStatus) editorStatus.textContent = message;
  }

  function setEditingPosition(enabled, restore = false) {
    editingPosition = enabled;
    draggingPosition = false;
    if (enabled) {
      if (editingLight) setLightEditing(false);
      positionBeforeEdit = { ...lampPosition };
      turnOn();
      screen.classList.add("editing-position");
      editToggle?.setAttribute("aria-expanded", "true");
      editor?.setAttribute("aria-hidden", "false");
      if (editToggle) editToggle.textContent = "完成位置编辑";
      hintTitle.textContent = "正在编辑台灯位置";
      hintDetail.textContent = "拖动改变左右与高低 · 滚轮改变前后";
      showEditorStatus("");
      updatePositionReadout();
      return;
    }
    if (restore) setLampPosition(positionBeforeEdit);
    screen.classList.remove("editing-position", "dragging-position");
    editToggle?.setAttribute("aria-expanded", "false");
    editor?.setAttribute("aria-hidden", "true");
    if (editToggle) editToggle.textContent = "编辑台灯位置";
    if (lit) {
      hintTitle.textContent = "移动鼠标，让灯光寻找记忆";
      hintDetail.textContent = "按住左键调节关节 · 点击桌上档案查看";
    }
  }

  function nudgePosition(direction, amount = .2) {
    const nextPosition = { ...lampPosition };
    if (direction === "left") nextPosition.x -= amount;
    if (direction === "right") nextPosition.x += amount;
    if (direction === "up") nextPosition.y += amount;
    if (direction === "down") nextPosition.y -= amount;
    if (direction === "forward") nextPosition.z += amount;
    if (direction === "back") nextPosition.z -= amount;
    setLampPosition(nextPosition);
    showEditorStatus("位置尚未保存");
  }

  function resize() {
    const width = Math.max(1, canvas.clientWidth || innerWidth);
    const height = Math.max(1, canvas.clientHeight || innerHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function aimAt(clientX, clientY, updateHead = true) {
    const x = clamp(clientX / Math.max(1, innerWidth), 0, 1);
    const y = clamp(clientY / Math.max(1, innerHeight), 0, 1);
    motion.aimX = (x - .5) * 2;
    motion.aimY = (y - .5) * 2;
    motion.pointerX = clientX;
    motion.pointerY = clientY;
    screen.style.setProperty("--lamp-target-x", `${(x * 100).toFixed(2)}%`);
    screen.style.setProperty("--lamp-target-y", `${(y * 100).toFixed(2)}%`);
    if (updateHead) {
      const dx = clientX - motion.sourceX;
      const dy = clientY - motion.sourceY;
      const distance = Math.max(1, Math.hypot(dx, dy));
      // 角度只由归一化方向决定，与鼠标离灯头的距离无关。
      // Allow a slight upward sweep so the top and far-right memories remain reachable.
      motion.headAngle = clamp(Math.atan2(dy, dx) - Math.PI / 2, -1.9, 1.3);
      // 靠近灯头时只降低转动速度，最终朝向仍由方向决定。
      const distanceResponse = clamp((distance - 45) / 250, 0, 1);
      motion.headResponsiveness = .9 + distanceResponse * .65;
    }
  }

  function updateLightDirection() {
    const originX = motion.sourceX;
    const originY = motion.sourceY;
    const pointerDx = motion.pointerX - originX;
    const pointerDy = motion.pointerY - originY;
    const distance = Math.hypot(pointerDx, pointerDy);
    // 光束只读取台灯头当前呈现的角度，转动途中也不会和灯头分离。
    const directionX = -Math.sin(motion.currentHeadAngle);
    const directionY = Math.cos(motion.currentHeadAngle);
    const angle = Math.atan2(directionY, directionX) * 180 / Math.PI;
    const targetX = originX + directionX * distance;
    const targetY = originY + directionY * distance;
    const beamInset = 0;
    screen.style.setProperty("--lamp-source-x", `${(originX / Math.max(1, innerWidth) * 100).toFixed(2)}%`);
    screen.style.setProperty("--lamp-source-y", `${(originY / Math.max(1, innerHeight) * 100).toFixed(2)}%`);
    screen.style.setProperty("--lamp-target-x", `${(targetX / Math.max(1, innerWidth) * 100).toFixed(2)}%`);
    screen.style.setProperty("--lamp-target-y", `${(targetY / Math.max(1, innerHeight) * 100).toFixed(2)}%`);
    beam.style.left = `${(originX + directionX * beamInset).toFixed(1)}px`;
    beam.style.top = `${(originY + directionY * beamInset).toFixed(1)}px`;
    beam.style.width = `${clamp(distance - beamInset, innerWidth * .18, innerWidth * .82).toFixed(1)}px`;
    beam.style.height = `${clamp(distance * .58, 125, innerHeight * .66).toFixed(1)}px`;
    beam.style.transform = `translateY(-50%) rotate(${angle.toFixed(2)}deg)`;
    window.dispatchEvent(new CustomEvent("lamp-beam:move", {
      detail: { clientX: targetX, clientY: targetY }
    }));
  }

  function turnOn() {
    if (lit) return;
    lit = true;
    screen.classList.add("lit");
    hotspot.setAttribute("aria-label", "按住并拖动台灯，调整灯臂关节");
    hintTitle.textContent = "移动鼠标，让灯光寻找记忆";
    hintDetail.textContent = "按住左键调节关节 · 点击桌上档案查看";
    window.dispatchEvent(new CustomEvent("lamp-memory:lit"));
  }

  function beginDrag(event) {
    if (event.button !== 0) return;
    if (editingLight) {
      event.preventDefault();
      return;
    }
    if (editingPosition) {
      draggingPosition = true;
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
      screen.classList.add("dragging-position");
      screen.setPointerCapture?.(event.pointerId);
      event.preventDefault();
      return;
    }
    if (!lit) {
      turnOn();
      aimAt(event.clientX, event.clientY, false);
      event.preventDefault();
      return;
    }
    dragging = true;
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    screen.classList.add("dragging");
    screen.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }

  function movePointer(event) {
    // 灯头只读取鼠标相对灯泡的方向角；鼠标距离不会改变台灯位置。
    aimAt(event.clientX, event.clientY, true);
    if (editingLight) return;
    if (editingPosition) {
      if (!draggingPosition) return;
      const deltaX = event.clientX - lastPointerX;
      const deltaY = event.clientY - lastPointerY;
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
      setLampPosition({
        x: lampPosition.x + deltaX / Math.max(320, innerWidth) * 8,
        y: lampPosition.y - deltaY / Math.max(260, innerHeight) * 5.4,
        z: lampPosition.z
      });
      showEditorStatus("位置尚未保存");
      return;
    }
    if (!dragging) return;
    const deltaX = event.clientX - lastPointerX;
    const deltaY = event.clientY - lastPointerY;
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    motion.targetJointX = clamp(motion.targetJointX + deltaX / Math.max(320, innerWidth) * 2.7, -.72, .72);
    motion.targetJointY = clamp(motion.targetJointY - deltaY / Math.max(260, innerHeight) * 2.45, -1, 1);
  }

  function endDrag(event) {
    if (draggingPosition) {
      draggingPosition = false;
      screen.classList.remove("dragging-position");
      screen.releasePointerCapture?.(event.pointerId);
      return;
    }
    if (!dragging) return;
    dragging = false;
    screen.classList.remove("dragging");
    screen.releasePointerCapture?.(event.pointerId);
  }

  screen.addEventListener("pointerdown", beginDrag);
  screen.addEventListener("pointermove", movePointer, { passive: true });
  screen.addEventListener("pointerup", endDrag);
  screen.addEventListener("pointercancel", endDrag);
  screen.addEventListener("pointerleave", (event) => {
    if (dragging) endDrag(event);
  });
  hotspot.addEventListener("click", (event) => event.preventDefault());
  editorUi?.addEventListener("pointerdown", (event) => event.stopPropagation());
  editorUi?.addEventListener("pointermove", (event) => event.stopPropagation());
  editorUi?.addEventListener("pointerup", (event) => event.stopPropagation());
  editorUi?.addEventListener("click", (event) => event.stopPropagation());
  lightEditorUi?.addEventListener("pointerdown", (event) => event.stopPropagation());
  lightEditorUi?.addEventListener("pointermove", (event) => event.stopPropagation());
  lightEditorUi?.addEventListener("pointerup", (event) => event.stopPropagation());
  lightEditorUi?.addEventListener("click", (event) => event.stopPropagation());
  lightEditorUi?.addEventListener("wheel", (event) => event.stopPropagation());
  editToggle?.addEventListener("click", () => setEditingPosition(!editingPosition));
  editor?.querySelectorAll("[data-lamp-move]").forEach((button) => {
    button.addEventListener("click", () => nudgePosition(button.dataset.lampMove));
  });
  positionReset?.addEventListener("click", () => {
    setLampPosition(DEFAULT_POSITION);
    showEditorStatus("已恢复默认，点击保存后生效");
  });
  positionCancel?.addEventListener("click", () => setEditingPosition(false, true));
  positionSave?.addEventListener("click", () => {
    try {
      localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify({
        x: Number(lampPosition.x.toFixed(3)),
        y: Number(lampPosition.y.toFixed(3)),
        z: Number(lampPosition.z.toFixed(3))
      }));
      setEditingPosition(false);
      if (editToggle) editToggle.textContent = "位置已保存";
      window.setTimeout(() => {
        if (editToggle && !editingPosition) editToggle.textContent = "编辑台灯位置";
      }, 1600);
    } catch (_) {
      showEditorStatus("浏览器未允许保存，请检查隐私设置");
    }
  });
  boardBrightnessInput?.addEventListener("input", () => {
    lampLighting.board = clamp(Number(boardBrightnessInput.value) / 100, .3, .9);
    applyLighting();
    saveLighting();
  });
  lampBrightnessInput?.addEventListener("input", () => {
    lampLighting.lamp = clamp(Number(lampBrightnessInput.value) / 100, .7, 1.8);
    applyLighting();
    saveLighting();
  });
  lightingReset?.addEventListener("click", () => {
    lampLighting.board = DEFAULT_LIGHTING.board;
    lampLighting.lamp = DEFAULT_LIGHTING.lamp;
    applyLighting();
    saveLighting();
  });
  screen.addEventListener("wheel", (event) => {
    if (editingLight) {
      event.preventDefault();
      return;
    }
    if (editingPosition) {
      event.preventDefault();
      nudgePosition(event.deltaY < 0 ? "forward" : "back", Math.min(.34, Math.abs(event.deltaY) * .0028));
      return;
    }
    event.preventDefault();
  }, { passive: false });
  window.addEventListener("keydown", (event) => {
    if (!screen.classList.contains("active")) return;
    if (event.code === "KeyQ" && !event.ctrlKey && !event.metaKey && !event.altKey && !event.repeat) {
      setEditingPosition(!editingPosition, editingPosition);
      event.preventDefault();
      return;
    }
    if (event.code === "KeyE" && !event.ctrlKey && !event.metaKey && !event.altKey && !event.repeat) {
      setLightEditing(!editingLight);
      event.preventDefault();
      return;
    }
    if (editingLight) {
      if (event.key === "Escape") {
        setLightEditing(false);
        event.preventDefault();
      }
      return;
    }
    if (editingPosition) {
      const keyDirections = {
        ArrowLeft: "left",
        ArrowRight: "right",
        ArrowUp: "up",
        ArrowDown: "down",
        "+": "forward",
        "=": "forward",
        "-": "back"
      };
      if (event.key === "Escape") {
        setEditingPosition(false, true);
        event.preventDefault();
      } else if (keyDirections[event.key]) {
        nudgePosition(keyDirections[event.key]);
        event.preventDefault();
      }
      return;
    }
    if (!lit && (event.key === "Enter" || event.key === " ")) turnOn();

  });
  window.addEventListener("resize", resize);

  let animationFrame = 0;
  const animationVisible = () => !document.hidden && !document.body.classList.contains('archive-world-active');
  function wakeAnimation() {
    if (animationVisible() && !animationFrame) animationFrame = requestAnimationFrame(animate);
  }
  function animate(time) {
    animationFrame = 0;
    if (document.hidden || document.body.classList.contains('archive-world-active')) {
      motion.lastTime = time;
      return;
    }
    const elapsed = motion.lastTime ? Math.min(50, time - motion.lastTime) : 16;
    motion.lastTime = time;
    const follow = reducedMotion ? 1 : 1 - Math.exp(-elapsed / 230);
    const headResponseTime = 48 / motion.headResponsiveness;
    const headFollow = reducedMotion ? 1 : 1 - Math.exp(-elapsed / headResponseTime);
    motion.currentAimX += (motion.aimX - motion.currentAimX) * follow;
    motion.currentAimY += (motion.aimY - motion.currentAimY) * follow;
    motion.currentHeadAngle += (motion.headAngle - motion.currentHeadAngle) * headFollow;
    motion.jointX += (motion.targetJointX - motion.jointX) * follow;
    motion.jointY += (motion.targetJointY - motion.jointY) * follow;

    lampRig.position.x = lampPosition.x;
    lampRig.position.y = lampPosition.y;
    lampRig.position.z = lampPosition.z;
    lampRig.rotation.y = -.08;
    lampRig.rotation.z = 0;
    lampRig.scale.setScalar(1.08);

    if (poseMixer && poseDuration > 0) {
      const restTime = poseDuration * .5;
      const lowerTime = poseDuration * .25;
      const upperTime = poseDuration * .75;
      const naturalPose = clamp(
        motion.jointY + motion.jointX * .18,
        -1,
        1
      );
      const poseTime = naturalPose < 0
        ? restTime + (restTime - lowerTime) * naturalPose
        : restTime + (upperTime - restTime) * naturalPose;
      currentPoseTime = clamp(poseTime, 0, poseDuration);
      poseMixer.setTime(currentPoseTime);
    }

    if (headBone) {
      if (headQuaternionInterpolant) {
        headBone.quaternion.fromArray(headQuaternionInterpolant.evaluate(currentPoseTime));
      }
      headRotation.setFromAxisAngle(headRotationAxis, motion.currentHeadAngle);
      headBone.quaternion.premultiply(headRotation);
      headBone.updateMatrixWorld(true);
      lampModel?.updateMatrixWorld(true);
      headBone.getWorldPosition(headWorldPosition);
    }

    bulbWorldPosition.set(0, 0, 0);
    let bulbCount = 0;
    bulbMeshes.forEach((mesh) => {
      if (!mesh.boundingBox) return;
      mesh.boundingBox.getCenter(bulbLocalCenter);
      mesh.localToWorld(bulbLocalCenter);
      bulbWorldPosition.add(bulbLocalCenter);
      bulbCount += 1;
    });
    if (bulbCount) bulbWorldPosition.multiplyScalar(1 / bulbCount);
    else bulbWorldPosition.copy(headWorldPosition);
    bulbLight.position.lerp(bulbWorldPosition, follow);
    projectedLightPosition.copy(bulbWorldPosition).project(camera);
    const bulbScreenOffset = innerHeight * .012;
    motion.sourceX = (projectedLightPosition.x * .5 + .5) * innerWidth - Math.sin(motion.currentHeadAngle) * bulbScreenOffset;
    motion.sourceY = (-projectedLightPosition.y * .5 + .5) * innerHeight + Math.cos(motion.currentHeadAngle) * bulbScreenOffset;
    updateLightDirection();

    const lightEase = lit ? 1 : 0;
    ambient.intensity += (((.48 * lightEase) + .16) - ambient.intensity) * follow;
    keyLight.intensity += (((.95 * lightEase) + .22) - keyLight.intensity) * follow;
    bulbLight.intensity += (((6.1 * lampLighting.lamp) * lightEase) - bulbLight.intensity) * follow;
    bulbMaterials.forEach((material) => {
      material.emissiveIntensity += ((lit ? 1.25 * lampLighting.lamp : 0) - material.emissiveIntensity) * follow;
    });

    renderer.render(scene, camera);
    wakeAnimation();
  }

  document.addEventListener('visibilitychange', wakeAnimation);
  new MutationObserver(wakeAnimation).observe(document.body, { attributes: true, attributeFilter: ['class'] });

  resize();
  updatePositionReadout();
  applyLighting();
  aimAt(innerWidth * .63, innerHeight * .54, false);
  wakeAnimation();
})();
