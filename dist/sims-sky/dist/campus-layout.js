'use strict';
(() => {
  const camera=document.getElementById('campus-camera');
  // Stable, distinct editor IDs, including each repeated gem.
  window.CAMPUS_ITEMS={};
  const items=[
    ['backpack','粉色樱桃书包',29,3,52,46,-35],
    ['computer','校园电脑、键盘与鼠标',26,49,67,48,15],
    ['pen','粉蓝自动铅笔',15,23,12,23,65],
    ['plane','樱桃纸飞机',77,14,20,18,105],
    ['ruler','蓝色樱桃三角尺',2,46,24,29,60],
    ['gem-1','粉色宝石',3,39,4.5,6,155],
    ['gem-2','粉色宝石',24,25,3.8,5.8,100],
    ['gem-3','粉色宝石',22,50,4.5,6.5,130],
    ['gem-2','粉色宝石',80,34,4.5,6,180],
    ['gem-1','粉色宝石',84,51,5.5,5.5,120],
    ['gem-3','粉色宝石',93,58,4.8,7,165]
  ];
  items.forEach(([asset,label,x,y,w,h,z],i)=>{
    const id=`campus-item-${i}`;
    window.CAMPUS_ITEMS[id]={box:[x,y,w,h],label};
    const layer=document.createElement('div');layer.className='campus-depth';
    layer.style.transform=`translateZ(${z}px)`;
    layer.dataset.depth=z;
    const button=document.createElement('button');button.type='button';
    button.className=`object campus-object campus-${asset} ${id}`;
    button.dataset.campus='true';
    button.style.cssText=`left:${x}%;top:${y}%;width:${w}%;height:${h}%;`;
    button.dataset.full=`assets/campus/${asset}.${asset==='computer'?'svg':'webp'}`;
    button.setAttribute('aria-label',`放大${label}${asset.startsWith('gem')?' '+(i-4):''}`);button.setAttribute('aria-haspopup','dialog');
    const image=new Image();image.src=button.dataset.full;image.alt=label;image.draggable=false;image.decoding='async';
    if(asset.startsWith('gem')) {
      image.style.rotate=`${i%2?'-12':'18'}deg`;
      button.dataset.interaction='wind';button.removeAttribute('aria-haspopup');
      button.setAttribute('aria-label',`粉色花瓣 ${i-4}，点击吹起一阵风`);
    }
    if(asset==='backpack' || asset==='computer') {
      const art=document.createElement('span');art.className='campus-interactive-art';art.append(image);button.append(art);
      if(asset==='computer') {
        button.dataset.interaction='power';button.setAttribute('aria-label','开启电脑屏幕');button.removeAttribute('aria-haspopup');
        const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
        svg.setAttribute('viewBox','80 0 1360 1024');svg.setAttribute('aria-hidden','true');svg.classList.add('crt-screen');
        // Same viewBox and contain fitting as computer.svg; overlays touch only
        // the original display, never the case, stickers, keyboard or mouse.
        svg.innerHTML='<defs><clipPath id="crt-display"><path d="M399 112 L922 198 L863 631 L342 508 Z"/></clipPath><pattern id="crt-lines" width="4" height="5" patternUnits="userSpaceOnUse"><rect width="4" height="1" fill="#091726"/></pattern></defs><g clip-path="url(#crt-display)"><rect class="crt-light" width="1536" height="1024" fill="#e3f2ff"/><rect class="crt-scan" width="1536" height="1024" fill="url(#crt-lines)"/><rect class="crt-power" width="1536" height="1024" fill="#03070c"/></g>';
        art.append(svg);
      }
    } else button.append(image);
    layer.append(button);camera.append(layer);
  });
})();
