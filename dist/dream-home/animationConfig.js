// 修改后刷新页面即可；时长单位为秒，位移为设计画布像素，角度为度。
window.DREAM_CONFIG = {
  intensity: 1, // 全局动画幅度；0 为静止，建议 0～1。
  assets: { reference: 'assets/reference.png', cleanPlate: 'assets/clean-plate.png', cat: null },
  camera: { duration: 26, scale: 1.012 },
  clouds: {
    far: { duration: 25, x: 0.7, y: 3, scale: 1.002, phase: 0.13, blur: 0, contrast: 0.995 },
    middle: { duration: 17, x: 2, y: 5, scale: 1.004, phase: 0.48, blur: 0, contrast: 1 },
    near: { duration: 21, x: 2.5, y: 8, scale: 1.004, phase: 0.77, blur: 0.25, contrast: 1 },
    foreground: { duration: 29, x: 2, y: 10, scale: 1.004, phase: 0.31, blur: 1, contrast: 1 }
  },
  cat: { duration: 8, x: 2, yMin: -4, yMax: 5, rotation: 0.8,
    fur: { enabled: true, scale: 1.8, duration: 12, frequencyMin: 0.028, frequencyMax: 0.034, edgeWidth: 3, fps: 12 },
    tail: { duration: 6, rotationMin: -1.5, rotationMax: 2 }
  },
  stars: {
    small: { scaleMin: 0.85, scaleMax: 1, durationMin: 2.8, durationMax: 4.8 },
    medium: { scaleMin: 0.9, scaleMax: 1.08, durationMin: 3.8, durationMax: 6 },
    large: { scaleMin: 0.96, scaleMax: 1.03, durationMin: 5.5, durationMax: 6.5 },
    opacityMin: 0.65, opacityMax: 1, delayMax: 5, foregroundBlur: 1.2
  },
  starfield: { count: 7, opacityMin: 0.25, opacityMax: 0.8, durationMin: 1.5, durationMax: 4, reducedOpacityMin: 0.72, reducedOpacityMax: 0.82 },
  sun: { duration: 10, scale: 1.015, glowOpacityMin: 0.45, glowOpacityMax: 0.7, glowBlurMin: 10, glowBlurMax: 12 },
  planets: { x: 2, y: 3, rotation: 1.5, durations: [13, 19, 16] },
  parallax: { enabled: true, lerp: 0.025, far: 2, middle: 4, cat: 5, near: 8 },
  grain: { opacity: 0.035 },
  responsive: { focalX: 0.50, focalY: 0.5, portraitFocalX: 0.465, catSafeMargin: 20 }
};
