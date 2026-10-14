import * as T from 'three';

export const FLYING_POSE={LeftUpperArm:[0,0,0],LeftForeArm:[0,0,0],LeftHand:[0,0,0],RightUpperArm:[-.12,0,-2.15],RightForeArm:[-.08,0,-.12],LeftUpLeg:[-.08,0,.06],RightUpLeg:[.12,0,-.08],LeftLeg:[.1,0,0],RightLeg:[.28,0,0],Head:[-.12,0,0]};

const prepared = new WeakMap();
const bodyGeometries = new WeakMap();

// The scan fuses the left hand to the shirt and shorts. Cut a clean opening
// in rest space, keep the torso weights fixed, and articulate a closed arm.
function bodyWithoutLeftArm(source) {
  if (bodyGeometries.has(source)) return bodyGeometries.get(source);
  const attrs = source.attributes, index = source.index;
  const read = i => {
    const weights=new Map();for(let k=0;k<4;k++){const joint=attrs.skinIndex.getComponent(i,k);weights.set(joint,(weights.get(joint)||0)+attrs.skinWeight.getComponent(i,k))}
    return {
    p: new T.Vector3().fromBufferAttribute(attrs.position, i),
    n: new T.Vector3().fromBufferAttribute(attrs.normal, i),
    uv: new T.Vector2().fromBufferAttribute(attrs.uv, i),
    weights
  }};
  const mix = (a,b,t) => {
    const weights = new Map();
    for (const [joint,w] of a.weights) weights.set(joint,w*(1-t));
    for (const [joint,w] of b.weights) weights.set(joint,(weights.get(joint)||0)+w*t);
    return {p:a.p.clone().lerp(b.p,t),n:a.n.clone().lerp(b.n,t),uv:a.uv.clone().lerp(b.uv,t),weights};
  };
  const clip = (polygon, distance, inside) => {
    const result=[];
    for(let i=0;i<polygon.length;i++) {
      const a=polygon[i],b=polygon[(i+1)%polygon.length],da=distance(a.p),db=distance(b.p);
      const inA=inside?da>=0:da<=0,inB=inside?db>=0:db<=0;
      if(inA)result.push(a);
      if(inA!==inB)result.push(mix(a,b,da/(da-db)));
    }
    return result;
  };
  const planes=[p=>p.x-.108,p=>p.y-.262,p=>.527-p.y,p=>p.z+.063,p=>.073-p.z];
  const sourceTriangles=[];
  const positions=[],normals=[],uvs=[],joints=[],weights=[];
  const emit = vertex => {
    positions.push(...vertex.p);normals.push(...vertex.n.normalize());uvs.push(...vertex.uv);
    const influence = new Map(vertex.weights);
    // Any surviving shirt/backpack vertex must stay on the body, not the arm.
    for(const joint of [5,6,7]) {
      const w=influence.get(joint)||0;influence.delete(joint);
      const torso=vertex.p.y<.32?0:vertex.p.y>.49?2:1;
      influence.set(torso,(influence.get(torso)||0)+w);
    }
    const top=[...influence].filter(([,w])=>w>0).sort((a,b)=>b[1]-a[1]).slice(0,4);
    const sum=top.reduce((n,[,w])=>n+w,0)||1;
    for(let k=0;k<4;k++){joints.push(top[k]?.[0]||0);weights.push((top[k]?.[1]||0)/sum)}
  };
  const emitPolygon = poly => {for(let i=1;i+1<poly.length;i++){emit(poly[0]);emit(poly[i]);emit(poly[i+1])}};
  for(let i=0;i<(index?.count||attrs.position.count);i+=3) {
    let polygon=[0,1,2].map(k=>read(index?index.getX(i+k):i+k));
    sourceTriangles.push(polygon);
    if(planes.some(plane=>polygon.every(v=>plane(v.p)<0))){emitPolygon(polygon);continue}
    for(const plane of planes){emitPolygon(clip(polygon,plane,false));polygon=clip(polygon,plane,true);if(polygon.length<3)break}
  }
  const bodyCount=positions.length/3,capShirt=[],capShorts=[];
  // Close the actual cut contours; a bounding-box patch would protrude from
  // the shirt. UV seams are welded here only for tracing the closed outlines.
  for(let planeIndex=0;planeIndex<planes.length;planeIndex++){
    const distance=planes[planeIndex],points=new Map(),edges=new Map();
    const key=p=>[p.x,p.y,p.z].map(v=>Math.round(v*1e5)).join(',');
    for(const triangle of sourceTriangles){
      const crossings=[];
      for(let i=0;i<3;i++){const a=triangle[i],b=triangle[(i+1)%3],da=distance(a.p),db=distance(b.p);if((da>=0)!==(db>=0))crossings.push(mix(a,b,da/(da-db)))}
      if(crossings.length!==2)continue;
      const [a,b]=crossings.map(v=>{const k=key(v.p);points.set(k,v);return k});if(a===b)continue;
      if(!edges.has(a))edges.set(a,new Set());if(!edges.has(b))edges.set(b,new Set());edges.get(a).add(b);edges.get(b).add(a);
    }
    const normal=[new T.Vector3(1,0,0),new T.Vector3(0,1,0),new T.Vector3(0,-1,0),new T.Vector3(0,0,1),new T.Vector3(0,0,-1)][planeIndex];
    const project=p=>planeIndex===0?new T.Vector2(p.y,p.z):planeIndex<3?new T.Vector2(p.x,p.z):new T.Vector2(p.x,p.y);
    for(const [start,neighbors]of edges){
      while(neighbors.size){
        let current=start;const loop=[];let closed=false;
        for(let n=0;n<points.size;n++){
          loop.push(points.get(current));const next=edges.get(current)?.values().next().value;if(!next)break;
          edges.get(current).delete(next);edges.get(next).delete(current);current=next;if(current===start){closed=true;break}
        }
        if(!closed||loop.length<3)continue;
        for(const ids of T.ShapeUtils.triangulateShape(loop.map(v=>project(v.p)),[])){
          let polygon=ids.map(i=>({...loop[i],n:loop[i].n.clone()}));
          for(let k=0;k<planes.length;k++)if(k!==planeIndex)polygon=clip(polygon,planes[k],true);
          if(polygon.length<3)continue;
          const cross=new T.Vector3().crossVectors(polygon[1].p.clone().sub(polygon[0].p),polygon[2].p.clone().sub(polygon[0].p));
          if(cross.dot(normal)<0)polygon.reverse();
          capShirt.push(clip(polygon,p=>p.y-.318,true));capShorts.push(clip(polygon,p=>p.y-.318,false));
        }
      }
    }
  }
  for(const polygon of capShirt)emitPolygon(polygon);const shirtCount=positions.length/3-bodyCount;
  for(const polygon of capShorts)emitPolygon(polygon);const shortsCount=positions.length/3-bodyCount-shirtCount;
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));
  geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
  geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(joints,4));
  geometry.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));
  geometry.addGroup(0,bodyCount,0);geometry.addGroup(bodyCount,shirtCount,1);geometry.addGroup(bodyCount+shirtCount,shortsCount,2);
  bodyGeometries.set(source,geometry);
  return geometry;
}

