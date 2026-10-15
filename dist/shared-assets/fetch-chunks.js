(() => {
 const root = new URL('../',document.currentScript.src), manifest = {"shared-assets/15f1dfba797888d5abdefa73.bin":{"parts":["shared-assets/15f1dfba797888d5abdefa73.bin.part0","shared-assets/15f1dfba797888d5abdefa73.bin.part1","shared-assets/15f1dfba797888d5abdefa73.bin.part2"],"mime":"application/octet-stream","size":44628997},"shared-assets/7351bac8284174d82ca6d940.glb":{"parts":["shared-assets/7351bac8284174d82ca6d940.glb.part0","shared-assets/7351bac8284174d82ca6d940.glb.part1"],"mime":"model/gltf-binary","size":18056332},"street-scan/assets/street.sog":{"parts":["shared-assets/15f1dfba797888d5abdefa73.bin.part0","shared-assets/15f1dfba797888d5abdefa73.bin.part1","shared-assets/15f1dfba797888d5abdefa73.bin.part2"],"mime":"application/octet-stream","size":44628997}};
 const original = window.fetch.bind(window), cache = new Map();
 window.fetch = async function(input, options) {
  const url=new URL(typeof input==='string'||input instanceof URL?input:input.url,document.baseURI);
  const key=decodeURIComponent(url.pathname).slice(decodeURIComponent(root.pathname).length);
  const item=url.origin===root.origin&&manifest[key];
  if(!item)return original(input,options);
  if(!cache.has(key))cache.set(key,Promise.all(item.parts.map(async part=>{
   const response=await original(new URL(part,root),options);if(!response.ok)throw Error('场景资源加载失败');return response.arrayBuffer();
  })).then(parts=>{const blob=new Blob(parts,{type:item.mime});cache.delete(key);return blob;}).catch(error=>{cache.delete(key);throw error;}));
  return new Response(await cache.get(key),{status:200,headers:{'Content-Type':item.mime,'Content-Length':String(item.size)}});
 };
})();