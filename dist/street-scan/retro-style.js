// Early-PC approximation for the existing Gaussian scan. This does not remesh
// the scan or claim to generate low-poly topology / new character assets.
export const retroGeometryShader = `
float retroDiffuse = 1.0;
void modifySplatCenter(inout vec3 center) {}
void modifySplatRotationScale(vec3 originalCenter, vec3 center, inout vec4 rotation, inout vec3 scale) {
    // The thin covariance axis approximates each scanned surface's normal.
    vec3 axis = scale.x < scale.y && scale.x < scale.z ? vec3(1,0,0)
              : scale.y < scale.z ? vec3(0,1,0) : vec3(0,0,1);
    vec3 normal = axis + 2.0 * cross(rotation.xyz, cross(rotation.xyz, axis) + rotation.w * axis);
    float lambert = abs(dot(normalize(normal), normalize(vec3(-0.6, 0.85, 0.35))));
    retroDiffuse = 0.72 + floor(lambert * 3.0) * 0.12;
}
vec3 retroPigment(vec3 color, vec3 center) {
    // Limited texture palette, lifted darks, warm masonry and cool shadow tint.
    vec3 pigment = pow(clamp(color, 0.0, 1.0), vec3(0.78));
    float gray = dot(pigment, vec3(0.299, 0.587, 0.114));
    pigment = mix(vec3(gray), pigment, 1.22);
    pigment = floor(clamp(pigment, 0.0, 1.0) * 7.0 + 0.5) / 7.0;
    vec3 shade = mix(vec3(0.73, 0.79, 0.86), vec3(1.07, 1.02, 0.86), step(0.9, retroDiffuse));
    return clamp(pigment * retroDiffuse * shade + vec3(0.025), 0.0, 1.0);
}
`;

export function applyRetroScene(viewer) {
    const settings = viewer.global.settings;
    // Preserve baked capture shading; avoid adding modern bloom, reflections or GI.
    settings.postEffectSettings.bloom.enabled = false;
    settings.postEffectSettings.sharpness.enabled = false;
    settings.postEffectSettings.grading.enabled = false;
    settings.background.color = [0.49, 0.63, 0.69];
    viewer.configureCamera(settings);
    viewer.global.app.graphicsDevice.canvas.style.imageRendering = 'pixelated';
}
