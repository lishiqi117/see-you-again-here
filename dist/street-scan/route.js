export class ConstrainedRoute {
 constructor(points,speed,maxOffset){
  if(points.length<2)throw Error('Route needs at least two points');
  this.points=points;this.speed=speed;this.maxOffset=maxOffset;this.distance=0;this.offset=0;
  this.lengths=points.slice(1).map((p,i)=>Math.hypot(...p.map((n,k)=>n-points[i][k])));
  if(this.lengths.some(n=>n<=0))throw Error('Route points must be distinct');
  this.length=this.lengths.reduce((a,b)=>a+b,0);
 }
 update(dt,keys){
  // S and ArrowDown never change distance. Travel is forward only.
  if(keys.has('KeyW'))this.distance=Math.min(this.length,this.distance+this.speed*dt);
  const target=((keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0))*this.maxOffset;
  this.offset+=(target-this.offset)*(1-Math.exp(-8*dt));return this.pose();
 }
 pose(distance=this.distance){
  let remaining=Math.max(0,Math.min(this.length,distance)),i=0;
  while(i<this.lengths.length-1&&remaining>this.lengths[i])remaining-=this.lengths[i++];
  const a=this.points[i],b=this.points[i+1],t=remaining/this.lengths[i];
  const direction=b.map((v,k)=>(v-a[k])/this.lengths[i]),h=Math.hypot(direction[0],direction[2]);
  const right=[-direction[2]/h,0,direction[0]/h];
  return {position:a.map((v,k)=>v+(b[k]-v)*t+right[k]*this.offset),direction,right};
 }
 reset(){this.distance=0;this.offset=0;}
}
