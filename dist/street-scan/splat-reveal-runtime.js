// Injected into the existing PlayCanvas viewer closure; no new scene or loader.
// Light is part of the reveal, before the walking game activates.
window.streetGameBridge.enableDefaultLight();
const PORTAL_REVEAL_DEFAULTS = Object.freeze({
 revealDuration:12, portalStartSize:0.14, portalHoleSize:0.32, radialSpeed:1,
 twistStrength:0.45, noiseStrength:0.18, ghostStrength:0.8,
 borderWidth:0.15, borderBrightness:0.7
});
let portalSettings={...PORTAL_REVEAL_DEFAULTS};
window.portalRevealSettings=portalSettings;
let portalBasisCaptured=false;
function configurePortal(options={}) {
 const next={...portalSettings,...options};
 if(options.duration!==undefined) next.revealDuration=options.duration;
 for(const key of Object.keys(PORTAL_REVEAL_DEFAULTS)) {
  if(!Number.isFinite(next[key]) || next[key]<0) throw Error(key+' must be finite and non-negative');
 }
 if(next.radialSpeed<=0 || next.portalStartSize>1 || next.portalHoleSize>1) throw Error('Invalid portal size or radialSpeed');
 Object.assign(portalSettings,next);
 const names={portalStartSize:'uPortalStartSize',portalHoleSize:'uPortalHoleSize',radialSpeed:'uRadialSpeed',twistStrength:'uTwistStrength',noiseStrength:'uNoiseStrength',ghostStrength:'uGhostStrength',borderWidth:'uBorderWidth',borderBrightness:'uBorderBrightness'};
 for(const [key,name] of Object.entries(names)) splatMaterial.setParameter(name,portalSettings[key]);
}
function capturePortalBasis() {
 const camera=viewer.global.camera;
 for(const [name,v] of [['uPortalEye',camera.getPosition()],['uPortalForward',camera.forward],['uPortalRight',camera.right],['uPortalUp',camera.up]]) {
  splatMaterial.setParameter(name,new Float32Array([v.x,v.y,v.z]));
 }
 // Estimate pavement from nearby low splats along the player's street.
 const eye=camera.getPosition(), f=camera.forward;
 const floorSamples=[];
 for(const c of app.root.findComponents('gsplat')) {
  const a=c.resource?.centers;if(!a)continue;
  const m=c.entity.getWorldTransform().data;
  const stride=Math.max(1,Math.ceil(a.length/3/60000))*3;
  for(let i=0;i<a.length;i+=stride){
   const x=m[0]*a[i]+m[4]*a[i+1]+m[8]*a[i+2]+m[12];
   const y=m[1]*a[i]+m[5]*a[i+1]+m[9]*a[i+2]+m[13];
   const z=m[2]*a[i]+m[6]*a[i+1]+m[10]*a[i+2]+m[14];
   const dx=x-eye.x,dz=z-eye.z,depth=dx*f.x+dz*f.z;
   if(depth>-1&&depth<18&&Math.abs(dx*f.z-dz*f.x)<2.0&&y<eye.y-0.7&&y>eye.y-4)floorSamples.push(y);
  }
 }
 floorSamples.sort((a,b)=>a-b);
 const ground=floorSamples.length?floorSamples[Math.floor(floorSamples.length*0.45)]:eye.y-1.7;
 splatMaterial.setParameter('uStreetGround',ground);
 window.streetRevealGround=ground;
 portalBasisCaptured=true;
}
let revealFrame = 0, revealResolve = null, revealProgress = 0, revealConfigured = false;

