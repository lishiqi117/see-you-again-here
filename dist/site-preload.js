(() => {
  'use strict';
  const base = new URL('./', document.currentScript.src);
  const manifest = window.SITE_PRECACHE;
  const cacheName = 'memory-site:' + base.pathname;
  const keyFor = file => new URL(file.path + '?__revision=' + file.revision, base).href;
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  async function controlCache() {
    if (!window.isSecureContext || !('serviceWorker' in navigator) || !('caches' in window)) {
      throw new Error('请通过 HTTPS 网站或本地预览服务打开，才能完整缓存所有章节');
    }
    await navigator.serviceWorker.register(new URL('site-cache-worker.js', base), {scope:base.pathname, updateViaCache:'none'});
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
      const controller = navigator.serviceWorker.controller;
      if (controller) {
        const version = await new Promise(resolve => {
          const channel = new MessageChannel();
          const timer = setTimeout(() => {channel.port1.close();resolve(null);}, 1000);
          channel.port1.onmessage = event => {clearTimeout(timer);channel.port1.close();resolve(event.data);};
          controller.postMessage({type:'site-cache:version'}, [channel.port2]);
        });
        if (version === manifest.version) return;
      }
      await delay(100);
    }
    throw new Error('缓存服务尚未准备好，请重试');
  }
  function waitForMedia(video) {
    if(video.readyState>=2)return Promise.resolve();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => finish(new Error('视频准备超时，请重试')), 60000);
      function finish(error) {clearTimeout(timer);video.removeEventListener('loadeddata',check);video.removeEventListener('error',fail);error?reject(error):resolve();}
      function check() {if(video.readyState>=2)finish();}
      function fail() { // The portrait owns its lossless-to-original fallback.
        if(!video.error || video.src.endsWith('/portrait-scrub.mp4'))return;
        finish(new Error('视频载入失败，请重试'));
      }
      video.addEventListener('loadeddata',check);video.addEventListener('error',fail);
      video.preload='auto';video.load();check();
    });
  }
  function waitForLamp() {
    return new Promise((resolve,reject) => {
      const lamp=document.querySelector('#lampMemory');
      const timer=setTimeout(()=>finish(new Error('台灯准备超时，请重试')),60000);
      const observer=new MutationObserver(check);
      function finish(error){clearTimeout(timer);observer.disconnect();error?reject(error):resolve();}
      function check(){if(lamp.classList.contains('model-ready'))finish();else if(lamp.classList.contains('model-unavailable'))finish(new Error('台灯模型载入失败，请刷新重试'));}
      observer.observe(lamp,{attributes:true,attributeFilter:['class']});check();
    });
  }
  async function downloadFiles(files, report) {
    const totalBytes=files.reduce((n,f)=>n+f.bytes,0);
    const cache=await caches.open(cacheName), amounts=new Map();
    let completed=0, cursor=0, downloaded=0, lastReport=0;
    const emit=(force=false)=>{
      if(!force&&performance.now()-lastReport<100)return;
      lastReport=performance.now();
      const bytes=downloaded+[...amounts.values()].reduce((a,b)=>a+b,0);
      report(Math.min(99,bytes/totalBytes*99),`正在准备画面 · ${(bytes/1048576).toFixed(1)} / ${(totalBytes/1048576).toFixed(1)} MB`);
    };
    const controller=new AbortController();
    async function worker(){
      while(cursor<files.length){
        const file=files[cursor++],key=keyFor(file);
        if(await cache.match(key)){downloaded+=file.bytes;completed++;emit();continue;}
        let success=false;
        for(let attempt=0;attempt<3&&!success;attempt++){
          try{
            amounts.set(key,0);
            const url=new URL(file.path,base);
            // Reuse the browser's initial image/script downloads; bust only stale or failed responses.
            if(attempt)url.searchParams.set('__download',file.revision);
            const response=await fetch(url,{cache:attempt?'reload':'force-cache',signal:controller.signal});
            if(!response.ok)throw new Error('HTTP '+response.status);
            let received=0;
            const stream=response.body.pipeThrough(new TransformStream({transform(chunk,sink){received+=chunk.byteLength;amounts.set(key,Math.min(received,file.bytes));emit();sink.enqueue(chunk);},flush(){if(received!==file.bytes)throw new Error('资源长度不符');}}));
            const headers=new Headers(response.headers);headers.delete('Content-Encoding');headers.set('Content-Length',String(file.bytes));
            const data=await new Response(stream).arrayBuffer();
            const digest=await crypto.subtle.digest('SHA-256',data);
            const revision=[...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
            if(revision!==file.revision)throw new Error('资源版本已更新');
            await cache.put(key,new Response(data,{headers}));
            downloaded+=file.bytes;amounts.delete(key);completed++;success=true;emit();
          }catch(error){
            amounts.delete(key);
            if(controller.signal.aborted)throw error;
            if(error.name==='QuotaExceededError')throw new Error('浏览器存储空间不足，无法完整保存所有章节，请释放空间后重试');
            if(attempt===2)throw new Error('资源下载失败，请检查网络后重试：'+file.path);
            await delay(500*(attempt+1));
          }
        }
      }
    }
    const jobs=Array.from({length:3},()=>worker());
    try{await Promise.all(jobs);}catch(error){controller.abort();await Promise.allSettled(jobs);throw error;}
    emit(true);
    if(completed!==files.length)throw new Error('资源尚未全部完成');
    return {files:completed,bytes:totalBytes};
  }
  window.prepareWholeSite = async function(report) {
    report(0,'正在准备开场…');
    await controlCache();
    const opening=manifest.files.filter(file=>file.stage==='opening');
    const summary=await downloadFiles(opening,report);
    const cache=await caches.open(cacheName);
    report(99,'开场已下载，正在准备画面…');
    await Promise.all([
      window.lampBackgroundReady,waitForLamp(),
      ...[...document.querySelectorAll('#lampMemory img[src]')].map(img=>img.decode()),
      ...[...document.querySelectorAll('#archiveOpeningSource')].map(waitForMedia)
    ]);
    // Remove obsolete revisions only after the new set and opening scene succeed.
    const wanted=new Set(manifest.files.map(keyFor));
    const bootstrap=new URL('precache-manifest.js',base).href;
    await cache.put(bootstrap,new Response('globalThis.SITE_PRECACHE = '+JSON.stringify(manifest)+';', {headers:{'Content-Type':'text/javascript'}}));
    wanted.add(bootstrap);
    await Promise.all((await cache.keys()).filter(request=>!wanted.has(request.url)).map(request=>cache.delete(request)));
    window.sitePreloadState={ready:true,...summary,version:manifest.version,portraitReady:false};
    report(100,'开场准备好了');
  };
  let nextDownload=null;
  window.prepareNextMemory=async()=>{
    if(!nextDownload)nextDownload=downloadFiles(manifest.files.filter(file=>file.stage==='portrait'),(progress,message)=>{
      window.dispatchEvent(new CustomEvent('portrait:preload',{detail:{progress,message}}));
    }).then(()=>waitForMedia(document.querySelector('.portrait-transition video'))).catch(error=>{nextDownload=null;throw error;});
    await nextDownload;
    window.dispatchEvent(new CustomEvent('portrait:preload',{detail:{progress:99,message:'正在准备照片里的世界…'}}));
    await window.preparePortraitScene();
    if(window.sitePreloadState)window.sitePreloadState.portraitReady=true;
  };
})();
