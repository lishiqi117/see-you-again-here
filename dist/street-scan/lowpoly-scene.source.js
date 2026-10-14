import * as THREE from 'three';

// A deliberately simplified mesh reconstruction inspired by the supplied alley.
// It is separate from the original scan, which remains in scene.html / street.sog.
const canvas = document.querySelector('#world');
const renderer = new THREE.WebGLRenderer({canvas, antialias:false, alpha:false});
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.BasicShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#99bfc9');
scene.fog = new THREE.Fog('#a3b8b3',23,55);
const camera = new THREE.PerspectiveCamera(60,1,.08,95);
camera.rotation.order = 'YXZ';
const root = new THREE.Group();
root.position.set(9,0,8);
root.rotation.y = Math.atan(.5);
scene.add(root);
scene.add(new THREE.AmbientLight('#bec7d8',.82));
const sun = new THREE.DirectionalLight('#ffe3a5',2.15);
sun.position.set(-12,22,9);
sun.target.position.set(0,0,-9);
sun.castShadow = true;
sun.shadow.mapSize.set(512,512);
Object.assign(sun.shadow.camera,{left:-26,right:26,top:26,bottom:-26,near:1,far:70});
sun.shadow.bias = -.0012;
scene.add(sun,sun.target);

let seed=94832;
const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
function texture(kind,base) {
  const c=document.createElement('canvas');c.width=c.height=64;
  const ctx=c.getContext('2d');ctx.fillStyle=base;ctx.fillRect(0,0,64,64);
  for(let n=0;n<430;n++) {ctx.fillStyle=random()>.5?'rgba(238,224,191,.12)':'rgba(31,30,29,.10)';ctx.fillRect(Math.floor(random()*64),Math.floor(random()*64),1+Math.floor(random()*5),1+Math.floor(random()*4));}
  if(kind==='brick')for(let y=0;y<64;y+=12){ctx.fillStyle='#615b4d';ctx.fillRect(0,y,64,1);for(let x=(y%24?9:0);x<64;x+=21)ctx.fillRect(x,y,1,12);}
  if(kind==='wood')for(let x=0;x<64;x+=9){ctx.fillStyle='#332d2680';ctx.fillRect(x,0,1,64);}
  if(kind==='tile')for(let y=0;y<64;y+=8){ctx.fillStyle='#171d2570';ctx.fillRect(0,y,64,2);for(let x=0;x<64;x+=13)ctx.fillRect(x,y,1,8);}
  if(kind==='cloth')for(let y=0;y<64;y+=3){ctx.fillStyle='#ffffff0a';ctx.fillRect(0,y,64,1);}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.NearestFilter;t.minFilter=THREE.NearestMipmapNearestFilter;return t;
}
const uniforms={};let regionCode='float recorded(vec3 p){return 0.0;}';
const materials=[];
function material(color,kind,repeat=[1,1]){
  const map=kind?texture(kind,color):null;
  if(map)map.repeat.set(...repeat);
  const m=new THREE.MeshLambertMaterial({color:map?'#ffffff':color,map,flatShading:true});
  m.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,uniforms);
    shader.vertexShader='varying vec3 vRecordedPosition;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvRecordedPosition=(modelMatrix*vec4(transformed,1.0)).xyz;');
    shader.fragmentShader='varying vec3 vRecordedPosition;\n'+regionCode+'\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <dithering_fragment>','#include <dithering_fragment>\ngl_FragColor.rgb=mix(gl_FragColor.rgb,vec3(0.40,0.86,0.81),recorded(vRecordedPosition));');
  };
  m.customProgramCacheKey=()=>regionCode;
  materials.push(m);return m;
}
const plaster=['#c4b58e','#ccbca4','#b0b4a5','#c5bba6','#c0aa88'].map(c=>material(c,'plaster',[2,3]));
const brick=material('#8b8371','brick',[3,2]),wood=material('#4b5041','wood',[1,2]);
const red=material('#9c4536','wood'),roof=material('#555d59','tile',[4,2]);
const trim=material('#777969','plaster'),glass=material('#455e68'),frame=material('#b7b59c');
const road=material('#817e6c','plaster',[8,30]),curb=material('#b3b09e','brick',[2,6]);
const rust=material('#785240'),blue=material('#507f86','wood'),leaf=material('#527546'),leafLight=material('#72864c');
const pickables=[];
function mesh(geometry,mat,x,y,z,parent=root){const o=new THREE.Mesh(geometry,mat);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);pickables.push(o);return o;}
function box(w,h,d,mat,x,y,z,parent=root){return mesh(new THREE.BoxGeometry(w,h,d),mat,x,y,z,parent);}
function cylinder(r1,r2,h,mat,x,y,z,parent=root,sides=6){return mesh(new THREE.CylinderGeometry(r1,r2,h,sides),mat,x,y,z,parent);}
function beam(a,b,r,mat,parent=root){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b);const o=cylinder(r,r,start.distanceTo(end),mat,0,0,0,parent,5);o.position.copy(start).add(end).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),end.sub(start).normalize());return o;}
box(7,.22,48,road,0,.44,-17);
box(.38,.27,48,curb,-3.35,.63,-17);box(.38,.27,48,curb,3.35,.63,-17);
for(let i=0;i<11;i++){
  const z=2-i*4.1;
  for(const side of [-1,1]){
    const height=5.2+(i%3)*1.3+(side===1?.5:0),x=side*5.4,wall=side*3.53;
    box(3.6,height,4.02,plaster[(i+(side===1?2:0))%5],x,.55+height/2,z);
    box(.12,1.2,4.02,brick,wall,1.1,z);
    box(3.95,.18,4.3,trim,x,height+.68,z);
    const roofSlab=box(4.12,.16,4.5,roof,x,height+.96,z);roofSlab.rotation.z=side*.11;
    for(const wz of [-1.08,1.05])for(let level=0;level<Math.floor(height/2.7);level++){
      const y=3.55+level*2.4;
      if(y>height-.2)continue;
      box(.16,1.48,1.11,frame,wall-side*.055,y,z+wz);
      box(.18,1.24,.90,glass,wall-side*.14,y,z+wz);
      box(.20,.075,.94,frame,wall-side*.17,y,z+wz);
      box(.20,1.28,.07,frame,wall-side*.17,y,z+wz);
      box(.45,.13,1.35,trim,wall-side*.15,y-.79,z+wz);
    }
    const doorMat=i===0&&side===-1?red:(i%3===0?blue:wood);
    box(.13,2.35,1.35,doorMat,wall-side*.11,1.72,z-.1);
    box(.16,2.55,.16,i===0&&side===-1?red:trim,wall-side*.18,1.82,z-.83);
    box(.16,2.55,.16,i===0&&side===-1?red:trim,wall-side*.18,1.82,z+.65);
    box(.2,.18,1.7,doorMat,wall-side*.19,3.05,z-.1);
    if(i%2===0){const canopy=box(1.35,.12,3.8,i%4===0?blue:roof,wall-side*.45,3.2,z);canopy.rotation.z=-side*.16;beam([wall-side*1.05,.6,z-1.7],[wall-side*1.05,3.1,z-1.7],.035,rust);}
    if(i%3===1){box(.42,.62,.85,trim,wall-side*.28,3.0,z+1.12);for(let k=0;k<4;k++)box(.015,.03,.68,glass,wall-side*.50,2.8+k*.1,z+1.12);}
  }
}
// Gateway, pipes, crossed cables and stalls retain the original narrow-alley rhythm.
box(.45,4.6,.45,red,-3.12,2.65,-19);box(.45,4.6,.45,red,3.12,2.65,-19);
box(6.65,.60,.5,red,0,4.55,-19);box(7.1,.16,.9,roof,0,4.92,-19);
for(let i=0;i<6;i++){const z=-i*6;beam([-3.5,5.5,z],[0,4.8,z-1],.015,wood);beam([0,4.8,z-1],[3.5,5.9,z-2],.015,wood);}
for(const x of [-3.25,3.25])beam([x,.6,-35],[x,7.1,-35],.06,rust);
for(let i=0;i<9;i++){
 const side=i%2?1:-1,x=side*(2.35+random()*.3),z=-3-i*3.3;
 if(i%3===0){box(.8,.75,.65,blue,x,.97,z);box(.85,.07,.70,trim,x,1.39,z);}
 else if(i%3===1){box(.9,.8,.75,wood,x,1,z);box(.93,.07,.78,trim,x,1.43,z);}
 else{cylinder(.23,.17,.45,rust,x,.8,z);for(let n=0;n<5;n++){const o=mesh(new THREE.IcosahedronGeometry(.39,0),n%2?leaf:leafLight,x+(random()-.5)*.45,1.3+random()*.5,z+(random()-.5)*.4);o.scale.set(.65,1.15,.65);}}
}
// Low-sided wheels and rigid frames, without physically based materials.
function bicycle(x,z){const g=new THREE.Group();g.position.set(x,.65,z);g.rotation.y=.12;root.add(g);const tire=material('#303434');
 for(const wz of [-.48,.48]){const o=mesh(new THREE.TorusGeometry(.34,.035,4,12),tire,0,.36,wz,g);o.rotation.y=Math.PI/2;beam([0,.36,wz],[0,.36,wz+.02],.03,trim,g);}
 for(const [a,b] of [[[0,.36,-.48],[0,.75,0]],[[0,.75,0],[0,.36,.48]],[[0,.36,.48],[0,.36,-.48]],[[0,.75,0],[0,.8,.5]]])beam(a,b,.023,rust,g);
 box(.22,.05,.2,wood,0,.86,0,g);beam([0,.35,.48],[0,1,.50],.025,trim,g);beam([-.2,1,.5],[.2,1,.5],.022,trim,g);
}
bicycle(-2.55,-5.2);bicycle(2.6,-14);

