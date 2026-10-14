'use strict';
// Keep the original cutouts and layout; animate inside each independent plane.
window.SCHOOL_ITEMS = {
  books: {label:'书本与作业本',asset:'books',box:[29,7,40,52],z:0},
  'math-paper': {label:'数学试卷',asset:'math-paper',box:[68,37,30,36],z:30},
  note: {label:'右上便笺',asset:'note',box:[80,18,19,15],z:-50},
  eraser: {label:'橡皮',asset:'eraser',box:[19,18,10,10],z:45},
  pencil: {label:'作业本上的铅笔',asset:'pencil',box:[49,9,14,17],z:34},
  sharpener: {label:'粉色卷笔刀',asset:'sharpener',box:[66,12,10,10],z:65},
  pen: {label:'右上粉色笔',asset:'pen',box:[80,1,9,27],z:10},
  'folded-note': {label:'左侧折叠纸',asset:'folded-note',box:[0,24,23,23],z:-45},
  compass: {label:'粉色圆规',asset:'compass',box:[3,51,10,23],z:25},
  'curled-note': {label:'左下弯曲纸页',asset:'curled-note',box:[0,72,20,24],z:65},
  triangle: {label:'三角尺',asset:'triangle',box:[11,70,25,23],z:10},
  'chinese-paper': {label:'语文试卷',asset:'chinese-paper',box:[22,55,57,43],z:95},
  timetable: {label:'课程表',asset:'timetable',box:[9,40,30,33],z:50},
  handbook: {label:'学生手册',asset:'handbook',box:[74,62,25,35],z:65},
  'pen-lower': {label:'试卷旁的粉色笔',asset:'pen',box:[67,33,8,23],z:55}
};
for(const [id,data] of Object.entries(window.SCHOOL_ITEMS)) {
  const node=document.createElement('div');node.className='study-node';node.style.transform=`translateZ(${data.z}px)`;
  const button=document.createElement('button');button.className=`object study-object ${id}`;button.type='button';button.dataset.study='true';button.dataset.full=`assets/school/${data.asset}.webp`;
  button.setAttribute('aria-label',`学习 · ${data.label}`);button.setAttribute('aria-haspopup','dialog');
  const img=document.createElement('img');img.src=button.dataset.full;img.alt=data.label;img.draggable=false;img.decoding='async';
  const artwork=document.createElement('span');artwork.className='study-artwork';
  artwork.append(img);button.append(artwork);
  if(id==='books') {
    // The supplied asset is raster, not a vector source. SVG preserves its exact
    // texture and silhouette while isolating the existing cover for a tiny lift.
    const ns='http://www.w3.org/2000/svg';
    const svg=document.createElementNS(ns,'svg');
    svg.classList.add('book-artwork');svg.setAttribute('viewBox','0 0 1055 1380');
    svg.setAttribute('preserveAspectRatio','xMidYMid meet');svg.setAttribute('aria-hidden','true');
    svg.innerHTML='<defs><clipPath id="study-book-cover"><path d="M 84 160 L 617 1 L 1028 480 L 456 642 Z"/></clipPath></defs><image href="assets/school/books.webp" width="1055" height="1380"/><g class="book-cover"><image href="assets/school/books.webp" width="1055" height="1380" clip-path="url(#study-book-cover)"/></g>';
    // Keep the image as the accessible label and the existing viewer source.
    img.classList.add('book-source');artwork.append(svg);
  }
  const index=Object.keys(window.SCHOOL_ITEMS).indexOf(id);
  button.style.setProperty('--float-period',`${5.5+(index%5)*.45}s`);
  button.style.setProperty('--float-delay',`${-index*.83}s`);
  button.style.setProperty('--study-tilt',`${index%2 ? 1.4 : -1.6}deg`);
  node.append(button);document.getElementById('study-scene').append(node);
}
