// A link is an immutable snapshot; it takes precedence over that browser's layout.
export function encodeLayout(layout) {
 const data={v:1,a:layout.assets.map(({id,transform:t})=>[id,...t.position,...t.rotationDegrees,...t.scale]),c:[layout.camera.position,layout.camera.target],w:[layout.viewerSettings.horizontalAngle,layout.viewerSettings.verticalAngle,layout.viewerSettings.zoomPercent]};
 return btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(data)))).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
}
export function decodeLayout(encoded) {
 if(!encoded||encoded.length>60000)throw Error('Invalid layout link');
 const raw=atob(encoded.replaceAll('-','+').replaceAll('_','/'));
 const data=JSON.parse(new TextDecoder().decode(Uint8Array.from(raw,c=>c.charCodeAt(0))));
 const vec=a=>Array.isArray(a)&&a.length===3&&a.every(Number.isFinite);
 if(data.v!==1||!Array.isArray(data.a)||!data.a.length||data.a.length>200||!Array.isArray(data.c)||data.c.length!==2||!data.c.every(vec)||!vec(data.w))throw Error('Invalid layout data');
 const ids=new Set();
 const assets=data.a.map(a=>{if(!Array.isArray(a)||a.length!==10||typeof a[0]!=='string'||ids.has(a[0])||!a.slice(1).every(Number.isFinite)||a.slice(7).some(s=>s<.05))throw Error('Invalid asset');ids.add(a[0]);return {id:a[0],transform:{position:a.slice(1,4),rotationDegrees:a.slice(4,7),scale:a.slice(7,10)}}});
 return {schemaVersion:1,scene:'crayon-space',assets,camera:{position:data.c[0],target:data.c[1]},viewerSettings:{horizontalAngle:data.w[0],verticalAngle:data.w[1],zoomPercent:data.w[2]}};
}
