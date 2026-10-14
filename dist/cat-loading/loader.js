/* Standalone reusable loader. GSAP must be loaded before this file. */
(() => {
  'use strict';
  class CatLoader {
    constructor(options = {}) {
      this.options=options;this.progress=0;this.finishing=false;this.destroyed=false;this.paused=false;this.animations=[];
      this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
      const base=options.assetBase || './cat-loading/assets/';
      this.root=document.createElement('section');
      this.root.className='cat-loader';this.root.setAttribute('aria-label','小猫正在窗台上等你');
      this.root.innerHTML=`<div class="cat-loader-stage">
        <img class="cat-loader-backdrop" src="${base}background.jpg" alt="阳光洒在砖墙和窗台上">
        <div class="cat-loader-ground-shadow"></div>
        <div class="cat-loader-cat cat-loader-ginger"><img class="cat-loader-body" src="${base}ginger.png" alt="橘猫"><img class="cat-loader-paw" src="${base}ginger-paw.png" alt=""></div>
        <div class="cat-loader-cat cat-loader-tuxedo"><img class="cat-loader-body" src="${base}tuxedo.png" alt="黑白猫"><img class="cat-loader-paw" src="${base}tuxedo-paw.png" alt=""></div>
        <div class="cat-loader-ball-shadow"></div><div class="cat-loader-ball"><img src="${base}ball.png" alt="黑色玩具球"></div>
        <div class="cat-loader-progress" role="progressbar" aria-label="载入进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">${'<i class="cat-loader-segment"></i>'.repeat(20)}</div>
        <div class="cat-loader-caption"><span>Loading</span><output>0%</output></div>
        </div><div class="cat-loader-blackout"></div><span class="cat-loader-status" role="status"></span>`;
      (options.container || document.body).append(this.root);
      this.$=selector=>this.root.querySelector(selector);
      this.stage=this.$('.cat-loader-stage');this.ball=this.$('.cat-loader-ball');this.shadow=this.$('.cat-loader-ball-shadow');
      this.orange=this.$('.cat-loader-ginger');this.black=this.$('.cat-loader-tuxedo');this.paws=[this.orange.lastElementChild,this.black.lastElementChild];
      this.resize=()=>{this.scale=Math.max(innerWidth/1668,innerHeight/943);this.stage.style.transform=`translate(-50%,-50%) scale(${this.scale})`;};
      this.resize();window.addEventListener('resize',this.resize);
      gsap.set(this.ball,{x:795,y:520});gsap.set(this.shadow,{x:797});
      this.ready=Promise.all([...this.root.querySelectorAll('img')].map(img=>img.decode().catch(()=>{throw new Error('无法读取素材：'+img.src)}))).then(()=>{
        if(this.destroyed)return;
        this.startLoop();
        if(options.demo){const value={p:0};this.demo=gsap.to(value,{p:100,duration:this.reduced?1.2:9.4,ease:'none',onUpdate:()=>this.setProgress(value.p)});this.animations.push(this.demo);if(this.paused)this.demo.pause();}
        if(this.progress===100)this.finish();
      }).catch(error=>{this.$('.cat-loader-status').textContent='素材载入失败，请刷新重试';console.error(error)});
    }
    startLoop(){
      if(this.reduced)return;
      this.loop=gsap.timeline({repeat:-1,onRepeat:()=>{if(this.progress===100)this.finish()}});
      // Start each pass at the paw, then release the ball at the contact frame.
      const pass=(paw,cat,from,to,time,sign)=>{
        this.loop.to(paw,{rotation:sign*20,duration:.3,ease:'sine.inOut'},time)
          .to(cat,{rotation:sign*-1.1,duration:.3,ease:'sine.inOut'},time)
          .to(paw,{rotation:sign*-17,duration:.17,ease:'power2.in'},time+.3)
          .to(cat,{rotation:sign*.8,duration:.2},time+.3)
          .to(this.ball,{x:to,rotation:sign*265,duration:1.03,ease:'power1.out'},time+.43)
          .to(this.shadow,{x:to+2,duration:1.03,ease:'power1.out'},time+.43)
          .to(this.ball,{y:517,duration:.15,ease:'sine.out'},time+.43)
          .to(this.ball,{y:520,duration:.25,ease:'bounce.out'},time+.58)
          .to(paw,{rotation:0,duration:.44,ease:'sine.inOut'},time+.5)
          .to(cat,{rotation:0,duration:.5,ease:'sine.inOut'},time+.5);
      };
      pass(this.paws[0],this.orange,795,865,0,1);
      pass(this.paws[1],this.black,865,795,1.65,-1);
      this.loop.to({}, {duration:.19});this.animations.push(this.loop);
      if(this.paused)this.loop.pause();
    }
    setProgress(value){
      if(this.destroyed||this.finishing)return;
      const n=Number(value);if(!Number.isFinite(n))return;
      this.progress=Math.max(this.progress,Math.min(100,Math.max(0,n)));
      const count=Math.floor(this.progress/5);
      this.root.querySelectorAll('.cat-loader-segment').forEach((el,i)=>el.style.setProperty('--lit',i<count?'1':'0'));
      this.$('output').textContent=Math.floor(this.progress)+'%';this.$('[role=progressbar]').setAttribute('aria-valuenow',Math.floor(this.progress));
      // Finish at the next returned ball, never cut across a pass mid-flight.
      if(this.progress===100 && (!this.loop||this.reduced))this.ready.then(()=>this.finish());
    }
    finish(){
      if(this.finishing||this.destroyed)return;this.finishing=true;if(this.loop)this.loop.pause();
      this.outro=gsap.timeline({onComplete:()=>{
        this.$('.cat-loader-status').textContent='载入完成';
        this.root.dispatchEvent(new CustomEvent('catloader:complete',{bubbles:true}));
        this.options.onComplete?.(this);
      }});
      if(this.reduced){this.outro.to(this.$('.cat-loader-blackout'),{opacity:1,duration:.25});}
      else{
        gsap.set(this.ball,{x:795,y:520,rotation:0});gsap.set(this.shadow,{x:797});
        this.outro.to(this.paws[0],{rotation:31,duration:.42,ease:'power2.inOut'},0)
          .to(this.orange,{rotation:-2.2,duration:.42},0)
          .to(this.paws[0],{rotation:-38,duration:.2,ease:'power3.in'},.48)
          .to(this.orange,{rotation:2,duration:.2},.48)
          .to(this.ball,{x:820.5,y:458,scale:2.4,rotation:95,duration:.35,ease:'power1.out'},.62)
          .to(this.shadow,{opacity:0,scale:.3,duration:.25},.62)
          .to(this.ball,{scale:100,rotation:175,duration:.78,ease:'power3.in'},.97)
          .to(this.ball,{filter:'brightness(0)',duration:.4,ease:'power2.in'},1.24)
          .to(this.paws[0],{rotation:0,duration:.5},.8)
          .to(this.orange,{rotation:0,duration:.5},.8)
          .set(this.$('.cat-loader-blackout'),{opacity:1},1.73)
          .to({}, {duration:.2});
      }
      this.animations.push(this.outro);if(this.paused)this.outro.pause();
    }
    togglePause(){this.paused=!this.paused;for(const anim of this.animations){if(anim===this.loop&&this.finishing)continue;anim.paused(this.paused)}}
    destroy(){this.destroyed=true;this.animations.forEach(anim=>anim.kill());window.removeEventListener('resize',this.resize);this.root.remove()}
  }
  window.CatLoader=CatLoader;
})();
