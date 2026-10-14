(() => {
  'use strict';
  const screen = document.querySelector('#lampMemory');
  const room = document.querySelector('#lampRoomCanvas');
  const archive = document.querySelector('#deskArchive');
  const dialog = document.querySelector('#deskArchiveDialog');
  if (!screen || !room || !archive || !dialog) return;

  const W = 1672, H = 941;
  const folder = { x: 313, y: 809, width: 536, height: 132 };
  const outline = [[0, .46], [.67, 0], [.72, .02], [1, .78], [1, .89], [.86, 1], [.14, 1]];
  const loadImage = src => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`无法读取背景：${src}`));
    image.src = src;
  });

  // Source / destination landmarks in the two original 1672 × 941 images.
  // A continuous triangle mesh aligns both the frame perspective and each photo.
  // Keep originals intact; registration happens once in an offscreen canvas.
  const landmarks = [
    [0,0,0,0], [1672,0,1672,0], [1672,941,1672,941], [0,941,0,941],
    [441,159,446,176], [1462,158,1448,171], [1464,855,1454,842], [437,854,436,822],
    [510,213,510,223], [670,211,667,222], [670,404,667,400], [510,404,507,399],
    [840,220,837,228], [1006,219,997,229], [1007,416,996,405], [840,413,837,404],
    [1167,224,1164,233], [1332,224,1318,234], [1335,418,1318,412], [1167,416,1162,409],
    [495,426,494,425], [657,411,654,412], [675,610,670,590], [512,627,513,602],
    [1195,444,1190,437], [1361,432,1354,428], [1373,627,1370,607], [1207,638,1200,614],
    [567,636,567,622], [729,615,727,603], [751,801,749,773], [587,823,587,790],
    [795,544,798,534], [965,542,962,536], [966,738,960,712], [796,739,796,709],
    [1011,582,1009,571], [1180,584,1175,571], [1179,777,1175,750], [1009,776,1006,747],
    [1244,633,1241,615], [1417,638,1405,626], [1410,826,1395,803], [1236,817,1231,794],
    [921,384,917,384], [1076,368,1065,372], [1094,540,1086,535], [938,566,936,559]
  ];

  function triangulate(points) {
    const p = points.map(([x,y]) => ({x,y}));
    const count = p.length;
    p.push({x:-10000,y:-10000}, {x:10000,y:-10000}, {x:0,y:10000});
    let triangles = [[count, count+1, count+2]];
    const inside = (indices, point) => {
      const [a,b,c] = indices.map(i => p[i]);
      const d = 2*(a.x*(b.y-c.y)+b.x*(c.y-a.y)+c.x*(a.y-b.y));
      if (Math.abs(d) < 1e-8) return false;
      const aa=a.x*a.x+a.y*a.y, bb=b.x*b.x+b.y*b.y, cc=c.x*c.x+c.y*c.y;
      const x=(aa*(b.y-c.y)+bb*(c.y-a.y)+cc*(a.y-b.y))/d;
      const y=(aa*(c.x-b.x)+bb*(a.x-c.x)+cc*(b.x-a.x))/d;
      return (point.x-x)**2+(point.y-y)**2 <= (a.x-x)**2+(a.y-y)**2;
    };
    for (let i=0; i<count; i++) {
      const bad = triangles.filter(t => inside(t, p[i]));
      const edges = new Map();
      for (const t of bad) for (let j=0;j<3;j++) {
        const a=t[j], b=t[(j+1)%3], key=[a,b].sort((x,y)=>x-y).join(',');
        if (edges.has(key)) edges.delete(key); else edges.set(key,[a,b]);
      }
      triangles=triangles.filter(t => !bad.includes(t));
      for (const [a,b] of edges.values()) triangles.push([a,b,i]);
    }
    return triangles.filter(t => t.every(i => i<count));
  }

  function drawTriangle(ctx, image, vertices) {
    const [[x0,y0,u0,v0],[x1,y1,u1,v1],[x2,y2,u2,v2]]=vertices;
    const det=(x1-x0)*(y2-y0)-(x2-x0)*(y1-y0);
    if (Math.abs(det)<1e-8) return;
    const a=((u1-u0)*(y2-y0)-(u2-u0)*(y1-y0))/det;
    const c=((x1-x0)*(u2-u0)-(x2-x0)*(u1-u0))/det;
    const b=((v1-v0)*(y2-y0)-(v2-v0)*(y1-y0))/det;
    const d=((x1-x0)*(v2-v0)-(x2-x0)*(v1-v0))/det;
    ctx.save();
    ctx.beginPath();
    // Subpixel overlap avoids hairline gaps between adjacent clipped triangles.
    const cx=(u0+u1+u2)/3, cy=(v0+v1+v2)/3;
    vertices.forEach(([, ,u,v],i) => {
      const length=Math.hypot(u-cx,v-cy), pad=.65;
      const x=u+(u-cx)/length*pad, y=v+(v-cy)/length*pad;
      if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    });
    ctx.closePath(); ctx.clip();
    ctx.transform(a,b,c,d,u0-a*x0-c*y0,v0-b*x0-d*y0);
    ctx.drawImage(image,0,0);
    ctx.restore();
  }

  function clearDeskUnderFolder(ctx, dark) {
    ctx.save(); ctx.beginPath();
    outline.forEach(([x,y],i) => {
      const px=folder.x+x*folder.width, py=folder.y+y*folder.height;
      if (!i) ctx.moveTo(px,py); else ctx.lineTo(px,py);
    });
    ctx.closePath(); ctx.clip();
    // Continue the adjacent wood grain beneath the lifted, separate folder.
    ctx.drawImage(dark,0,805,310,136,folder.x,folder.y,folder.width,folder.height);
    ctx.restore();
  }

  function placeFolder() {
    const bounds=screen.querySelector('.lamp-room-photo');
    const width=bounds.offsetWidth, height=bounds.offsetHeight;
    const scale=Math.max(width/W,height/H);
    archive.style.left=`${bounds.offsetLeft+(width-W*scale)/2+folder.x*scale}px`;
    archive.style.top=`${bounds.offsetTop+(height-H*scale)/2+folder.y*scale}px`;
    archive.style.width=`${folder.width*scale}px`;
    archive.style.height=`${folder.height*scale}px`;
  }

  window.lampBackgroundReady=Promise.all([
    loadImage('./assets/lamp/memory-room-dark.jpg'),
    loadImage('./assets/lamp/memory-room-light.png'),
    archive.querySelector('img').decode()
  ]).then(([dark,light]) => {
    const ctx=room.getContext('2d');
    ctx.drawImage(dark,0,0);
    clearDeskUnderFolder(ctx,dark);
    const aligned=document.createElement('canvas');
    aligned.width=W; aligned.height=H;
    const target=aligned.getContext('2d');
    for (const t of triangulate(landmarks)) drawTriangle(target,light,t.map(i=>landmarks[i]));
    clearDeskUnderFolder(target,dark);
    placeFolder();
    archive.classList.add('ready');
    return aligned;
  });

  // The folder owns its click; it must not also start a lamp drag or turn a page.
  for (const event of ['pointerdown','pointerup','click','keydown','keyup']) {
    archive.addEventListener(event,e=>e.stopPropagation());
  }
  function openArchive() {
    dialog.showModal();
    dialog.focus({preventScroll:true});
    dialog.dispatchEvent(new Event('archive:open'));
  }
  archive.addEventListener('click',openArchive);
  archive.addEventListener('keydown',e=>{
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!e.repeat) openArchive();
    }
  });
  dialog.querySelector('button').addEventListener('click',() => dialog.close());
  for (const event of ['pointerdown','pointermove','pointerup','click','keydown','keyup','wheel']) {
    dialog.addEventListener(event,e=>e.stopPropagation());
  }
  dialog.addEventListener('wheel',e=>e.preventDefault(),{passive:false});
  dialog.addEventListener('keydown',e=>{
    if (e.key === 'Escape') { e.preventDefault(); dialog.close(); }
  });
  dialog.addEventListener('close',()=>archive.focus({preventScroll:true}));
  new ResizeObserver(placeFolder).observe(screen);
})();
