// Independent animated ink sky: preserve reveal, twinkle and meteors at full contrast.
export function createStarfieldBackground(canvas, viewport) {
  const ctx = canvas.getContext('2d');
  const mask = document.createElement('canvas');
  const maskCtx = mask.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let width = 1, height = 1, ratio = 1, stars = [], field, pixels;
  let lastFrame = -Infinity, elapsed = 0, previousTime = null;
  let lastProgress = -1;
  const unit = (n) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
  const smooth = t => t * t * (3 - 2 * t);
  function noise(x, y) {
    const ix = Math.floor(x), iy = Math.floor(y), fx = smooth(x - ix), fy = smooth(y - iy);
    const a = unit(ix + iy * 157), b = unit(ix + 1 + iy * 157);
    const c = unit(ix + (iy + 1) * 157), d = unit(ix + 1 + (iy + 1) * 157);
    return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
  }
  const painter = {
    progress: 0,
    resize(w, h) {
      width = Math.max(1, Math.round(w)); height = Math.max(1, Math.round(h));
      ratio = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      stars = Array.from({ length: Math.min(430, Math.max(90, Math.round(width * height / 4600))) }, (_, i) => ({
        x: unit(i * 7 + 1) * width, y: unit(i * 7 + 2) * height,
        radius: 0.55 + Math.pow(unit(i * 7 + 3), 3) * 1.5,
        alpha: 0.4 + unit(i * 7 + 4) * 0.6,
        phase: unit(i * 7 + 5) * Math.PI * 2, speed: 0.55 + unit(i * 7 + 6) * 1.1
      }));
      mask.width = Math.min(width, 480); mask.height = Math.max(1, Math.round(mask.width * height / width));
      pixels = maskCtx.createImageData(mask.width, mask.height);
      field = new Float32Array(mask.width * mask.height);
      for (let y = 0; y < mask.height; y++) for (let x = 0; x < mask.width; x++) {
        const nx = x / mask.width * 5 * width / height, ny = y / mask.height * 5;
        const warp = noise(nx * 0.7 + 4, ny * 0.7) * 1.4;
        const n = noise(nx + warp, ny + warp) * 0.72 + noise(nx * 2.4, ny * 2.4) * 0.21 + noise(nx * 5, ny * 5) * 0.07;
        field[y * mask.width + x] = n;
      }
      lastProgress = -1; lastFrame = -Infinity;
      this.draw(elapsed);
    },
    paint(progress) { this.progress = Math.max(0, Math.min(1, progress)); lastFrame = -Infinity; },
    tick(time) {
      const dt = previousTime === null ? 0 : Math.min((time - previousTime) / 1000, 0.05);
      previousTime = time;
      if (document.hidden) return;
      if (!reduced.matches) elapsed += dt;
      if (time - lastFrame < 1000 / 30 || (reduced.matches && lastProgress === this.progress)) return;
      lastFrame = time; this.draw(elapsed);
    },
    draw(time) {
      ctx.globalAlpha = 1; ctx.fillStyle = '#f9eef3'; ctx.fillRect(0, 0, width, height);
      for (const star of stars) {
        const shimmer = reduced.matches ? 1 : 0.6 + 0.4 * Math.sin(time * star.speed + star.phase);
        const drift = reduced.matches ? 0 : Math.sin(time * 0.15 + star.phase) * 5;
        ctx.globalAlpha = star.alpha * shimmer; ctx.fillStyle = '#c64e8b';
        ctx.beginPath(); ctx.arc(star.x + drift, star.y, star.radius, 0, Math.PI * 2); ctx.fill();
      }
      // One short meteor every 7–10 seconds, with a fading tapered trail.
      const cycle = Math.floor(time / 8.7), age = time % 8.7 - 3;
      if (!reduced.matches && age >= 0 && age < 1.15) {
        const p = age / 1.15, travel = Math.min(width * 0.36, 460);
        const x = width * (0.12 + unit(cycle + 600) * 0.55) + travel * p;
        const y = height * (0.06 + unit(cycle + 700) * 0.3) + travel * p * 0.48;
        const length = Math.min(110, width * 0.16);
        const gradient = ctx.createLinearGradient(x - length, y - length * 0.48, x, y);
        gradient.addColorStop(0, '#e7ef2100'); gradient.addColorStop(.55, '#d6dc3299'); gradient.addColorStop(1, '#c64e8b');
        ctx.globalAlpha = Math.sin(p * Math.PI);
        ctx.strokeStyle = gradient; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.moveTo(x - length, y - length * 0.48); ctx.lineTo(x, y); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // A coherent noise threshold makes pools join with soft liquid edges.
      if (this.progress < 1) {
        if (lastProgress !== this.progress) {
          const threshold = this.progress * 1.16 - 0.08;
          for (let i = 0; i < field.length; i++) {
            const cover = smooth(Math.max(0, Math.min(1, (field[i] - threshold) / 0.025)));
            const offset = i * 4;
            pixels.data[offset] = 239; pixels.data[offset + 1] = 243; pixels.data[offset + 2] = 90;
            pixels.data[offset + 3] = Math.round(cover * 255);
          }
          maskCtx.putImageData(pixels, 0, 0);
        }
        ctx.drawImage(mask, 0, 0, width, height);
      }
      lastProgress = this.progress;
    }
  };
  reduced.addEventListener('change', () => { lastFrame = -Infinity; lastProgress = -1; });
  painter.resize(viewport.clientWidth, viewport.clientHeight);
  return painter;
}
