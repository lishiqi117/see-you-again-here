import React from 'react';
import {Layer,Svg,Original,cfg} from './Artwork';
export default function FloatingCat(){return <Layer name="cat" depth="cat"><div className="object cat" style={{left:520,top:440,width:290,height:315}}><Svg viewBox="520 440 290 315">
 {cfg.assets.cat?<image href={cfg.assets.cat} x="520" y="440" width="290" height="315"/>:<>
 <g className="cat-surface" filter={cfg.cat.fur.enabled?'url(#cat-fur)':undefined}>
 <Original mask="url(#body-without-tail)"/>
 <g className="tail" style={{transformOrigin:'607px 571px'}}><g mask="url(#tail-fade)"><Original mask="url(#tail-clip)"/></g></g>
 </g>
 <Original mask="url(#whisker-clip)"/>
 </>}
 </Svg></div></Layer>;}
