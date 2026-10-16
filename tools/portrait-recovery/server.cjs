const http=require('http'),fs=require('fs'),path=require('path');
const repo=path.resolve(__dirname,'../../dist'),stage=repo;
http.createServer((req,res)=>{
 const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'')||'index.html';
 if(name.includes('..'))return res.writeHead(403).end();
 const candidate=path.join(stage,name),file=fs.existsSync(candidate)?candidate:path.join(repo,name);
 if(!fs.existsSync(file)||!fs.statSync(file).isFile())return res.writeHead(404).end();
 const size=fs.statSync(file).size,range=req.headers.range?.match(/bytes=(\d+)-(\d*)/);
 const start=range?+range[1]:0,end=range&&range[2]?Math.min(+range[2],size-1):size-1;
 const headers={'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.mp4':'video/mp4','.json':'application/json'})[path.extname(file)]||'application/octet-stream','Content-Length':end-start+1,'Accept-Ranges':'bytes'};
 if(range)headers['Content-Range']=`bytes ${start}-${end}/${size}`;
 res.writeHead(range?206:200,headers);fs.createReadStream(file,{start,end}).pipe(res);
}).listen(8890,'127.0.0.1');

