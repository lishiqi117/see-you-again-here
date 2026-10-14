import React from 'react';
import {CAT_PRECISE as CAT,TAIL_PRECISE as TAIL,WHISKERS_PRECISE as WHISKERS,STARS,PLANETS,CLOUD_REGIONS} from '../artwork';
export const cfg = window.DREAM_CONFIG;
export function Original(props){return <image href={cfg.assets.reference} width="1672" height="941" {...props}/>;}
export function Svg({children,viewBox='0 0 1672 941',...props}){return <svg className="artwork" viewBox={viewBox} xmlns="http://www.w3.org/2000/svg" {...props}>{children}</svg>;}
export function Definitions(){return <svg className="definitions" aria-hidden="true"><defs>
 <path id="cat-outline" d={CAT}/><path id="tail-outline" d={TAIL}/>
 <mask id="cat-clip" maskUnits="userSpaceOnUse" x="520" y="440" width="290" height="315"><use href="#cat-outline" fill="white" stroke="white" strokeWidth="2.4" strokeLinejoin="round"/></mask>
 <mask id="tail-clip" maskUnits="userSpaceOnUse" x="520" y="440" width="290" height="315"><use href="#tail-outline" fill="white" stroke="white" strokeWidth="2.4" strokeLinejoin="round"/></mask>
 <linearGradient id="tail-join" gradientUnits="userSpaceOnUse" x1="0" y1="567" x2="0" y2="599"><stop offset="0" stopColor="white"/><stop offset="1" stopColor="black"/></linearGradient>
 <mask id="tail-fade" maskUnits="userSpaceOnUse" x="520" y="440" width="290" height="315"><rect x="520" y="440" width="290" height="315" fill="url(#tail-join)"/></mask>
 <clipPath id="tail-body-cut"><rect x="520" y="440" width="120" height="127"/></clipPath>
 <mask id="whisker-clip" maskUnits="userSpaceOnUse" x="650" y="485" width="160" height="60"><path d={WHISKERS} fill="none" stroke="white" strokeWidth="3.4" strokeLinecap="round"/></mask>
 <filter id="patch-soft" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="2"/></filter>
 <filter id="seam-underpaint" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB"><feMorphology operator="dilate" radius="3"/><feGaussianBlur stdDeviation="1.5"/></filter>
 <filter id="yellow-cutout" x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  3 3 -6 0 -0.85"/></filter>
 <filter id="portal-soft" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="7"/></filter>
 <mask id="cloud-content" maskUnits="userSpaceOnUse" x="0" y="0" width="1672" height="941"><rect width="1672" height="941" fill="white"/><path d={CLOUD_REGIONS.far} fill="black" filter="url(#portal-soft)"/></mask>
 <mask id="original-clean" maskUnits="userSpaceOnUse" x="0" y="0" width="1672" height="941">
  <rect width="1672" height="941" fill="white"/>
  <g fill="black" stroke="black" strokeWidth="7" filter="url(#patch-soft)">
   <use href="#cat-outline"/><path d={WHISKERS} fill="none" strokeWidth="9"/>
   <circle cx="1002" cy="316" r="65"/>
   {PLANETS.map(p=><ellipse key={p.id} cx={p.x} cy={p.y} rx={p.rx} ry={p.ry}/>)}
   {STARS.map(s=><polygon key={s.id} points={s.points} strokeWidth={s.size==='large'?28:10}/>)}
  </g>
 </mask>
 <mask id="body-without-tail" maskUnits="userSpaceOnUse" x="520" y="440" width="290" height="315"><use href="#cat-outline" fill="white" stroke="white" strokeWidth="2.4" strokeLinejoin="round"/><g clipPath="url(#tail-body-cut)"><use href="#tail-outline" fill="black" stroke="black" strokeWidth="3"/></g></mask>
 <mask id="fur-edge" maskUnits="userSpaceOnUse" x="520" y="440" width="290" height="315"><use href="#cat-outline" fill="none" stroke="white" strokeWidth={cfg.cat.fur.edgeWidth*2}/></mask>
 <filter id="cat-fur" filterUnits="userSpaceOnUse" x="522" y="442" width="287" height="310" colorInterpolationFilters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency={cfg.cat.fur.frequencyMin} numOctaves="2" seed="12" result="wind"/>
  <feMorphology in="SourceAlpha" operator="erode" radius={cfg.cat.fur.edgeWidth} result="stable-core"/>
  <feDisplacementMap in="SourceGraphic" in2="wind" scale={cfg.cat.fur.scale*cfg.intensity} xChannelSelector="R" yChannelSelector="G" result="wind-shape"/>
  <feComposite in="wind-shape" in2="stable-core" operator="out" result="moving-edge"/>
  <feComposite in="SourceGraphic" in2="stable-core" operator="in" result="stable-body"/>
  <feMerge><feMergeNode in="moving-edge"/><feMergeNode in="stable-body"/></feMerge>
 </filter>
 <g id="clean-art"><image href={cfg.assets.cleanPlate} width="1672" height="941"/><Original mask="url(#original-clean)"/></g>
 </defs></svg>;}
export function CleanArt(){return <use href="#clean-art"/>;}
export function Layer({name,depth,children}){return <div className={`layer layer-${name}`} data-layer={name}><div className="parallax" data-depth={depth}><div className="motion" data-motion={name}>{children}</div></div></div>;}
