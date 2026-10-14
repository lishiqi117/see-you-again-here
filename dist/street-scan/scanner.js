import {retroGeometryShader} from './retro-style.js';

export class RegionScanner {
 constructor(config,route,material){
  this.config=config;this.material=material;this.regions=[];this.done=new Set();this.target=-1;this.dwell=0;
  // CPU depth picking and GPU coloring use identical oriented spatial boxes.
  for(let section=0;section<config.regions.sections;section++){
   const from=section*route.length/config.regions.sections,to=(section+1)*route.length/config.regions.sections;
   const pose=route.pose((from+to)/2),r=config.regions;
   for(let side=0;side<3;side++)this.regions.push({id:this.regions.length,section,side,center:pose.position,right:pose.right,forward:pose.direction,halfLength:(to-from)/2,
    xmin:side===0?-r.halfWidth:side===2?0:-r.halfWidth,xmax:side===0?0:r.halfWidth,
    ymin:side===1?r.minHeight:r.groundHeight,ymax:side===1?r.groundHeight:r.maxHeight,
    label:`${String(section+1).padStart(2,'0')} / ${['Left buildings','Street surface','Right buildings'][side]}`});
  }this.installShader();
 }
 contains(r,p){const d=[p.x-r.center[0],p.y-r.center[1],p.z-r.center[2]];
  const x=d.reduce((a,v,k)=>a+v*r.right[k],0),z=d.reduce((a,v,k)=>a+v*r.forward[k],0);
  return x>=r.xmin&&x<r.xmax&&Math.abs(z)<r.halfLength&&p.y>=r.ymin&&p.y<r.ymax;
 }
 identify(point){return point?this.regions.findIndex(r=>this.contains(r,point)):-1;}
 update(id,dt){
  if(id!==this.target){this.target=id;this.dwell=0;}
  if(id<0||this.done.has(id)){this.dwell=0;return false;}
  this.dwell+=dt;if(this.dwell>=this.config.dwellSeconds){this.done.add(id);this.material.setParameter(`uScan${id}`,1);this.material.update();this.dwell=0;return true;}return false;
 }
 resetDwell(){this.target=-1;this.dwell=0;}
 reset(){this.done.clear();this.resetDwell();for(const r of this.regions)this.material.setParameter(`uScan${r.id}`,0);this.material.update();}
 get progress(){return this.done.size/this.regions.length;}
 installShader(){
  const f=n=>Number(n).toFixed(6),vec=p=>`vec3(${p.map(f).join(',')})`;
  let code=this.regions.map(r=>`uniform float uScan${r.id};`).join('\n');
  code+='\nfloat recorded(vec3 p){float result=0.0;vec3 d;float x;float z;';
  for(const r of this.regions)code+=`d=p-${vec(r.center)};x=dot(d,${vec(r.right)});z=dot(d,${vec(r.forward)});if(x>=${f(r.xmin)}&&x<${f(r.xmax)}&&abs(z)<${f(r.halfLength)}&&p.y>=${f(r.ymin)}&&p.y<${f(r.ymax)})result=max(result,uScan${r.id});`;
  code+=`return result;}
  ${retroGeometryShader}
  void modifySplatColor(vec3 center,inout vec4 color){float state=recorded(center);vec3 base=retroPigment(color.rgb,center);color.rgb=mix(base,${vec(this.config.highlight)},state);color.a=mix(color.a,min(1.0,color.a*1.3),state);}`;
  this.material.getShaderChunks('glsl').set('gsplatModifyVS',code);this.reset();this.material.update();
 }
}
