import React,{useMemo} from 'react';
import {cfg} from './Artwork';
export default function GrainOverlay(){const texture=useMemo(()=>{const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d'),data=ctx.createImageData(128,128);let seed=917;for(let i=0;i<data.data.length;i+=4){seed=(seed*16807)%2147483647;const n=seed%256;data.data.set([n,n,n,255],i);}ctx.putImageData(data,0,0);return c.toDataURL();},[]);return <div className="grain" aria-hidden="true" style={{opacity:cfg.grain.opacity,backgroundImage:`url(${texture})`}}/>;}
