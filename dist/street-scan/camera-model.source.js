import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';

export async function createHandCamera(canvas, url, {pixelArt = false} = {}) {
  const renderer = new THREE.WebGLRenderer({canvas, alpha: true,
    antialias: !pixelArt, preserveDrawingBuffer: pixelArt});
  renderer.setPixelRatio(pixelArt ? 1 : Math.min(devicePixelRatio, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, .01, 100);
  camera.position.set(0, .18, 3.9);
  camera.lookAt(0, 0, 0);

  // Broad reflections make the original metal and leather materials read as volumes.
  if (!pixelArt) {
  const environment = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environmentTarget = pmrem.fromScene(environment, .05);
  scene.environment = environmentTarget.texture;
  scene.environmentIntensity = .65;
  environment.dispose();
  pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xe7f3ed, 0x39372e, 1.5));
  const key = new THREE.DirectionalLight(0xffeed7, 3);
  key.position.set(-3, 4, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xbce1ee, 2);
  rim.position.set(4, 2, -3);
  scene.add(rim);
  }

  // Render only this camera on a coarse grid, then reduce it to four ink colors.
  // The default renderer remains available for the earlier scanning camera.
  let pixelTarget, pixelScene, pixelCamera;
  if (pixelArt) {
    canvas.style.imageRendering = 'pixelated';
    canvas.dataset.renderStyle = 'pixel-art';
    pixelTarget = new THREE.WebGLRenderTarget(1, 1, {
      minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
      generateMipmaps: false
    });
    pixelScene = new THREE.Scene();
    pixelCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    pixelScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
      uniforms: {image: {value: pixelTarget.texture}},
      vertexShader: 'varying vec2 uvPixel; void main(){uvPixel=uv;gl_Position=vec4(position.xy,0.,1.);}',
      fragmentShader: `uniform sampler2D image; varying vec2 uvPixel;
        void main(){
          vec4 source=texture2D(image,uvPixel);
          if(source.a<0.5) discard;
          vec3 color=pow(max(source.rgb,vec3(0.)),vec3(1.0/2.2));
          float ink=dot(color,vec3(.299,.587,.114));
          vec3 palette=ink<.18?vec3(19.,18.,17.):
            ink<.40?vec3(53.,50.,48.):
            ink<.68?vec3(130.,117.,105.):vec3(231.,224.,206.);
          gl_FragColor=vec4(palette/255.,1.);
        }`,
      depthTest: false, depthWrite: false, toneMapped: false
    })));
  }

  const gltf = await new GLTFLoader().loadAsync(url);
  // Keep the actual scanned camera, excluding the GLB's unrelated helper cubes.
  gltf.scene.traverse(object => {
    if (object.isMesh && !object.name.startsWith('Final500K')) object.visible = false;
    if (pixelArt && object.isMesh) {
      const flatten = material => {
        const map = material.map?.clone() || null;
        if (map) {
          map.minFilter = map.magFilter = THREE.NearestFilter;
          map.generateMipmaps = false;
          map.needsUpdate = true;
        }
        return new THREE.MeshBasicMaterial({map, color: material.color,
          side: material.side, toneMapped: false});
      };
      object.material = Array.isArray(object.material)
        ? object.material.map(flatten) : flatten(object.material);
    }
  });
  const box = new THREE.Box3();
  gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse(object => {
    if (!object.isMesh || !object.visible) return;
    object.geometry.computeBoundingBox();
    box.union(object.geometry.boundingBox.clone().applyMatrix4(object.matrixWorld));
  });
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  gltf.scene.position.sub(center);
  const pivot = new THREE.Group();
  pivot.add(gltf.scene);
  pivot.scale.setScalar(2.5 / Math.max(size.x, size.y, size.z));
  pivot.rotation.set(.24, 0, 0);
  scene.add(pivot);

  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const renderWidth = pixelArt ? Math.max(1, Math.ceil(w / 6)) : w;
    const renderHeight = pixelArt ? Math.max(1, Math.ceil(h / 6)) : h;
    renderer.setSize(renderWidth, renderHeight, false);
    if (pixelTarget) pixelTarget.setSize(renderWidth, renderHeight);
    // Keep the previous camera framing, but extend the transparent render surface
    // to the entire page. Rotation can now cross the former box without clipping.
    const portrait = w <= 600;
    const framingWidth = portrait ? w * .9 : Math.min(680, Math.max(280, w * .44));
    const framingHeight = h * (portrait ? .32 : .4);
    const left = (w - framingWidth) / 2;
    const top = h * .7 - framingHeight / 2;
    camera.setViewOffset(framingWidth, framingHeight, -left, -top, w, h);
  };
  new ResizeObserver(resize).observe(canvas);
  resize();

  let running = false, walking = false, scanning = false;
  let aimX = 0, aimY = 0, lastTime = 0, walkBlend = 0;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let frame=0;
  function wake(){if(running&&!document.hidden&&!frame){lastTime=performance.now()/1000;frame=requestAnimationFrame(draw)}}
  document.addEventListener('visibilitychange',wake);
  function draw(ms) {
    frame=0;
    const t = ms / 1000;
    const dt = Math.min(.05, lastTime ? t - lastTime : 0);
    lastTime = t;
    if (!running || document.hidden) return;
    const follow = reduced ? 1 : 1 - Math.exp(-16 * dt);
    walkBlend = THREE.MathUtils.lerp(walkBlend, walking ? 1 : 0, follow);
    const sway = reduced ? 0 : Math.sin(t * 7.5) * .028 * walkBlend;
    const breath = reduced ? 0 : Math.sin(t * 1.6) * .007;
    // Real 3D rotation exposes the top, side and lens depth; the rear stays toward the player.
    const rx = .24 + aimY * .24 + sway - (scanning ? .06 : 0);
    const ry = aimX * .60;
    const rz = -aimX * .07 + sway * .5;
    pivot.rotation.x += (rx - pivot.rotation.x) * follow;
    pivot.rotation.y += (ry - pivot.rotation.y) * follow;
    pivot.rotation.z += (rz - pivot.rotation.z) * follow;
    pivot.position.x += (aimX * .16 + sway - pivot.position.x) * follow;
    pivot.position.y += (-aimY * .08 + breath + Math.abs(sway) - pivot.position.y) * follow;
    pivot.position.z += ((scanning ? .12 : 0) - pivot.position.z) * follow;
    if (pixelArt) {
      renderer.setRenderTarget(pixelTarget);
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      renderer.render(pixelScene, pixelCamera);
    } else renderer.render(scene, camera);
    if(running&&!document.hidden)frame=requestAnimationFrame(draw);
  }
  return {
    setState(active, walk, aim = {}) {
      running = active;
      walking = walk;
      scanning = !!aim.scanning;
      aimX = THREE.MathUtils.clamp(aim.x ?? 0, -1, 1);
      aimY = THREE.MathUtils.clamp(aim.y ?? 0, -1, 1);
      wake();
    },
    scene, pivot, camera, renderer, pixelArt
  };
}
