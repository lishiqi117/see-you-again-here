import React from 'react';
import {Svg,Original,cfg} from './Artwork';
export default function Star({star:s}){
 const pad=s.r*1.4,x=s.x-pad,y=s.y-pad,size=pad*2;
 return <div className="object star" data-star={s.size} data-seed={s.id} style={{left:x,top:y,width:size,height:size,filter:s.size==='large'?`blur(${cfg.stars.foregroundBlur}px)`:undefined}}>
 <Svg viewBox={`${x} ${y} ${size} ${size}`}><defs><mask id={`star-${s.id}`} maskUnits="userSpaceOnUse" x={x} y={y} width={size} height={size}><polygon points={s.points} fill="white" stroke="white" strokeWidth={s.size==='large'?28:8}/></mask></defs><g mask={`url(#star-${s.id})`}><Original filter="url(#yellow-cutout)"/></g></Svg></div>;
}
