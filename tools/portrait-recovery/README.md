# 照片转场兼容性与恢复测试

本次范围：档案照片视频 → 黄色转场 → 真实 3D 星球。没有改动模型、贴图、3D 渲染质量或其他章节。未部署线上。测试环境是 Windows + Edge（Chromium），不是 macOS Chrome；Mac 兼容性仍需实机确认。

## 编码检查

|文件|H.264 Profile|像素格式|分辨率/帧率|关键帧|B 帧|文件大小|
|---|---|---|---|---|---|---|
|portrait-scrub.mp4|High 4:4:4 Predictive（avc1.f40032）|yuv420p|1920×1080 / 24 fps|每 6 帧|0|9,529,299 字节|
|portrait-transition.mp4|Main|yuv420p|1920×1080 / 24 fps|122 帧仅第 0 帧为关键帧|0|3,872,589 字节|
|portrait-compatible.mp4（新增）|High|yuv420p|1920×1080 / 24 fps|每 6 帧（0.25 秒）|0|4,866,078 字节|

三个视频流均为 122 帧、5.083333 秒。原始备用视频和兼容版的容器时长均为 5.085170 秒（复制原音轨）；scrub 容器为 5.083333 秒。High 4:4:4 是当前编码 Profile，不代表当前视频的像素格式为 4:4:4。

Chromium 的 [macOS VideoToolbox 实现](https://chromium.googlesource.com/chromium/src/+/HEAD/media/gpu/mac/video_toolbox_video_decoder.cc)声明 H.264 支持范围的上限为 High，High 4:4:4 Predictive 不在这个硬件解码范围内。这构成兼容性风险，不能据此断言所有 Mac 都无法解码；软件解码回退和 Chrome 版本也有影响。原备用视频只有一个关键帧，随机跳到后段通常需要从开头解码。

兼容版从原 portrait-transition.mp4 制作，使用 libx264：`-map 0:v:0 -map 0:a? -c:a copy -c:v libx264 -preset slow -crf 12 -profile:v high -pix_fmt yuv420p -g 6 -keyint_min 6 -sc_threshold 0 -bf 0 -movflags +faststart`。参数说明见 [FFmpeg 官方文档](https://ffmpeg.org/ffmpeg-codecs.html)。未缩放、裁切或改变帧率；全片 SSIM 为 0.999636。它是高保真重编码，并非逐像素无损；原始两个文件均保留。

## 已修复的故障路径

`dist/portrait-transition.js`：

- `seek / completeSeek / checkMedia`：用单个带编号的待完成请求替代自定义 seeking 布尔锁；同时检查原生 seeking、实际时间和就绪状态。连续滚动只更新目标，避免覆盖正在进行的跳帧。即使 seeked 事件遗漏，也只有确认实际帧到达后才解除等待。
- `recover / loadSource`：跳帧 8 秒无进展或加载 20 秒无缓冲进展时，对当前源重试一次，再依次尝试兼容版和原备用视频。重试次数有限；全部失败显示明确的重试按钮。时间阈值只用于检测故障，不用于模拟进度或放行剧情。后台标签页暂停故障计时。
- `preparePortraitScene`：视频和 3D 分别记录日志；3D 错误或原有 120 秒超时均结束 Promise 并允许重试。回调有单次结算和 iframe 身份检查，重试释放旧 iframe，防止旧消息污染新场景。
- `enter / reset`：保留恢复前画面，失败提示在转场中可见；重复进入隔离旧会话，避免过期关闭事件清理新会话。

`dist/site-preload.js` 的 `waitForMedia`：照片视频委托给同一个 `preparePortraitVideo`，避免预加载器再次调用 load() 打断跳帧或回退。其他媒体仍走原逻辑。

代码检查未发现视频与 3D 相互等待的环；之前更直接的风险是 seeked 丢失/迟到后自定义锁无法释放，以及加载失败后的等待和错误恢复。3D 的实际资源或 GPU 问题仍可能独立失败，因此不能用“视频已下载”代表“3D 已就绪”。保留每 1200 像素推进一单位、终点 2.8、原缓动和混合区间；不强行将进度置为 100%。

## 已运行的验证

- 真实首页、真实星球：正常进入、快速正向/反向滚动、关闭后再次进入两次均通过；人为制造默认视频跳帧停滞后，成功切到兼容视频并进入真实星球。
- 故障注入：3D 慢加载、3D 报错后重试、视频请求失败后重试、请求一直挂起、seeked 被拦截、原生 seeking 一直为 true，全部通过；没有未捕获页面异常。挂起下载测试仅加速故障检测时钟，没有伪造媒体就绪。故障测试的 3D 使用模拟 ready/error 消息；真实场景验证由独立 integration 测试覆盖。
- 单次 Windows Edge 本地 12 次随机正反跳帧：原备用平均 51.0 ms / 最大 106.3 ms；现用 scrub 平均 27.6 ms / 最大 40.4 ms；兼容版平均 5.3 ms / 最大 8.8 ms。这不是 Mac 测量，也不是整站 FPS 指标。

## 重复测试

安装 Node.js 和 Playwright（`npm install --no-save playwright`）。本机也支持已有 Codex Playwright 安装。脚本在 `tools/portrait-recovery/`，无需修改正式页面：

1. 在一个终端运行 `node tools/portrait-recovery/server.cjs`，提供本地 8890 端口和视频 Range 请求。
2. 在另一个终端依次运行 `node tools/portrait-recovery/benchmark.cjs`、`node tools/portrait-recovery/integration.cjs`、`node tools/portrait-recovery/failures.cjs`。结果 JSON 和截图写到脚本目录，覆盖上一次结果；已保存的结果来自 Windows Edge。
3. macOS 默认使用系统安装的 Google Chrome。Windows 默认使用 Edge；可通过环境变量 `BROWSER_PATH` 指向 Google Chrome 后重跑。浏览器版本与机器型号请随结果记录。
4. Mac 实机打开本地首页，按原剧情从台灯进入档案，用触控板快滑、反向滑、关闭再进入。开发者工具执行 `portraitDiagnostics.snapshot()` 保存现场状态；`video` 日志和 `scene` 日志分别定位解码与 3D 失败。测试脚本直接打开转场，不代替台灯到档案的人工完整流程。

兼容视频仅作为运行时回退资源，不增加开场必须下载的视频量。发布前须随同新视频、两个 JS、更新后的 precache-manifest.js 一起部署；本次只修改本地文件。新文件存在不能证明 GitHub Pages 已更新。