// Original generic residents: simple polygon bodies and tiny painted face maps.
function resident(x,z,shirtColor,heading){
 const g=new THREE.Group();g.position.set(x,.57,z);g.rotation.y=heading;root.add(g);
 const skin=material('#c49673','cloth'),shirt=material(shirtColor,'cloth'),pants=material('#4e5664','cloth'),shoe=material('#373831'),hair=material('#493a2b');
 const limbs=[];
 function limb(a,b,r1,r2,mat){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b);const o=cylinder(r1,r2,start.distanceTo(end),mat,0,0,0,g,5);o.position.copy(start).add(end).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),end.sub(start).normalize());return o;}
 cylinder(.20,.16,.51,shirt,0,1.12,0,g,5);
 box(.34,.22,.21,pants,0,.80,0,g);
 for(const side of [-1,1]){
  limb([side*.115,.78,0],[side*.14,.43,side*.045],.09,.075,pants);
  limb([side*.14,.43,side*.045],[side*.14,.10,0],.07,.065,pants);
  box(.14,.11,.28,shoe,side*.14,.06,.06,g);
  limb([side*.23,1.3,0],[side*.29,1.03,side*.07],.09,.075,shirt);
  limb([side*.29,1.03,side*.07],[side*.31,.80,.10],.066,.05,skin);
  mesh(new THREE.IcosahedronGeometry(.066,0),skin,side*.31,.77,.10,g);
 }
 cylinder(.065,.07,.14,skin,0,1.43,0,g);
 const head=mesh(new THREE.SphereGeometry(.17,8,6),skin,0,1.64,0,g);head.scale.set(.85,1.23,.86);
 const cap=mesh(new THREE.SphereGeometry(.176,8,4,0,Math.PI*2,0,Math.PI*.53),hair,0,1.68,-.015,g);cap.scale.set(.89,1,.91);
 const eye=material('#40382f');for(const side of [-1,1])box(.022,.015,.009,eye,side*.052,1.67,.14,g);
 const nose=mesh(new THREE.ConeGeometry(.022,.05,4),skin,0,1.62,.16,g);nose.rotation.x=Math.PI/2;
 box(.043,.012,.01,rust,0,1.565,.143,g);
 return g;
}
resident(-1.95,-9.3,'#8b6453',.75);
resident(2.0,-18.4,'#68817b',-1.4);

