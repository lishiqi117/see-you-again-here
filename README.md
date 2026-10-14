# 记忆街道 · 网站上传包

`dist/` 包含网站页面、代码、图片、三维模型、视频、背景音乐和音效。无需安装依赖或重新构建，即可作为静态网站发布。保留完整目录结构，不要只上传 index.html。

## 上传 GitHub 并获得公开链接

1. 解压此压缩包，新建一个 GitHub 仓库（建议 Public）。
2. 将解压后的全部内容上传到仓库根目录，包括 `dist/` 和 `.github/` 文件夹。不要把 ZIP 本身当作网站上传。
3. 仓库中打开 **Settings → Pages → Build and deployment → Source**，选择 **GitHub Actions**。
4. 打开 **Actions → Deploy website → Run workflow**，选择你的默认分支后运行。
5. 部署成功后，Pages 页面会显示公开链接。通常为 `https://你的用户名.github.io/仓库名/`，以 GitHub 实际显示的地址为准。

文件较多，可以使用 GitHub Desktop 上传整个文件夹；网页上传时可分批添加，目录位置必须保持不变。包内的自动发布流程支持主分支 main 或 master。

## 本地预览

如果电脑已安装 Python，可在此文件夹打开终端运行：

```sh
python -m http.server 8000 --directory dist
```

浏览器打开 `http://localhost:8000/`。这是面向 HTTP/HTTPS 的发布包，请通过本地服务器预览。

## 内容与大文件

- 已包含本次添加的全部音效和 30% 音量的循环 BGM。
- 大型高斯场景数据分成多个文件，由 `shared-assets/fetch-chunks.js` 自动读取并合并。不要遗漏 `.part0` 等文件。
- 可编辑的页面、样式、脚本和 `.source.js` 同样保留在 dist 中；页面实际运行使用已经构建的脚本。
- 测试截图、浏览器缓存、旧压缩包和 node_modules 不包含在此包中。
- 首次打开三维场景需要下载较多资源，建议使用电脑和稳定网络。
- 浏览器可能需要用户首次点击页面后才允许有声播放。

GitHub 官方发布说明：https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
