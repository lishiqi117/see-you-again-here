'use strict';
(() => {
  const chapter=document.getElementById('campus-chapter');
  const viewport=chapter.querySelector('.campus-viewport');
  const camera=document.getElementById('campus-camera');
  const study=document.getElementById('study-chapter');
  const cloudLayer=chapter.querySelector('.campus-clouds');
  // Static clouds: scroll with the page, without parallax or a pinned section.
  const clouds=[[-9,14,30,.8,65],[65,-5,40,.7,-45],[33,37,19,.55,25],[-13,67,43,.86,100],[73,73,34,.9,-105],[48,92,27,.65,-40]];
  clouds.forEach(([x,y,size,opacity],i)=>{
    const image=new Image();image.src='assets/cloud.webp';image.alt='';image.className='campus-cloud';
    image.style.cssText=`--x:${x}%;--y:${y}%;--size:${size}%;--opacity:${opacity};rotate:${i%2?-9:6}deg;`;
    cloudLayer.append(image);
  });
  let resizeFrame=0;
  function fit() {
    resizeFrame=0;
    viewport.style.setProperty('--campus-fit',Math.min(viewport.clientWidth*.90/1000,viewport.clientHeight*.88/1000)*1.2);
    // Read saved study positions without modifying them. Reserve space below
    // even oversized/low objects, including the saved handbook and curled paper.
    const bottom=study.getBoundingClientRect().bottom;
    let overflow=0;
    study.querySelectorAll('.study-object').forEach(item=>{
      overflow=Math.max(overflow,item.getBoundingClientRect().bottom-bottom+24);
    });
    const gap=Math.ceil(Math.max(viewport.clientHeight*.16,overflow+60));
    chapter.style.setProperty('--campus-gap',gap+'px');
    const viewBottom=viewport.getBoundingClientRect().bottom;
    const objectBottom=Math.max(...[...camera.querySelectorAll('.campus-object')].map(item=>item.getBoundingClientRect().bottom));
    document.querySelector('.sky').style.setProperty('--campus-tail',Math.ceil(Math.max(0,objectBottom-viewBottom)+80)+'px');

  }
  function scheduleFit() {if(!resizeFrame)resizeFrame=requestAnimationFrame(fit);}
  new ResizeObserver(scheduleFit).observe(viewport);
  new ResizeObserver(scheduleFit).observe(study);
  document.querySelector('.scene').addEventListener('scene-layout-change',scheduleFit);
  window.addEventListener('load',scheduleFit);
  document.addEventListener('campus-select',()=>{
    window.scrollTo({top:chapter.getBoundingClientRect().top+window.scrollY,behavior:'instant'});
  });
  fit();
})();
