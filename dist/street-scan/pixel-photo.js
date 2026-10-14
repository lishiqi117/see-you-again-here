// All three scene layers are reduced together; the frame and clock stay crisp.
export function createPhotoPrinter(frameURL) {
 const frame=new Image();frame.src=frameURL;
 const ready=frame.decode();ready.catch(()=>{});
 const pad=n=>String(n).padStart(2,'0');
 const timestamp=d=>`${d.getFullYear()}.${pad(d.getMonth()+1)}.${pad(d.getDate())}  ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
 function clock(ctx,text,x,y){
  const digits={0:'1111110',1:'0110000',2:'1101101',3:'1111001',4:'0110011',5:'1011011',6:'1011111',7:'1110000',8:'1111111',9:'1111011'};
  const bars=[[3,0,14,3],[17,3,3,12],[17,18,3,12],[3,30,14,3],[0,18,3,12],[0,3,3,12],[3,15,14,3]];
  ctx.save();ctx.translate(x,y);ctx.transform(1,0,-.10,1,0,0);ctx.fillStyle='#a56228';
  for(const char of text){if(digits[char]){bars.forEach((r,i)=>{if(digits[char][i]==='1')ctx.fillRect(...r)});ctx.translate(27,0)}else if(char===':'){ctx.fillRect(2,9,3,3);ctx.fillRect(2,23,3,3);ctx.translate(12,0)}else if(char==='.'){ctx.fillRect(1,30,3,3);ctx.translate(11,0)}else ctx.translate(15,0)}ctx.restore();
 }
 return {ready,print(layers,date){
  const out=document.createElement('canvas');out.width=1440;out.height=1086;
  const ctx=out.getContext('2d');ctx.fillStyle='#efe7d7';ctx.fillRect(20,20,1400,1046);
  const small=document.createElement('canvas');small.width=256;small.height=166;
  const px=small.getContext('2d',{willReadFrequently:true});px.fillStyle='#252227';px.fillRect(0,0,256,166);
  for(const layer of layers){const ratio=256/166,sourceRatio=layer.width/layer.height;let sw=layer.width,sh=layer.height;if(sourceRatio>ratio)sw=sh*ratio;else sh=sw/ratio;px.drawImage(layer,(layer.width-sw)/2,(layer.height-sh)/2,sw,sh,0,0,256,166)}
  const pixels=px.getImageData(0,0,256,166),bayer=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
  for(let i=0;i<pixels.data.length;i+=4){const d=pixels.data,luma=d[i]*.299+d[i+1]*.587+d[i+2]*.114;const x=(i/4)%256,y=Math.floor(i/4/256);const bias=(bayer[(y%4)*4+x%4]-7.5)*.7;for(let c=0;c<3;c++){const value=luma+(d[i+c]-luma)*1.15;d[i+c]=Math.max(0,Math.min(255,Math.round(((value-128)*1.06+128+bias)/17)*17));}}
  px.putImageData(pixels,0,0);ctx.imageSmoothingEnabled=false;ctx.drawImage(small,84,76,1272,830);
  ctx.drawImage(frame,0,0,1440,1086);
  // Replace the reference's sample date with blank paper from the same frame.
  ctx.drawImage(frame,600,946,650,83,88,946,650,83);
  clock(ctx,timestamp(date),104,966);
  return {image:out.toDataURL('image/png'),timestamp:timestamp(date)};
 }};
}
