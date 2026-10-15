import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Triangle BVH shared by ground queries and a swept capsule controller.
const v=()=>new T.Vector3();
function tree(tris,depth=0){
 const box=new T.Box3();for(const t of tris){box.expandByPoint(t.a);box.expandByPoint(t.b);box.expandByPoint(t.c)}
 if(tris.length<20||depth>22)return {box,tris};
 const size=box.getSize(v()),axis=size.x>size.y?(size.x>size.z?'x':'z'):(size.y>size.z?'y':'z');
 tris.sort((a,b)=>(a.a[axis]+a.b[axis]+a.c[axis])-(b.a[axis]+b.b[axis]+b.c[axis]));
 const mid=tris.length>>1;return {box,left:tree(tris.slice(0,mid),depth+1),right:tree(tris.slice(mid),depth+1)};
}
function meshTree(object){
 const tris=[];object.updateWorldMatrix(true,true);object.traverse(m=>{
  if(!m.isMesh)return;const p=m.geometry.attributes.position,idx=m.geometry.index,n=idx?idx.count:p.count;
  for(let i=0;i<n;i+=3){const a=[];for(let k=0;k<3;k++)a.push(v().fromBufferAttribute(p,idx?idx.getX(i+k):i+k).applyMatrix4(m.matrixWorld));tris.push(new T.Triangle(...a))}
 });return tris.length?tree(tris):null;
}
function rayHit(root,ray,best={distance:Infinity,point:null}){
 if(!root||!ray.intersectsBox(root.box))return best;
 if(root.tris){for(const t of root.tris){const p=ray.intersectTriangle(t.a,t.b,t.c,false,v());if(p){const d=p.distanceTo(ray.origin);if(d<best.distance){best.distance=d;best.point=p}}}}
 else{rayHit(root.left,ray,best);rayHit(root.right,ray,best)}return best;
}
function sphereHits(root,p,r){
 if(!root||root.box.distanceToPoint(p)>r)return false;
 if(root.tris)return root.tris.some(t=>t.closestPointToPoint(p,v()).distanceToSquared(p)<r*r);
 return sphereHits(root.left,p,r)||sphereHits(root.right,p,r);
}
function arc(a,b,t){const angle=a.angleTo(b);if(angle<1e-7)return a.clone();return a.clone().multiplyScalar(Math.sin((1-t)*angle)).addScaledVector(b,Math.sin(t*angle)).normalize()}

