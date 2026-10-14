# 窗台小猫开场动画

双击 index.html 直接预览，无须安装。约 12 秒加载，两猫轮流拍球，满格后橘猫将球拍向镜头，最终保持黑屏。右下角可重新播放、暂停。

背景、两猫和猫爪使用提供的原始透明素材；20 格进度填入原图窗台。手机竖屏采用居中裁切，保持猫、窗台和进度条的对应位置。

接入网站：引入 gsap.min.js、loader.css、loader.js，再创建：

```js
const loader = new CatLoader({
  assetBase: './cat-loading/assets/',
  onComplete(instance) {
    // 此时已经全黑；先显示网站下一幕，再移除遮罩。
    showNextScene();
    instance.destroy();
  }
});
await loader.ready;
// 根据实际资源完成数量调用，100 后等球返回再拍向镜头。
loader.setProgress(loaded / total * 100);
```

预览页的 demo:true 为演示进度；实际使用请用 setProgress 接入真实加载。动画支持减少动态效果偏好。使用 destroy() 清理。

黑球使用内置 imagegen 生成，保存于 assets/ball.png。生成提示词：One black cat toy ball, early The Sims 2 / Sims 3 low-poly 3D game aesthetic, slightly faceted matte charcoal rubber sphere, warm amber upper-left sunlight, subtle highlight, transparent background, isolated centered sphere, no floor, no shadow, no text or logos.