export function useFlightGeometry(model, enabled) {
  let nativeRig=false;model.traverse(node=>{if(node.userData.nativeCharacterRig)nativeRig=true});
  if(nativeRig)return;
  let entry=prepared.get(model);
  if(!entry&&!enabled)return;
  if(!entry) {
    const bones={},meshes=[];model.traverse(node=>{if(node.isBone)bones[node.name]=node;if(node.isSkinnedMesh)meshes.push(node)});
    const toon=meshes[0].material.isMeshToonMaterial;
    const material=color=>toon?new T.MeshToonMaterial({color}):new T.MeshStandardMaterial({color,roughness:.85});
    const shirt=material(0xffffff),trim=material(0x16938f),skin=material(0xeec1a5);
    const parts=[];
    const ellipsoid=(bone,center,scale,mat)=>{
      const mesh=new T.Mesh(new T.SphereGeometry(1,24,16),mat);mesh.position.set(...center);mesh.scale.set(...scale);bones[bone].add(mesh);parts.push(mesh);return mesh;
    };
    const tube=(bone,a,b,rA,rB,mat)=>{
      const start=new T.Vector3(...a),end=new T.Vector3(...b),axis=end.clone().sub(start);
      const mesh=new T.Mesh(new T.CylinderGeometry(rB,rA,axis.length(),24,1,false),mat);
      mesh.position.copy(start).add(end).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),axis.normalize());bones[bone].add(mesh);parts.push(mesh);
    };
    ellipsoid('LeftUpperArm',[0,-.014,0],[.045,.041,.043],shirt);
    tube('LeftUpperArm',[0,-.014,0],[.02,-.072,0],.043,.034,shirt);
    tube('LeftUpperArm',[.018,-.066,0],[.021,-.075,0],.035,.035,trim);
    tube('LeftUpperArm',[.02,-.071,0],[.04,-.14,0],.026,.023,skin);
    ellipsoid('LeftForeArm',[0,0,0],[.024,.025,.024],skin);
    tube('LeftForeArm',[0,0,0],[.015,-.10,0],.023,.021,skin);
    ellipsoid('LeftHand',[0,-.015,0],[.029,.036,.027],skin);
    ellipsoid('LeftHand',[-.023,-.011,.013],[.014,.023,.016],skin);
    entry={meshes:meshes.map(mesh=>({mesh,original:mesh.geometry,originalMaterial:mesh.material,flightMaterial:[mesh.material,shirt,trim],flight:bodyWithoutLeftArm(mesh.geometry)})),parts};
    prepared.set(model,entry);
  }
  for(const {mesh,original,flight,originalMaterial,flightMaterial} of entry.meshes){mesh.geometry=enabled?flight:original;mesh.material=enabled?flightMaterial:originalMaterial}
  for(const part of entry.parts)part.visible=enabled;
}
