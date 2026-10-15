(() => {
  "use strict";

  const screen = document.querySelector("#lampMemory");
  const canvas = document.querySelector("#lampRevealCanvas");
  if (!screen || !canvas) return;

  const context = canvas.getContext("2d", { alpha: true });
  const maskCanvas = document.createElement("canvas");
  const maskContext = maskCanvas.getContext("2d", { alpha: true });
  if (!context || !maskContext) return;

  let revealImage;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const blobs = [];
  const pointer = { x: 0, y: 0, lastX: 0, lastY: 0, hasPosition: false };
  let viewportWidth = 1;
  let viewportHeight = 1;
  let pixelRatio = 1;
  let imageReady = false;
  let lastFrameTime = 0;
  let frame = 0;
  let inputDirty = false;
  const archiveDialog = document.querySelector('#deskArchiveDialog');
  function wake() {
    if (!frame && !document.hidden && !archiveDialog?.open && !document.body.classList.contains('archive-world-active')) frame = requestAnimationFrame(render);
  }

  function resize() {
    viewportWidth = Math.max(1, canvas.clientWidth || innerWidth);
    viewportHeight = Math.max(1, canvas.clientHeight || innerHeight);
    pixelRatio = Math.min(devicePixelRatio || 1, 1.6);
    const width = Math.round(viewportWidth * pixelRatio);
    const height = Math.round(viewportHeight * pixelRatio);
    if (canvas.width === width && canvas.height === height) return;
    canvas.width = width;
    canvas.height = height;
    maskCanvas.width = width;
    maskCanvas.height = height;
    blobs.length = 0;
    pointer.hasPosition = false;
  }

  function addBlob(x, y, time, velocity = 0, angle = 0) {
    const speedFactor = clamp(velocity / 44, 0, 1);
    blobs.push({
      x,
      y,
      born: time,
      lifetime: 1250 + Math.random() * 650,
      radius: 60 + speedFactor * 25 + Math.random() * 18,
      phase: Math.random() * Math.PI * 2,
      morphSpeed: .00105 + Math.random() * .00065,
      lobes: 7 + Math.floor(Math.random() * 3),
      driftX: (Math.random() - .5) * 3,
      driftY: (Math.random() - .5) * 2.4,
      angle,
      stretch: 1.2 + speedFactor * .5
    });
    if (blobs.length > 110) blobs.splice(0, blobs.length - 110);
  }

  function traceLightPath(x, y, time) {
    if (!screen.classList.contains("lit") || !screen.classList.contains("active")) return;
    if (screen.classList.contains("editing-position") || screen.classList.contains("editing-light")) return;
    if (!pointer.hasPosition) {
      pointer.x = pointer.lastX = x;
      pointer.y = pointer.lastY = y;
      pointer.hasPosition = true;
      addBlob(x, y, time);
      inputDirty = true;
      wake();
      return;
    }

    const dx = x - pointer.lastX;
    const dy = y - pointer.lastY;
    const distance = Math.hypot(dx, dy);
    if (distance < 7) {
      pointer.x = x;
      pointer.y = y;
      return;
    }

    const spacing = 27;
    const steps = Math.max(1, Math.ceil(distance / spacing));
    const movementAngle = Math.atan2(dy, dx);
    for (let step = 1; step <= steps; step += 1) {
      const progress = step / steps;
      addBlob(
        pointer.lastX + dx * progress,
        pointer.lastY + dy * progress,
        time - (steps - step) * 7,
        distance / steps,
        movementAngle
      );
    }
    pointer.x = pointer.lastX = x;
    pointer.y = pointer.lastY = y;
    inputDirty = true;
    wake();
  }

  function traceClientPosition(clientX, clientY, time) {
    const bounds = canvas.getBoundingClientRect();
    traceLightPath(clientX - bounds.left, clientY - bounds.top, time);
  }

  function buildOrganicPath(targetContext, blob, time, scale = 1) {
    const age = time - blob.born;
    const lifeProgress = clamp(age / blob.lifetime, 0, 1);
    const centerX = blob.x + Math.sin(age * .0018 + blob.phase) * blob.driftX * lifeProgress;
    const centerY = blob.y + Math.cos(age * .00155 + blob.phase) * blob.driftY * lifeProgress;
    const breathe = 1 + Math.sin(age * .0032 + blob.phase) * .018;
    const radius = blob.radius * scale * breathe * (1 - lifeProgress * .09);
    const points = [];
    const directionCos = Math.cos(blob.angle);
    const directionSin = Math.sin(blob.angle);

    for (let index = 0; index < blob.lobes; index += 1) {
      const angle = index / blob.lobes * Math.PI * 2;
      const morph =
        Math.sin(time * blob.morphSpeed + blob.phase + index * 1.73) * .065 +
        Math.sin(time * blob.morphSpeed * .63 - blob.phase * .7 + index * 3.11) * .025;
      const localRadius = radius * (1 + morph);
      const localX = Math.cos(angle) * localRadius * blob.stretch;
      const localY = Math.sin(angle) * localRadius * .76;
      points.push({
        x: centerX + localX * directionCos - localY * directionSin,
        y: centerY + localX * directionSin + localY * directionCos
      });
    }

    const first = points[0];
    const last = points[points.length - 1];
    targetContext.beginPath();
    targetContext.moveTo((last.x + first.x) * .5, (last.y + first.y) * .5);
    points.forEach((point, index) => {
      const next = points[(index + 1) % points.length];
      targetContext.quadraticCurveTo(point.x, point.y, (point.x + next.x) * .5, (point.y + next.y) * .5);
    });
    targetContext.closePath();
  }

  function drawMask(time) {
    maskContext.setTransform(1, 0, 0, 1, 0, 0);
    maskContext.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    maskContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    const drawLayer = (soft) => {
      maskContext.save();
      maskContext.filter = soft ? "blur(7px)" : "none";
      blobs.forEach((blob) => {
        const progress = clamp((time - blob.born) / blob.lifetime, 0, 1);
        if (progress >= 1) return;
        const fadeIn = clamp((time - blob.born) / 95, 0, 1);
        const fadeOut = Math.pow(1 - progress, 1.45);
        const alpha = fadeIn * fadeOut * (soft ? .42 : .88);
        buildOrganicPath(maskContext, blob, time, soft ? 1.04 : .96);
        maskContext.fillStyle = `rgba(255,255,255,${alpha.toFixed(4)})`;
        maskContext.fill();
      });
      maskContext.restore();
    };

    drawLayer(true);
    drawLayer(false);
  }

  function drawImageCover(targetContext, image) {
    const scale = Math.max(viewportWidth / image.width, viewportHeight / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    const x = (viewportWidth - width) * .5;
    const y = (viewportHeight - height) * .5;
    targetContext.drawImage(image, x, y, width, height);
  }

  function drawRevealFrame(time) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);

    if (imageReady && blobs.length) {
      drawMask(time);
      context.globalCompositeOperation = "source-over";
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.drawImage(maskCanvas, 0, 0);
      context.globalCompositeOperation = "source-in";
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      drawImageCover(context, revealImage);
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.globalCompositeOperation = "source-over";
    }

  }

  function render(time) {
    frame = 0;
    if (document.hidden || archiveDialog?.open || document.body.classList.contains('archive-world-active')) {
      blobs.length = 0;
      pointer.hasPosition = false;
      return;
    }
    if (!inputDirty && lastFrameTime && time - lastFrameTime < 22) {
      wake();
      return;
    }
    lastFrameTime = time;
    inputDirty = false;
    for (let index = blobs.length - 1; index >= 0; index -= 1) {
      if (time - blobs[index].born >= blobs[index].lifetime) blobs.splice(index, 1);
    }
    drawRevealFrame(time);

    if (blobs.length) wake();
  }

  window.lampBackgroundReady.then((image) => {
    revealImage = image;
    imageReady = true;
  }).catch(console.error);

  window.addEventListener("lamp-beam:move", (event) => {
    const { clientX, clientY } = event.detail || {};
    if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return;
    traceClientPosition(clientX, clientY, performance.now());
  });
  window.addEventListener("lamp-memory:lit", () => {
    window.SiteSounds?.play('lamp');
    pointer.hasPosition = false;
  });
  window.addEventListener("resize", resize);
  new ResizeObserver(resize).observe(canvas);
  document.addEventListener('visibilitychange', wake);
  new MutationObserver(wake).observe(document.body, {attributes:true,attributeFilter:['class']});
  if (archiveDialog) new MutationObserver(wake).observe(archiveDialog, {attributes:true,attributeFilter:['open']});

  resize();
  wake();
})();
