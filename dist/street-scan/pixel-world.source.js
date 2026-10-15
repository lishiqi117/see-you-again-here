import * as THREE from 'three';

// Layer 1 contains only the pixel assets and their matching street depth mask.
// The other models and Gaussian street retain their existing renderers.
export function createPixelWorld(scene, sourceCamera, occlusion) {
 const canvas=document.createElement('canvas');canvas.id='game-pixel-world';canvas.hidden=true;document.body.append(canvas);
 const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:false,preserveDrawingBuffer:true});renderer.setPixelRatio(1);
 // clear() may run before the first render(). Three's initial GL clear alpha
 // is 1 even with alpha:true; explicitly initialize this overlay as transparent.
 renderer.setClearColor(0x000000,0);
 const target=new THREE.WebGLRenderTarget(1,1,{minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,generateMipmaps:false});
 const camera=sourceCamera.clone();camera.layers.set(1);
 const viewport=new THREE.Vector2();
 for(const original of occlusion.meshes){const mask=original.clone();mask.material=original.material.clone();mask.material.uniforms.viewport.value=viewport;mask.layers.set(1);scene.add(mask);}
 const passScene=new THREE.Scene(),passCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
 passScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({
  uniforms:{image:{value:target.texture}},depthTest:false,depthWrite:false,toneMapped:false,
  vertexShader:'varying vec2 uvPixel;void main(){uvPixel=uv;gl_Position=vec4(position.xy,0.,1.);}',
  fragmentShader:`uniform sampler2D image;varying vec2 uvPixel;
   void main(){vec4 source=texture2D(image,uvPixel);if(source.a<.5)discard;
    vec3 color=pow(max(source.rgb,vec3(0.)),vec3(1./2.2));float ink=dot(color,vec3(.299,.587,.114));
    vec3 palette=ink<.18?vec3(19.,18.,17.):ink<.40?vec3(53.,50.,48.):ink<.68?vec3(130.,117.,105.):vec3(231.,224.,206.);
    gl_FragColor=vec4(palette/255.,1.);
   }`
 })));
 function resize(){const w=Math.max(1,Math.ceil(innerWidth/5)),h=Math.max(1,Math.ceil(innerHeight/5));renderer.setSize(w,h,false);target.setSize(w,h);viewport.set(w,h);}
 addEventListener('resize',resize);resize();
 let empty=false,lastKey='';
 function render(){
  // A depth-only layer contributes no pixels. Clear its old image once when
  // its last color object disappears; keep all original passes when occupied.
  let hasColor=false;const parts=[innerWidth,innerHeight,...sourceCamera.matrixWorld.elements,...sourceCamera.projectionMatrix.elements];
  scene.updateMatrixWorld();
  scene.traverseVisible(o=>{
   if(!o.isMesh || !(o.layers.mask & 2))return;
   const materials=Array.isArray(o.material)?o.material:[o.material];
   if(materials.some(m=>m.visible && m.colorWrite)){hasColor=true;parts.push(o.id,...o.matrixWorld.elements,...materials.map(m=>m.version));}
  });
  if(!hasColor){if(!empty){renderer.setRenderTarget(null);renderer.clear();empty=true;}return;}
  const key=parts.join(',');if(!empty&&key===lastKey)return;lastKey=key;empty=false;
  camera.copy(sourceCamera);camera.layers.set(1);renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(passScene,passCamera);
 }
 return {canvas,renderer,render};
}

export function flattenPixelModel(group){group.traverse(o=>{o.layers.set(1);if(!o.isMesh)return;
 const flatten=material=>{const map=material.map?.clone()||null;if(map){map.minFilter=map.magFilter=THREE.NearestFilter;map.generateMipmaps=false;map.needsUpdate=true;}return new THREE.MeshBasicMaterial({map,color:material.color,side:material.side,toneMapped:false});};
 o.material=Array.isArray(o.material)?o.material.map(flatten):flatten(o.material);
});}
