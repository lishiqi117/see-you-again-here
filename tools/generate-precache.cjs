// Run after publishing-file changes, before deployment. Hashes bind cache entries to file contents.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=process.argv[2]||path.resolve(__dirname,'../dist');
const overlay=process.argv[3]||null;
const exclude=new Set(['precache-manifest.js','site-cache-worker.js']);
const allowed=/\.(?:html|js|css|json|glsl|jpg|jpeg|png|webp|gif|svg|ico|mp4|webm|mp3|wav|ogg|m4a|glb|gltf|fbx|bin|sog|splat|ply|woff2?|ttf|otf|ktx2|wasm|part\d+)$/i;
const paths=new Map();
function walk(dir,prefix='',override=false){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const relative=prefix+entry.name;if(entry.isDirectory()){if(['node_modules','src','.git'].includes(entry.name))continue;walk(path.join(dir,entry.name),relative+'/',override);}else if(allowed.test(relative)&&!exclude.has(relative)&&!relative.endsWith('.source.js')&&!relative.endsWith('package.json'))paths.set(relative,path.join(dir,entry.name));}}
walk(root);
if(overlay){for(const relative of ['index.html','app.js','portrait-transition.js','space-editor.js','styles.css','cat-loading/loader.css','site-preload.js'])paths.set(relative,path.join(overlay,relative));}
const files=[...paths].sort(([a],[b])=>a.localeCompare(b)).map(([name,file])=>({path:name,bytes:fs.statSync(file).size,revision:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')}));
const manifest={version:crypto.createHash('sha256').update(JSON.stringify(files)).digest('hex'),totalBytes:files.reduce((n,f)=>n+f.bytes,0),files};
fs.writeFileSync(path.join(overlay||root,'precache-manifest.js'),'globalThis.SITE_PRECACHE = '+JSON.stringify(manifest)+';\n');
console.log(JSON.stringify({files:files.length,MB:manifest.totalBytes/1048576,version:manifest.version}));
