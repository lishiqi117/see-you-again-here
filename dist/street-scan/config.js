// World coordinates, calibrated against the supplied image (red doorway on left).
export const config = {
 route: [[9, 2.2, 8], [-2.45, 2.2, -14.9]],
 speed: 1.15, maxLateralOffset: 0.22, fov: 75,
 dwellSeconds: 1.2, completionThreshold: 0.75, scanDistance: 15, pickInterval: 0.16,
 highlight: [0.40, 0.86, 0.81],
 // Spatial partitions of the Gaussian scan, not semantic mesh IDs.
 regions: { sections: 8, groundHeight: 1.15, minHeight: -1, maxHeight: 13, halfWidth: 12 },
 handCamera: './assets/camera.glb'
};
