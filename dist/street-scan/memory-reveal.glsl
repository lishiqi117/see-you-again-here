uniform float uRevealProgress;
uniform float uTime;
uniform vec3 uPortalEye;
uniform vec3 uPortalForward;
uniform vec3 uPortalRight;
uniform float uStreetGround;
float revealVisibility=1.0;
float revealGaussian=1.0;
float revealBlend=1.0;
float particleLight=1.0;
float transitionLight=0.0;
// A steady opening gathers speed late in each pass, without a stopped start.
float revealRhythm(float t) {
 t=clamp(t,0.0,1.0);
 return 0.8*t+0.2*t*t*t*t;
}
float portalNoise(vec3 p) {
 vec3 i=floor(p), f=fract(p);f=f*f*(3.0-2.0*f);
 return mix(mix(mix(customHash(i),customHash(i+vec3(1,0,0)),f.x),
 mix(customHash(i+vec3(0,1,0)),customHash(i+vec3(1,1,0)),f.x),f.y),
 mix(mix(customHash(i+vec3(0,0,1)),customHash(i+vec3(1,0,1)),f.x),
 mix(customHash(i+vec3(0,1,1)),customHash(i+vec3(1,1,1)),f.x),f.y),f.z);
}
// Both passes use this exact frozen spatial schedule, in world coordinates.
float streetArrival(vec3 p) {
 vec2 forward=normalize(uPortalForward.xz);
 vec2 delta=p.xz-uPortalEye.xz;
 float depth=dot(delta,forward);
 float side=abs(dot(delta,vec2(-forward.y,forward.x)));
 float travel=length(delta);
 float h=max(0.0,p.y-uStreetGround);
 float n=portalNoise(p*1.7)*0.7+portalNoise(p*5.3)*0.3;
 float arrival;
 if(h<0.65 && side<2.7) {
  // Entire road advances away from the player's feet before walls begin.
  arrival=0.018+0.30*travel/(travel+12.0);
 } else {
  // Both facades rise together from pavement level to the rooftops.
  arrival=0.40+0.43*h/(h+7.0)+0.035*travel/(travel+20.0);
 }
 arrival+=(n-0.5)*0.024;
 return clamp(arrival,0.012,0.89);
}
void modifySplatCenter(inout vec3 center) {
 vec3 original=center;
 originalCenterMotion(center);
 if(uRevealProgress>=1.0) return;
 float arrival=streetArrival(original);
 float points=revealRhythm(uRevealProgress/0.43);
 float gaussian=revealRhythm((uRevealProgress-0.40)/0.60);
 revealVisibility=smoothstep(arrival,arrival+0.065,points);
 // Smooth staggered replacement: fade each point out, switch at zero alpha,
 // then fade the native Gaussian in. No growth or stretching of geometry.
 float grain=customHash(original*71.3);
 revealBlend=smoothstep(arrival,arrival+0.065,gaussian);
 // A narrow, soft light follows the same noisy street/wall front on both
 // sides of the material handoff, and vanishes behind the completed front.
 transitionLight=smoothstep(arrival-0.018,arrival+0.016,gaussian)
                 *(1.0-smoothstep(arrival+0.068,arrival+0.115,gaussian))
                 *smoothstep(0.40,0.415,uRevealProgress);
 float local=clamp((revealBlend-grain*0.35)/0.65,0.0,1.0);
 revealGaussian=step(0.5,local);
 float crossfade=abs(local*2.0-1.0);
 revealVisibility*=smoothstep(0.0,0.5,crossfade);
 // The last particles and first road Gaussians overlap briefly: no hold.
 particleLight=1.65+0.45*(1.0-smoothstep(arrival+0.065,arrival+0.16,points));
 if(revealGaussian<0.5) {
  float phase=grain*6.2831853;
  float settle=1.0-smoothstep(0.0,0.48,local);
  vec3 drift=vec3(sin(uTime*1.05+phase+original.z*0.3)*0.014,
                  sin(uTime*0.82+phase*1.7)*0.022,
                  cos(uTime*0.94+phase+original.x*0.3)*0.014);
  center+=drift*settle;
 }
}
void modifySplatRotationScale(vec3 originalCenter,vec3 modifiedCenter,inout vec4 rotation,inout vec3 scale) {
 originalRotationScale(originalCenter,modifiedCenter,rotation,scale);
 if(uRevealProgress<1.0 && revealGaussian<0.5) {
  rotation=vec4(0.0,0.0,0.0,1.0);
  scale=vec3(uPointCloudSize*0.32);
 }
}
void modifySplatColor(vec3 center,inout vec4 color) {
 originalColor(center,color);
 if(uRevealProgress>=1.0) return;
 if(revealGaussian<0.5) {color.a=1.0;color.rgb*=particleLight;}
 color.rgb=color.rgb*(1.0+transitionLight*0.38)
           +vec3(0.34,0.25,0.12)*transitionLight;
 color.a*=revealVisibility;
}