export async function createPlanetWalker({scene,camera,canvas,state,controls,toast,invalidate}){
 const root=new T.Group();root.name='球面行走人物';root.visible=false;root.matrixAutoUpdate=false;scene.add(root);
 let introControlled=false;
 const visual=new T.Group();root.add(visual);
 const gltf=await new GLTFLoader().loadAsync('./assets/space-editor/models-optimized/schoolgirl-rigged.glb?v=20260922-arm-fix');
 const bounds=new T.Box3().setFromObject(gltf.scene),modelHeight=bounds.getSize(v()).y;
 gltf.scene.scale.setScalar(.70/modelHeight);gltf.scene.position.y=-bounds.min.y*(.70/modelHeight);visual.add(gltf.scene);
 gltf.scene.traverse(m=>{if(m.isMesh){m.frustumCulled=false;m.material.roughness=.85}});
 let collisionBuilds=0,poseUpdates=0;
 let boneCount=0;gltf.scene.traverse(node=>{if(node.isBone)boneCount++});
 const mixer=new T.AnimationMixer(gltf.scene),walk=mixer.clipAction(gltf.animations[0]);walk.play();walk.setEffectiveWeight(0);
 const shadow=new T.Mesh(new T.CircleGeometry(.13,32),new T.MeshBasicMaterial({color:0x12333e,transparent:true,opacity:.26,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.009;root.add(shadow);
 const marker=new T.Mesh(new T.RingGeometry(.075,.10,40),new T.MeshBasicMaterial({color:0xffe7a1,side:T.DoubleSide,depthWrite:false}));scene.add(marker);marker.visible=false;
 const line=new T.Line(new T.BufferGeometry(),new T.LineBasicMaterial({color:0xffe7a1,transparent:true,opacity:.65,depthWrite:false}));scene.add(line);line.visible=false;
 const label=document.createElement('span');label.className='walk-status sr-only';label.setAttribute('role','status');label.setAttribute('aria-live','polite');canvas.parentElement.append(label);
 let lastMessage='';const status=s=>{if(s!==lastMessage){label.textContent=s;lastMessage=s}};
 let center=v(),ground,obstacles=[],signature='',normal=new T.Vector3(.05,.63,.77).normalize(),forward=new T.Vector3(0,0,1),route=[],target=null,speed=0,phase=0,ready=false,graph=[],lastEditor=false,stuck=0,collisions=0;
 const radius=.15,height=.70,maxSpeed=.60;
 const bubble=document.createElement('div');bubble.className='character-bubble';bubble.lang='en';bubble.hidden=true;document.querySelector('#viewport').append(bubble);
 const thoughts=['Bored...','Feeling happy!','What should I eat today?','Time for a snack?','Such a lovely day!','Hmm... what now?','I could use a nap.','Let’s explore!'];
 let thoughtIndex=-1,thoughtVisible=false,thoughtTimer=3+Math.random()*3;
 const headPoint=v(),screenHead=v(),cameraPoint=v();
 function resetThought(){bubble.hidden=true;thoughtVisible=false;thoughtTimer=3+Math.random()*3}
 function updateThought(dt){
  if(route.length||speed>.002){resetThought();return}
  thoughtTimer-=dt;
  if(thoughtTimer<=0){
   thoughtVisible=!thoughtVisible;
   if(thoughtVisible){const next=Math.floor(Math.random()*(thoughts.length-(thoughtIndex<0?0:1)));thoughtIndex=thoughtIndex>=0&&next>=thoughtIndex?next+1:next;bubble.textContent=thoughts[thoughtIndex];thoughtTimer=4+Math.random()*2}
   else thoughtTimer=4+Math.random()*5;
  }
  bubble.hidden=true;if(!thoughtVisible)return;
  root.updateWorldMatrix(true,false);headPoint.set(0,height,0).applyMatrix4(root.matrixWorld);screenHead.copy(headPoint).project(camera);
  if(screenHead.z<-1||screenHead.z>1||Math.abs(screenHead.x)>1||Math.abs(screenHead.y)>1)return;
  camera.getWorldPosition(cameraPoint);
  const distance=cameraPoint.distanceTo(headPoint),hit=rayHit(ground,new T.Ray(cameraPoint,headPoint.clone().sub(cameraPoint).normalize()));
  if(hit.distance<distance-.05)return;
  const rect=canvas.getBoundingClientRect(),parent=bubble.parentElement.getBoundingClientRect();
  const x=rect.left-parent.left+(screenHead.x+1)*rect.width/2,y=rect.top-parent.top+(1-screenHead.y)*rect.height/2;
  bubble.hidden=false;
  const width=bubble.offsetWidth,heightPx=bubble.offsetHeight,leftSide=x+16+width>parent.width-8;
  bubble.classList.toggle('is-left',leftSide);
  bubble.style.left=`${Math.max(8,Math.min(parent.width-width-8,leftSide?x-width-16:x+16))}px`;
  bubble.style.top=`${Math.max(8,Math.min(parent.height-heightPx-8,y-heightPx))}px`;
 }
 const surface=n=>rayHit(ground,new T.Ray(center.clone().addScaledVector(n,30),n.clone().negate())).point;
 function blocked(n){const p=surface(n);if(!p)return true;for(let h=radius;h<height;h+=radius*.65){const q=p.clone().addScaledVector(n,Math.min(h,height-radius));if(obstacles.some(o=>sphereHits(o.tree,q.clone().applyMatrix4(o.toBaked),radius*o.radiusScale)))return true}return false}
 function syncObstacles(){
  let changed=false;
  for(const o of obstacles){o.asset.pivot.updateWorldMatrix(true,false);const matrix=o.asset.pivot.matrixWorld;if(!matrix.equals(o.previous)){o.previous.copy(matrix);o.toBaked.copy(o.bind).multiply(new T.Matrix4().copy(matrix).invert());o.radiusScale=o.toBaked.getMaxScaleOnAxis();changed=true}}
  if(changed)graph=[];
  return changed;
 }
 function clear(a,b){const steps=Math.max(1,Math.ceil(a.angleTo(b)*3.5/.045));for(let i=1;i<=steps;i++)if(blocked(arc(a,b,i/steps)))return false;return true}
 function refresh(){
  const earthAsset=state.assetsById.get('earth');earthAsset.pivot.updateWorldMatrix(true,true);
  const next=earthAsset.pivot.matrixWorld.elements.join(',');if(next===signature){syncObstacles();return}
  collisionBuilds++;signature=next;const earth=state.assetsById.get('earth');ground=meshTree(earth.content);center=ground.box.getCenter(v());
  obstacles=state.assets.filter(a=>a.id!=='earth').map(asset=>({asset,tree:meshTree(asset.content),bind:asset.pivot.matrixWorld.clone(),previous:asset.pivot.matrixWorld.clone(),toBaked:new T.Matrix4(),radiusScale:1})).filter(o=>o.tree);graph=[];route=[];speed=0;
  if(blocked(normal)){
   let found=false;for(let i=0;i<500;i++){const n=new T.Vector3(Math.cos(i*2.4)*Math.sqrt(1-(1-2*i/500)**2),1-2*i/500,Math.sin(i*2.4)*Math.sqrt(1-(1-2*i/500)**2));if(!blocked(n)){normal=n;found=true;break}}
   if(!found){ready=false;status('地球表面没有足够的站立空间');return}
  }
  ready=true;pose(0);
 }
 function buildGraph(){
  if(graph.length)return;const geo=new T.IcosahedronGeometry(1,8),p=geo.attributes.position,map=new Map(),ids=[];
  for(let i=0;i<p.count;i++){const n=v().fromBufferAttribute(p,i).normalize(),key=n.toArray().map(x=>x.toFixed(5)).join(',');let id=map.get(key);if(id===undefined){id=graph.length;map.set(key,id);graph.push({n,edges:new Set(),blocked:blocked(n)})}ids.push(id)}
  for(let i=0;i<ids.length;i+=3)for(let k=0;k<3;k++){const a=ids[i+k],b=ids[i+(k+1)%3];graph[a].edges.add(b);graph[b].edges.add(a)}geo.dispose();
 }
 function plan(n){
  if(!state.ready||state.introRunning||state.editorVisible||!ready)return false;
  syncObstacles();
  if(blocked(n)){status('这里有障碍物，请点旁边的空地');return false}
  let path;
  if(clear(normal,n))path=[n.clone()];
  else{
   buildGraph();const nearest=q=>graph.map((g,i)=>({i,d:g.n.angleTo(q)})).filter(x=>!graph[x.i].blocked).sort((a,b)=>a.d-b.d).slice(0,18).find(x=>clear(q,graph[x.i].n))?.i;
   const start=nearest(normal),end=nearest(n);if(start===undefined||end===undefined){status('这块地面暂时无法到达');return false}
   const open=new Set([start]),dist=new Map([[start,0]]),came=new Map(),closed=new Set();let found=false;
   while(open.size){let id,best=Infinity;for(const i of open){const score=dist.get(i)+graph[i].n.angleTo(graph[end].n);if(score<best){best=score;id=i}}if(id===end){found=true;break}open.delete(id);closed.add(id);
    for(const adj of graph[id].edges){if(closed.has(adj)||graph[adj].blocked)continue;const d=dist.get(id)+graph[id].n.angleTo(graph[adj].n);if(d>=(dist.get(adj)??Infinity)||!clear(graph[id].n,graph[adj].n))continue;dist.set(adj,d);came.set(adj,id);open.add(adj)}
   }
   if(!found){status('障碍物挡住了路线，请换一处空地');return false}path=[n.clone()];for(let i=end;i!==undefined;i=came.get(i))path.unshift(graph[i].n.clone());
   const smooth=[];let from=normal;while(path.length){let i=path.length-1;while(i>0&&!clear(from,path[i]))i--;from=path[i];smooth.push(from);path=path.slice(i+1)}path=smooth;
  }
  route=path;target=n.clone();stuck=0;marker.visible=true;marker.position.copy(surface(n)).addScaledVector(n,.025);marker.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),n);
  const pts=[];let a=normal;for(const b of route){const steps=Math.ceil(a.angleTo(b)*70);for(let i=0;i<=steps;i++){const u=arc(a,b,i/Math.max(steps,1));pts.push(surface(u).addScaledVector(u,.018))}a=b}
  line.geometry.dispose();line.geometry=new T.BufferGeometry().setFromPoints(pts);line.visible=true;status('正在走向你点击的位置');invalidate();return true;
 }
 function pose(dt){
  poseUpdates++;
  const p=surface(normal);if(!p)return;
  forward.addScaledVector(normal,-forward.dot(normal));if(forward.lengthSq()<.001)forward.set(1,0,0).addScaledVector(normal,-normal.x);forward.normalize();
  const right=v().crossVectors(normal,forward).normalize();root.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(right,normal,forward));root.position.copy(p).addScaledVector(normal,.008);
  const blend=T.MathUtils.clamp(speed/maxSpeed,0,1);
  walk.setEffectiveWeight(blend);walk.timeScale=Math.max(.1,speed/.32);mixer.update(dt);
  phase=walk.time*Math.PI*2;visual.position.y=Math.abs(Math.sin(phase))*blend*.009;visual.rotation.z=Math.sin(phase)*blend*.025;
  root.updateMatrix();
 }
 function stop(){route=[];target=null;speed=0;down=null;marker.visible=false;line.visible=false;if(ready)pose(0);invalidate()}
 function prepareIntro(){
  refresh();if(!ready)return null;buildGraph();
  stop();introControlled=true;root.matrixAutoUpdate=true;root.updateMatrix();root.updateWorldMatrix(true,true);
  return {id:'walking-girl',name:'小女孩',model:'character',pivot:root,content:visual,introEase:'power2.out'};
 }
 function finishIntro(){introControlled=false;root.matrixAutoUpdate=false;refresh();root.visible=ready;invalidate()}
 function tick(dt){
  if(introControlled){resetThought();marker.visible=false;line.visible=false;return false}
  const enabled=state.ready&&!state.introRunning&&!state.editorVisible;root.visible=enabled;marker.visible=enabled&&!!target;line.visible=enabled&&route.length>0;
  if(!enabled){resetThought();if(state.editorVisible){lastEditor=true;route=[];target=null;speed=0;signature=''}return false}
  if(!ready||lastEditor){refresh();lastEditor=false}if(!ready){resetThought();return false}
  const obstaclesMoved=syncObstacles();
  if(obstaclesMoved&&blocked(normal)){
   const tangent=v().crossVectors(normal,new T.Vector3(0,1,0));if(tangent.lengthSq()<.001)tangent.set(1,0,0);tangent.normalize();const side=v().crossVectors(normal,tangent);let free=null;
   for(let ring=1;ring<=8&&!free;ring++)for(let i=0;i<16;i++){const a=i*Math.PI/8,n=normal.clone().addScaledVector(tangent,Math.cos(a)*ring*.025).addScaledVector(side,Math.sin(a)*ring*.025).normalize();if(!blocked(n)){free=n;break}}
   if(free){normal.copy(free);collisions++;stop();status('模型碰到人物，已让开并停下')}
  }
  if(!obstaclesMoved&&!route.length&&speed===0){updateThought(dt);return false;}
  let remain=dt;while(remain>0){const step=Math.min(remain,1/90);remain-=step;
   if(route.length){const goal=route[0],r=root.position.distanceTo(center),distance=normal.angleTo(goal)*r;
    let remaining=distance;for(let i=1;i<route.length;i++)remaining+=route[i-1].angleTo(route[i])*r;
    const wanted=Math.min(maxSpeed,Math.sqrt(2*1.6*remaining));speed=T.MathUtils.damp(speed,wanted,6,step);
    const advance=Math.min(distance,speed*step),next=arc(normal,goal,distance>.00001?advance/distance:1);
    if(!blocked(next)){
     const direction=next.clone().sub(normal).addScaledVector(normal,-next.clone().sub(normal).dot(normal));if(direction.lengthSq()>1e-12)forward.lerp(direction.normalize(),1-Math.exp(-step*10)).normalize();normal=next;stuck=0;
     if(distance<.009){normal.copy(goal);route.shift();if(!route.length){target=null;status('到了，再点一处地面继续走')}}
    }else{speed=0;collisions++;stuck+=step;if(stuck>.15){route=[];target=null;status('前方被挡住了，请重新选择位置')}}
   }else speed=T.MathUtils.damp(speed,0,14,step);
  }
  if(!route.length&&speed<.0001)speed=0;
  pose(dt);updateThought(dt);return route.length>0||speed>.002;
 }
 let down=null;
 canvas.addEventListener('pointerdown',e=>{if(!state.editorVisible&&state.ready&&!state.introRunning&&e.button===0)down={x:e.clientX,y:e.clientY,id:e.pointerId}},true);
 canvas.addEventListener('pointercancel',()=>down=null,true);
 canvas.addEventListener('pointerup',e=>{
  if(!down||e.pointerId!==down.id)return;const d=Math.hypot(e.clientX-down.x,e.clientY-down.y);down=null;if(d>5||state.editorVisible)return;
  refresh();const rect=canvas.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);const hit=rayHit(ground,ray.ray).point;
  if(hit)plan(hit.sub(center).normalize());else status('请点击地球表面');
 },true);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!state.editorVisible){stop();status('已停下，点击地面继续')}});
 return {root,visual,get motionState(){return {ready:ready&&state.ready,normal:normal.toArray(),speed,route}},get groundCenter(){return center.clone()},tick,refresh,plan,blocked,stop,prepareIntro,finishIntro,get report(){return {collisionBuilds,poseUpdates,ready:ready&&state.ready,introControlled,visible:root.visible,position:root.position.toArray(),normal:normal.toArray(),speed,route:route.map(n=>n.toArray()),target:target?.toArray()||null,collisions,bones:boneCount,groundError:ready?root.position.distanceTo(surface(normal))-.008:null,blocked:ready?blocked(normal):null}},screenPoint:n=>{const p=surface(new T.Vector3(...n).normalize()).project(camera),r=canvas.getBoundingClientRect();return {x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2}}};
}
