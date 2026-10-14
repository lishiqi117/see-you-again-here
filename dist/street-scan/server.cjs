const http = require('http');
const fs = require('fs');
const path = require('path');
const root = __dirname, port = 43138;
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.glb':'model/gltf-binary'};
http.createServer((req,res)=>{
  let target;
  try { target=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname)); } catch {res.writeHead(400).end();return;}
  if(target!==root&&!target.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  if(target===root)target=path.join(root,'index.html');
  fs.stat(target,(err,stat)=>{
    if(err||!stat.isFile()){res.writeHead(404).end('Not found');return;}
    res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','Cache-Control':'no-cache'});
    fs.createReadStream(target).pipe(res);
  });
}).listen(port,'127.0.0.1',()=>console.log(`Street Scan: http://127.0.0.1:${port}`));