const raycaster=new THREE.Raycaster();
const scanMaterial={
 getShaderChunks(){return {set(name,code){regionCode=code.split('float retroDiffuse')[0];for(const m of materials)m.needsUpdate=true;}};},
 setParameter(name,value){if(!uniforms[name])uniforms[name]={value};else uniforms[name].value=value;},
 update(){dirty=true;}
};
let dirty=true;
const cameraOptions={fov:75,horizontalFov:true};
function resize(){const w=innerWidth,h=innerHeight;const ratio=Math.min(1,800/w,600/h);renderer.setSize(Math.round(w*ratio),Math.round(h*ratio),false);camera.aspect=w/h;camera.fov=cameraOptions.horizontalFov?THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(cameraOptions.fov)/2)/camera.aspect)):cameraOptions.fov;camera.updateProjectionMatrix();dirty=true;}
addEventListener('resize',resize);resize();
const cameraAdapter={camera:cameraOptions,setPosition(x,y,z){camera.position.set(x,y,z);dirty=true;},setEulerAngles(p,y,r){camera.rotation.set(p*Math.PI/180,y*Math.PI/180,r*Math.PI/180);dirty=true;},getPosition(){return camera.position;}};
const settings={background:{color:[.49,.63,.69]},postEffectSettings:{bloom:{enabled:false},sharpness:{enabled:false},grading:{enabled:false}}};
const app={scene:{gsplat:{material:scanMaterial}},graphicsDevice:{canvas,get width(){return canvas.width;},get height(){return canvas.height;}},set renderNextFrame(value){if(value)dirty=true;}};
const viewer={global:{state:{loaded:true},camera:cameraAdapter,settings,app},configureCamera(){resize();},picker:{async pick(x,y){scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);raycaster.setFromCamera(new THREE.Vector2(x*2-1,1-y*2),camera);return raycaster.intersectObjects(pickables,false)[0]?.point??null;}}};
function draw(){requestAnimationFrame(draw);if(dirty&&!document.hidden){resizeProjection();renderer.render(scene,camera);dirty=false;}}
function resizeProjection(){const f=cameraOptions.horizontalFov?THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(cameraOptions.fov)/2)/camera.aspect)):cameraOptions.fov;if(camera.fov!==f){camera.fov=f;camera.updateProjectionMatrix();}}
window.scanEngine={viewer,scene,root,camera,renderer};
parent.dispatchEvent(new CustomEvent('street-engine-ready'));
requestAnimationFrame(draw);
