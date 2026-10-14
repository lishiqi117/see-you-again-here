import * as T from 'three';
import { gsap } from 'gsap';
import { createSchoolContinuation } from './school-continuation.js';

// The doorway belongs to the school pivot, so saved layouts also move the portal.
export function createSchoolPortal({scene,camera,canvas,state,controls,walker,invalidate,resetInteraction,captureFrame}) {
 const viewport=canvas.parentElement;
 const star=document.createElement('button');star.className='school-portal-star';star.type='button';star.setAttribute('aria-label','Walk to the school doorway');
 star.hidden=true;viewport.append(star);
 // The button supplies keyboard access; the visible light lives in the depth buffer.
 const starCanvas=document.createElement('canvas');starCanvas.width=256;starCanvas.height=256;
 const starContext=starCanvas.getContext('2d');
 const glow=starContext.createRadialGradient(128,128,0,128,128,120);
 glow.addColorStop(0,'#ffffff');glow.addColorStop(.08,'#eefaffee');glow.addColorStop(.25,'#b8dcff66');glow.addColorStop(1,'#b8dcff00');
 starContext.fillStyle=glow;starContext.fillRect(0,0,256,256);
 starContext.fillStyle='#f0faff';starContext.beginPath();
 for(let i=0;i<32;i++){const angle=i*Math.PI/16-Math.PI/2,r=i%4===0?(i%8===0?100:70):i%2===0?13:10;starContext.lineTo(128+Math.cos(angle)*r,128+Math.sin(angle)*r)}
 starContext.closePath();starContext.fill();
 starContext.beginPath();starContext.arc(128,128,10,0,Math.PI*2);starContext.fillStyle='#fff';starContext.fill();
 const starTexture=new T.CanvasTexture(starCanvas);starTexture.colorSpace=T.SRGBColorSpace;
 const starMaterial=new T.SpriteMaterial({map:starTexture,transparent:true,depthTest:true,depthWrite:false,alphaTest:.005,toneMapped:false});
 const starLight=new T.Sprite(starMaterial);starLight.name='School doorway star';starLight.visible=false;scene.add(starLight);
 const exit=document.createElement('button');exit.className='portal-return';exit.type='button';exit.textContent='↶';exit.setAttribute('aria-label','Return to the planet');exit.title='返回星球';exit.hidden=true;viewport.append(exit);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let mode='idle',elapsed=0,approaching=false,cooldown=0,approach=null,saved=null,timeline=null,schoolSignature='';
 const door=new T.Vector3(),projected=new T.Vector3(),ray=new T.Raycaster();
 const motion={turn:0};
 const continuation=createSchoolContinuation({viewport,onExit:()=>leave()});
 const launchBones={};walker.visual.traverse(node=>{if(node.isBone)launchBones[node.name]=node});
 function updateDoor(){
  const school=state.assetsById.get('school');if(!school)return false;
  school.pivot.updateWorldMatrix(true,true);
  const signature=school.pivot.matrixWorld.elements.join(',');if(signature!==schoolSignature){approach=null;schoolSignature=signature;}
  door.set(0,-.13,.11).applyMatrix4(school.pivot.matrixWorld);
  return true;
 }
 function locateApproach(){
  const origin=walker.groundCenter,base=door.clone().sub(origin).normalize();
  const towardCamera=camera.position.clone().sub(door);towardCamera.addScaledVector(base,-towardCamera.dot(base)).normalize();
  const side=new T.Vector3().crossVectors(base,towardCamera).normalize();
  for(let ring=0;ring<12;ring++)for(const offset of [0,-1,1,-2,2]){
   const n=base.clone().addScaledVector(towardCamera,.05+ring*.025).addScaledVector(side,offset*.035).normalize();
   if(!walker.blocked(n))return n;
  }
  return null;
 }
 function walkToDoor(){
  if(mode!=='idle'||!state.ready||state.introRunning||state.editorVisible)return;
  updateDoor();approach=locateApproach();
  approaching=!!approach&&walker.plan(approach);
  if(approaching){continuation.prepare();star.classList.add('is-called');cooldown=0}
 }
 star.addEventListener('click',walkToDoor);

 function enter(){
  if(mode!=='idle'||cooldown>0)return;
  // Load the destination during the approach and retain input during the push-in.
  continuation.prepare(true);
  walker.stop();resetInteraction();approaching=false;star.hidden=true;starLight.visible=false;star.classList.remove('is-called');
  saved={position:camera.position.clone(),quaternion:camera.quaternion.clone(),target:controls.target.clone(),fov:camera.fov,rootPosition:walker.root.position.clone(),rootQuaternion:walker.root.quaternion.clone(),visualRotation:walker.visual.rotation.clone(),bones:Object.fromEntries(Object.entries(launchBones).map(([name,bone])=>[name,bone.quaternion.clone()]))};
  mode='entering';state.portalActive=true;controls.enabled=false;document.body.classList.add('portal-active');exit.hidden=false;
  motion.turn=saved.visualRotation.y;
  const localCamera=camera.position.clone().sub(saved.rootPosition).applyQuaternion(saved.rootQuaternion.clone().invert());
  const turn=Math.atan2(localCamera.x,localCamera.z)+Math.PI;
  const turnTarget=motion.turn+Math.atan2(Math.sin(turn-motion.turn),Math.cos(turn-motion.turn));
  const focus=walker.root.position.clone().addScaledVector(new T.Vector3(0,1,0).applyQuaternion(walker.root.quaternion),.45);
  const destination=focus.clone().add(camera.position.clone().sub(focus).normalize().multiplyScalar(2.6));
  timeline=gsap.timeline({defaults:{ease:'power2.inOut'},onUpdate:invalidate,onComplete:()=>{
   // Finish on the school close-up with the original relaxed standing pose.
   walker.visual.rotation.set(0,turnTarget,0,'YXZ');camera.lookAt(controls.target);
   const openingFrame=captureFrame();
   mode='arrived';continuation.begin({openingFrame});invalidate();
  }});
  timeline.addLabel('approach',0).to(camera.position,{x:destination.x,y:destination.y,z:destination.z,duration:reduced.matches?.4:2.1},'approach');
  timeline.to(controls.target,{x:focus.x,y:focus.y,z:focus.z,duration:reduced.matches?.4:2.1},'approach');
  timeline.addLabel('pose',reduced.matches?.15:.65);
  if(reduced.matches)timeline.to(motion,{turn:turnTarget,duration:.25},'pose');
  else{
   timeline.to(motion,{turn:turnTarget-.65,duration:.45},'pose');
   timeline.to(motion,{turn:turnTarget,duration:.75},'pose+=0.45');
  }

 }
 function leave(){
  if(mode==='idle')return;
  continuation.reset();
  timeline?.kill();mode='idle';state.portalActive=false;controls.enabled=true;
  camera.position.copy(saved.position);camera.quaternion.copy(saved.quaternion);camera.fov=saved.fov;camera.updateProjectionMatrix();controls.target.copy(saved.target);
  walker.root.position.copy(saved.rootPosition);walker.root.quaternion.copy(saved.rootQuaternion);walker.root.updateMatrix();walker.stop();
  walker.visual.rotation.copy(saved.visualRotation);
  for(const [name,quaternion] of Object.entries(saved.bones))launchBones[name].quaternion.copy(quaternion);
  document.body.classList.remove('portal-active');exit.hidden=true;cooldown=4;approach=null;invalidate();
 }
 exit.addEventListener('click',leave);
 document.addEventListener('keydown',event=>{if(state.portalActive&&['Escape','p','P'].includes(event.key)){event.preventDefault();event.stopImmediatePropagation();leave()}},true);
 function tick(dt){
  cooldown=Math.max(0,cooldown-dt);elapsed+=dt;
  if(mode==='entering'){
   walker.visual.rotation.set(0,motion.turn,0,'YXZ');camera.lookAt(controls.target);return true;
  }
  if(mode==='arrived')return false;
  const enabled=state.ready&&!state.introRunning&&!state.editorVisible&&walker.motionState.ready;
  const wasVisible=starLight.visible;star.hidden=true;starLight.visible=false;if(!enabled||!updateDoor())return wasVisible;
  projected.copy(door).project(camera);
  if(projected.z>=-1&&projected.z<=1&&Math.abs(projected.x)<1&&Math.abs(projected.y)<1){
   ray.set(camera.position,door.clone().sub(camera.position).normalize());
   const earth=state.assetsById.get('earth');const hits=ray.intersectObject(earth.content,true);
   if(!hits.length||hits[0].distance>=camera.position.distanceTo(door)-.1){
    starLight.visible=true;starLight.position.copy(door);
    // Mount the light just outside the doorway surface, rather than inside its mesh.
    const facade=ray.intersectObject(state.assetsById.get('school').content,true)[0];
    if(facade&&facade.distance<camera.position.distanceTo(door))starLight.position.copy(facade.point);
    // The saved doorway touches the globe; keep its light just above that surface.
    starLight.position.addScaledVector(ray.ray.direction,-.54);
    const size=2*camera.position.distanceTo(door)*Math.tan(T.MathUtils.degToRad(camera.fov/2))*68/canvas.clientHeight;
    starLight.scale.setScalar(size*(reduced.matches?1:.85+.15*Math.sin(elapsed*Math.PI*2/2.3)));
    starMaterial.rotation=reduced.matches?0:elapsed*Math.PI*2/9;
    walker.root.updateWorldMatrix(true,true);
    const nearCharacter=ray.ray.distanceSqToPoint(walker.root.position)<.85*.85;
    if(nearCharacter)walker.visual.traverse(mesh=>{
     if(mesh.isSkinnedMesh){mesh.skeleton.update();mesh.computeBoundingSphere();if(mesh.boundingBox)mesh.computeBoundingBox()}
    });
    const blockers=nearCharacter?ray.intersectObject(walker.visual,true):[];
    const covered=blockers.some(hit=>hit.distance<camera.position.distanceTo(starLight.position));
    star.hidden=covered;star.style.left=`${(projected.x+1)*canvas.clientWidth/2}px`;star.style.top=`${(1-projected.y)*canvas.clientHeight/2}px`;
   }
  }
  if(!approach)approach=locateApproach();
  if(approach&&cooldown===0){
   const w=walker.motionState,n=new T.Vector3(...w.normal),distance=n.angleTo(approach)*walker.root.position.distanceTo(walker.groundCenter);
   if(distance<.19&&(approaching||w.speed>.02))enter();
   else if(approaching&&!w.route.length&&distance>.2){approaching=false;star.classList.remove('is-called')}
  }
  return starLight.visible||wasVisible;
 }
 return {tick,leave,get covered(){return mode==='arrived'},get active(){return mode!=='idle'},get renderScene(){return null},get renderCamera(){return null},get report(){return {mode,continuation:continuation.report,approaching,poseProgress:0,lift:0,pose:Object.fromEntries(Object.entries(launchBones).map(([name,bone])=>[name,bone.quaternion.toArray()])),door:door.toArray(),approach:approach?.toArray(),star:{visible:starLight.visible,occluded:starLight.visible&&star.hidden,depthTest:starMaterial.depthTest,position:starLight.position.toArray()}}}};
}
