import * as THREE from 'three';
// Depth-only projection of the same Gaussian centers and covariance as the street.
// No color is drawn: it only prevents scene assets from drawing over foreground splats.
export async function createStreetOcclusion(bridge,scene,renderer){
 const parts=await bridge.readOcclusionSplats();const meshes=[];
 const viewport=new THREE.Vector2();renderer.getDrawingBufferSize(viewport);
 for(const part of parts){
  const {data,centers,matrix}=part,n=data.numSplats;
  const rotation=new THREE.Quaternion(),scale=new THREE.Vector3(),color=new THREE.Vector4();const iter=data.createIter(null,rotation,scale,color);
  const pos=[],rot=[],sz=[],alpha=[];
  for(let i=0;i<n;i++){iter.read(i);if(color.w<.2)continue;const x=Math.exp(scale.x),y=Math.exp(scale.y),z=Math.exp(scale.z);if(!Number.isFinite(x+y+z)||Math.max(x,y,z)>6)continue;pos.push(centers[i*3],centers[i*3+1],centers[i*3+2]);rot.push(rotation.x,rotation.y,rotation.z,rotation.w);sz.push(x,y,z);alpha.push(color.w);}
  const g=new THREE.InstancedBufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([-1,-1,0,1,-1,0,1,1,0,-1,1,0],3));g.setIndex([0,1,2,0,2,3]);
  for(const [key,values,size]of [['splatCenter',pos,3],['splatRotation',rot,4],['splatScale',sz,3],['splatAlpha',alpha,1]])g.setAttribute(key,new THREE.InstancedBufferAttribute(new Float32Array(values),size));g.instanceCount=alpha.length;
  const material=new THREE.ShaderMaterial({uniforms:{viewport:{value:viewport}},depthWrite:true,depthTest:true,colorWrite:false,side:THREE.DoubleSide,vertexShader:`
   attribute vec3 splatCenter;attribute vec4 splatRotation;attribute vec3 splatScale;attribute float splatAlpha;uniform vec2 viewport;varying vec2 offset;varying vec3 conic;varying float opacity;
   vec3 rotateQ(vec3 p){return p+2.0*cross(splatRotation.xyz,cross(splatRotation.xyz,p)+splatRotation.w*p);}
   void main(){vec4 center=modelViewMatrix*vec4(splatCenter,1.0);float d=-center.z;if(d<.05){gl_Position=vec4(2.,2.,2.,1.);offset=vec2(0.);conic=vec3(1.);opacity=0.;return;}
    float fx=projectionMatrix[0][0]*viewport.x*.5,fy=projectionMatrix[1][1]*viewport.y*.5;
    mat3 viewRotation=mat3(modelViewMatrix);vec3 a=viewRotation*rotateQ(vec3(splatScale.x,0.,0.));vec3 b=viewRotation*rotateQ(vec3(0.,splatScale.y,0.));vec3 c=viewRotation*rotateQ(vec3(0.,0.,splatScale.z));
    vec3 jx=vec3(fx/d,0.,fx*center.x/(d*d));vec3 jy=vec3(0.,fy/d,fy*center.y/(d*d));vec3 dx=vec3(dot(jx,a),dot(jx,b),dot(jx,c));vec3 dy=vec3(dot(jy,a),dot(jy,b),dot(jy,c));
    float xx=dot(dx,dx)+.3,yy=dot(dy,dy)+.3,xy=dot(dx,dy),det=max(xx*yy-xy*xy,.0001);conic=vec3(yy,-xy,xx)/det;opacity=splatAlpha;offset=position.xy*min(vec2(2048.),sqrt(vec2(xx,yy))*2.8);
    vec4 clip=projectionMatrix*center;clip.xy+=offset*2.0/viewport*clip.w;gl_Position=clip;
   }`,fragmentShader:`precision highp float;varying vec2 offset;varying vec3 conic;varying float opacity;void main(){float power=-.5*(conic.x*offset.x*offset.x+2.*conic.y*offset.x*offset.y+conic.z*offset.y*offset.y);if(opacity*exp(power)<.20)discard;gl_FragColor=vec4(0.);}`});
  const mesh=new THREE.Mesh(g,material);mesh.name='Street Gaussian depth';mesh.matrix.fromArray(matrix);mesh.matrixAutoUpdate=false;mesh.frustumCulled=false;mesh.renderOrder=-10000;mesh.raycast=()=>{};scene.add(mesh);meshes.push(mesh);
 }
 return {meshes,update(){renderer.getDrawingBufferSize(viewport)},count:meshes.reduce((n,m)=>n+m.geometry.instanceCount,0)};
}
