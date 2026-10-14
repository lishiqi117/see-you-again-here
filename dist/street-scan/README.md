# 街道扫描

## 独立 HTML 版本

双击上级目录的「街道扫描-双击打开.html」即可离线使用，无需启动本地服务。文件已内嵌街景、相机模型、脚本与样式，可以单独复制。修改源文件后运行 node street-scan/tools/build-standalone.cjs 重新生成（从上级目录运行）。


双击 `打开街道扫描.cmd` 启动，或打开正在运行的 http://127.0.0.1:43138 。需要本机 Node.js；资源均已包含，可离线运行。

## 当前交互

页面为全屏街景，开始面板、状态提示、绿色分段进度槽和完成弹窗统一采用早期 PC 生活模拟游戏风格的蓝色立体界面。

点击开始后，放大的 Olympus 摄影机背面朝向玩家，固定在画面中央偏下。鼠标调整视角；按住左键扫描正前方中心命中的区域，松开立即停止，不再等待停留计时。已扫描区域统一染成青色，未记录区域始终模糊。

W 沿固定路线前进；A/D 只允许 0.22 个单位的轻微偏移；S 不后退。Esc 暂停后显示「继续记录」。达到 75% 在右上角显示 Goal reached! 和 Finish scan 按钮，保持移动与扫描，可继续到 100%。只有主动点击 Finish scan 才结束。所有界面文字为英文。「查看街景」关闭弹窗并保留结果，「重新记录」清空进度并从路线起点开始。

## 修改配置

`config.js` 管理路线、速度、偏移范围、停留时间、完成阈值和高亮颜色。

路线从红色门框旁 `[9, 2.2, 8]` 到 `[-2.45, 2.2, -14.9]`。`route.js` 支持折线移动；当前 `scanner.js` 的区域生成按直街设计，改成弯路时应重设区域边界。

原资源为高斯点场，当前按 8 个纵向路段 × 左建筑 / 路面 / 右建筑分为 24 个空间区域，不是语义识别。CPU 命中和 GPU 着色使用同样的区域边界。高斯深度是透明层加权估计，稀疏边缘可能略有误差。

`assets/street.sog` 是街景；`scene.html` 为从原页面提取的 SuperSplat / PlayCanvas 引擎；原文件没有修改。`tools/import-scene.cjs` 可重新导入具有同一接入标记的源 HTML。

`assets/camera.glb` 为摄影机，`camera-model.source.js` 负责展示，过滤该模型内无关辅助立方体。替换模型时需调整过滤和方向。`camera-model.js` 是其离线打包版本，在上级目录重新生成：

```sh
node_modules/.bin/esbuild street-scan/camera-model.source.js --bundle --format=esm --target=es2020 --outfile=street-scan/camera-model.js
```

`app.js` 管理输入、鼠标摄影机、深度采样及状态。`style.css` 管理全屏布局。街景半分辨率渲染以减轻开销，进度条和光标保持清晰。刷新会清空本次记录。

## 早期 PC 游戏渲染

`retro-style.js` 将街景改为有限色阶、分段方向光、暖色亮部和冷色暗部。街景渲染分辨率限制为 720 × 480 以内，并关闭 bloom，保留低识别度的轻微模糊；摄影机模块及操作方式不受影响。

这是现有高斯扫描的渲染风格模拟，不是重新建模；没有生成低多边形拓扑、UV 接缝或额外人物。源扫描的拉丝和破损轮廓仍可能可见。要获得干净的低多边形建筑及人物轮廓，需要另外制作或接入网格资源。


## SD 卡奖励与打印

点击 Finish scan 后展示 SD 卡奖励；点击卡片显示 Collect / Back。领取后卡片飞至左上角，进入单向后续流程，不再返回扫描或显示重新记录选项。

向下滚动鼠标滚轮进入米白色打印场景。也可以点击 Scroll to continue，或聚焦 SD 卡后按 Enter。打印机完全出现后，将左上角 SD 卡拖进机器右上角插槽。错误位置松手会回位；正确放入后，卡片保持形状垂直向下滑入，由卡槽边缘逐渐遮挡，完全插入后灯亮，随后从前方出纸口打印长小票，小票只有播放三角形。键盘用户可用 Enter 选中 SD 卡，再按 Enter 插入卡槽。小屏幕支持指针/触摸拖放，减少动态效果设置会缩短动画。

打印机与 SD 卡来自用户提供的 PNG，已内嵌进独立 HTML。动画使用本地 GSAP，无网络请求。运行 node street-scan/tools/build-standalone.cjs 重新打包；当前流程的离线验证脚本为 node street-scan/tools/check-printer.cjs，覆盖转场前输入锁定、错误投放、桌面拖放、键盘、小屏幕、灯光和纸张可见位置。
## 小票播放与街景显现：Portal

渲染仍由 playback-scene.html 中的 SuperSplat / PlayCanvas WebGL 负责，gsplatModifyVS 支持 per-splat position / scale / color 修改。memory-reveal.glsl 实现 portal；splat-reveal-runtime.js 管理参数、模型范围与动画；memory-playback.js 接入原有加载/小票播放流程。源模型不变，重新播放不重新加载模型。

参考 https://github.com/cocolinux0101/dreamcore-experiment/blob/main/js/shaderEffects.js 的 effectType == 7 边界扰动与点尺寸恢复思路。实现是适配当前渲染器的独立 shader：实际点位置压缩到播放开始视角的中央隧道，中央空间保持空洞；同一模型的不同点子集形成错开的 ghost shells。没有新增 UI 圆环、相机缩放或改变 FOV。

默认六秒：0–35% 保持小型 portal，35–65% 开始展开，65–90% 加速撑开，90–100% 缓慢回到原始位置、尺寸、颜色。分段非线性函数在 shader 内控制空间展开，完成时直接跳过所有 portal 修改。原有用户特效开关继续生效。

完整世界 bounds：min [-50.55149,-12.14146,-42.42458]，max [34.54735,38.66377,43.87017]；为避免离群点影响，点分布中位中心约 [-1.51420,1.67480,-6.67404]，到包围盒角点最大半径约 79.54594。

加载完成后父页面及 iframe 都支持：

```js
startPortalReveal();
resetPortalReveal();
startPortalReveal({
 revealDuration:6,
 portalStartSize:0.14,
 portalHoleSize:0.32,
 radialSpeed:1,
 twistStrength:0.45,
 noiseStrength:0.18,
 ghostStrength:0.8,
 borderWidth:0.15,
 borderBrightness:0.7
});
```

参数默认值在 splat-reveal-runtime.js 的 PORTAL_REVEAL_DEFAULTS。duration 旧参数以及 startSplatReveal/resetSplatReveal 旧函数保留兼容。reset 取消并隐藏；重复 start 取消上次播放并重播，完成 Promise 返回 true，取消返回 false。portalStartSize 是初始压缩比例，holeSize 控制隧道空洞，radialSpeed 控制不同空间区域展开的时间差，twistStrength 是旋转强度（弧度），noiseStrength 是世界坐标扰动量，ghostStrength 控制错位层次，borderWidth 控制视角径向边界宽度，borderBrightness 控制局部蓝色边缘亮光。

更新独立 HTML：先 node street-scan/tools/prepare-playback.cjs，再 node street-scan/tools/build-standalone.cjs。检查：tools/check-portal-reveal.cjs（时长、隐藏、重播、取消、终态稳定、相机/资源/控制器保持、键盘移动和鼠标视角），tools/check-playback.cjs（完整离线流程）。
