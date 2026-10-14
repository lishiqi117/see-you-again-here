// Surface-bound ink: dots follow model transforms and skinned characters.
export function createPrintPostprocessing(renderer) {
  const prepared = new WeakSet();
  function prepare(object) {
    if (!object.isMesh || !object.geometry.attributes.normal || object.userData.isEditorHelper) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (prepared.has(material) || material.isShaderMaterial || material.depthTest === false) continue;
      prepared.add(material);
      object.geometry.computeBoundingSphere();
      const scale = Math.max(object.geometry.boundingSphere.radius, .001);
      const id = object.userData.assetId || '';
      const accent = /^(star|sun|bird|cloud)/.test(id) ? .88 : id === 'apple-tree' ? .48 : .08;
      const previousCompile = material.onBeforeCompile;
      const key = material.customProgramCacheKey();
      material.customProgramCacheKey = () => key + '|surface-ink-pink-lemon-large-dots';
      material.onBeforeCompile = function(shader, context) {
        previousCompile.call(this, shader, context);
        shader.uniforms.printScale = { value: scale };
        shader.uniforms.printAccent = { value: accent };
        shader.vertexShader = 'varying vec3 vPrintPoint; varying vec3 vPrintNormal;\n' + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>',
          '#include <begin_vertex>\nvPrintPoint = position; vPrintNormal = normal;');
        shader.fragmentShader = `
          varying vec3 vPrintPoint; varying vec3 vPrintNormal;
          uniform float printScale, printAccent;
          float inkHash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
          float inkScreen(vec2 p, float density) {
            vec2 q = mat2(.7071,-.7071,.7071,.7071) * p;
            float rough = inkHash(floor(q))-.5;
            // A wider radius range makes highlights pinpoints and shadows broad ink dots.
            float radius = .015 + pow(density,.72)*.60 + rough*.022;
            float aa = max(length(fwidth(q))*.24,.018);
            float ink = 1.-smoothstep(radius-aa,radius+aa,length(fract(q)-.5));
            return mix(ink,density,smoothstep(.55,1.25,max(fwidth(q.x),fwidth(q.y))));
          }
        ` + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace('#include <dithering_fragment>', `
          #include <dithering_fragment>
          vec3 originalInk = gl_FragColor.rgb;
          float lightInk = dot(originalInk,vec3(.2126,.7152,.0722));
          float coverageInk = smoothstep(.025,.96,clamp((.96-lightInk)/.84,0.,1.));
          // 2.7x wider screen pitch; coordinates still follow the model surface.
          vec3 pInk = vPrintPoint / printScale * 55.;
          vec3 weightsInk = pow(abs(normalize(vPrintNormal)),vec3(12.));
          weightsInk /= max(dot(weightsInk,vec3(1.)),.001);
          float dotsInk = inkScreen(pInk.yz,coverageInk)*weightsInk.x
            + inkScreen(pInk.xz,coverageInk)*weightsInk.y
            + inkScreen(pInk.xy,coverageInk)*weightsInk.z;
          vec3 paperInk = vec3(.992,.973,.973);
          vec3 pinkPlateInk = vec3(.835,.325,.585);
          vec3 lemonPlateInk = vec3(.905,.95,.13);
          vec3 printedInk = mix(paperInk,pinkPlateInk,dotsInk);
          // Use pigment color before lighting, so bright yellow/pink ink is not bleached away.
          vec3 pigmentInk = pow(max(diffuseColor.rgb,vec3(0.)),vec3(.4545));
          float vividInk = max(pigmentInk.r,max(pigmentInk.g,pigmentInk.b))-min(pigmentInk.r,min(pigmentInk.g,pigmentInk.b));
          float pinkInk = smoothstep(.08,.3,pigmentInk.r-pigmentInk.g)*smoothstep(.02,.18,pigmentInk.b-pigmentInk.g);
          float yellowInk = smoothstep(.04,.28,min(pigmentInk.r+.15,pigmentInk.g)-pigmentInk.b);
          float colorInk = smoothstep(.16,.45,vividInk)*max(printAccent,max(pinkInk*.82,yellowInk*.74));
          vec3 colorPlateInk = mix(pinkPlateInk,lemonPlateInk,yellowInk);
          colorPlateInk = mix(paperInk,colorPlateInk,.72+.22*lightInk);
          printedInk = mix(printedInk,mix(colorPlateInk,pinkPlateInk,dotsInk*.16),colorInk);
          // Tiny local plate spread at tonal edges; stays attached to the surface.
          float plateEdgeInk = smoothstep(.04,.2,fwidth(lightInk));
          float offsetInk = inkScreen(pInk.xy + fwidth(pInk.xy)*1.2,coverageInk)-inkScreen(pInk.xy,coverageInk);
          printedInk += vec3(.045,-.018,.032)*offsetInk*plateEdgeInk;
          float grainInk = inkHash(floor(pInk.xy*8.18))- .5;
          gl_FragColor.rgb = clamp(printedInk + grainInk*.025,0.,1.);
        `);
      };
      material.needsUpdate = true;
    }
  }
  return {
    prepareScene(scene) { scene.traverse(prepare); },
    render(scene, camera) {
      scene.traverse(prepare);
      renderer.render(scene, camera);
    }
  };
}
