import React from 'react';
import {Layer,Svg,CleanArt,cfg} from './Artwork';
import {CLOUD_REGIONS} from '../artwork';
export default function CloudLayer({kind}){
 const c=cfg.clouds[kind];
 const order=['far','middle','near','foreground'];
 const above=order.slice(order.indexOf(kind)+1);
 // Feather only the boundary between source regions; texture itself is never displaced.
 return <Layer name={`cloud-${kind}`} depth={kind==='far'?'far':kind==='middle'?'middle':'near'}><Svg style={{filter:`blur(${c.blur}px) contrast(${c.contrast})`}}><defs>
 <filter id={`seam-${kind}`} x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="7"/></filter>
 <mask id={`cloud-${kind}`} maskUnits="userSpaceOnUse" x="0" y="0" width="1672" height="941">
  {kind==='far'?<><rect width="1672" height="941" fill="white"/><path d={CLOUD_REGIONS.far} fill="black" filter={`url(#seam-${kind})`}/></>:<path d={CLOUD_REGIONS[kind]} fill="white" filter={`url(#seam-${kind})`}/>}
  {above.map(name=><path key={name} d={CLOUD_REGIONS[name]} fill="black" filter={`url(#seam-${kind})`}/>)}
 </mask></defs><g mask="url(#cloud-content)"><g mask={`url(#cloud-${kind})`}><CleanArt/></g></g></Svg></Layer>;
}