function configureRevealBounds() {
 if(revealConfigured) return;
 const min=[Infinity,Infinity,Infinity], max=[-Infinity,-Infinity,-Infinity];
 const samples=[];
 for(const component of app.root.findComponents('gsplat')) {
  const bounds=component.resource?.aabb;
  if(!bounds) continue;
  const m=component.entity.getWorldTransform().data;
  const centers=component.resource.centers;
  if(centers) {
   const stride=Math.max(1,Math.ceil(centers.length/3/16000))*3;
   for(let j=0;j<centers.length;j+=stride) {
    const x=centers[j],y=centers[j+1],z=centers[j+2];
    samples.push([m[0]*x+m[4]*y+m[8]*z+m[12],m[1]*x+m[5]*y+m[9]*z+m[13],m[2]*x+m[6]*y+m[10]*z+m[14]]);
   }
  }
  for(let mask=0;mask<8;mask++) {
   const x=bounds.center.x+bounds.halfExtents.x*(mask&1?1:-1);
   const y=bounds.center.y+bounds.halfExtents.y*(mask&2?1:-1);
   const z=bounds.center.z+bounds.halfExtents.z*(mask&4?1:-1);
   const p=[m[0]*x+m[4]*y+m[8]*z+m[12],m[1]*x+m[5]*y+m[9]*z+m[13],m[2]*x+m[6]*y+m[10]*z+m[14]];
   p.forEach((v,i)=>{min[i]=Math.min(min[i],v);max[i]=Math.max(max[i],v)});
  }
 }
 if(!min.every(Number.isFinite)) throw Error('Splat bounds are not ready');
 // Median center keeps isolated reconstruction outliers from shifting the origin.
 const center=min.map((v,i)=>samples.length?samples.map(p=>p[i]).sort((a,b)=>a-b)[Math.floor(samples.length/2)]:(v+max[i])*0.5);
 const radius=Math.hypot(...max.map((v,i)=>Math.max(v-center[i],center[i]-min[i])));
 splatMaterial.setParameter('uRevealCenter',new Float32Array(center));
 splatMaterial.setParameter('uModelRadius',radius);
 window.memoryPlayback.bounds={center,radius,min,max};
 revealConfigured=true;
}
function setRevealProgress(progress,time=0) {
 revealProgress=Math.max(0,Math.min(1,progress));
 splatMaterial.setParameter('uRevealProgress',revealProgress);
 splatMaterial.setParameter('uTime',time);
 splatMaterial.update();
 app.renderNextFrame=true;
}
function resetPortalReveal() {
 cancelAnimationFrame(revealFrame);revealFrame=0;
 if(revealResolve){revealResolve(false);revealResolve=null;}
 setRevealProgress(0);
}
function startPortalReveal(options={}) {
 if(!window.memoryPlayback.ready) return Promise.reject(Error('Wait for the Gaussian model to finish loading'));
 try {configurePortal(options);} catch(error){return Promise.reject(error);}
 const duration=portalSettings.revealDuration;
 resetPortalReveal();
 configureRevealBounds();
 capturePortalBasis();
 return new Promise(resolve=>{
  revealResolve=resolve;
  const started=performance.now();
  function frame(now) {
   const elapsed=(now-started)/1000;
   const p=duration===0?1:Math.min(1,elapsed/duration);
   setRevealProgress(p,elapsed);
   if(p<1) revealFrame=requestAnimationFrame(frame);
   else {revealFrame=0;revealResolve=null;resolve(true);}
  }
  revealFrame=requestAnimationFrame(frame);
 });
}
window.startPortalReveal=startPortalReveal;
window.startSplatReveal=startPortalReveal;
window.resetSplatReveal=resetPortalReveal;
window.resetPortalReveal=resetPortalReveal;
window.memoryPlayback={
 get ready(){return !!viewer.global.state.loaded && !!viewer.cameraManager;},
 get progress(){return viewer.global.state.progress;},
 get revealProgress(){return revealProgress;},
 get duration(){return portalSettings.revealDuration;},
 startPortalReveal,resetPortalReveal,
 startSplatReveal:startPortalReveal,resetSplatReveal:resetPortalReveal,
 // Deterministic seeking for preview/QA, without touching the camera or controls.
 reveal(t){configurePortal();configureRevealBounds();if(!portalBasisCaptured)capturePortalBasis();setRevealProgress(t,t*portalSettings.revealDuration);},
 activate(){document.body.classList.add('memory-entered');app.renderNextFrame=true;}
};
configurePortal();
capturePortalBasis();
portalBasisCaptured=false; // Camera initialization finishes with model loading.
splatMaterial.setParameter('uModelRadius',1);
resetPortalReveal();

