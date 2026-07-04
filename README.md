# QitongFlow Web

纯前端静态版审片工具。这个目录可以直接上传 GitHub，也可以直接接 Vercel 部署。

## 当前能力

- 本地导入 MP4 / MOV 视频
- 播放、暂停、音量、倍速
- 时间码显示为 `00:00:00:00`
- 标记开始 / 标记结束
- 快速前后移动 5 秒、1 秒、1 帧
- 添加、编辑、删除、清空修改意见
- 搜索意见
- 上传参考图
- 截取当前视频帧作为参考图
- 自动保存到浏览器本地
- 导入 `.qtf` / `.json`
- 导出 `.qtf`
- 导出给剪辑看的 `.json`

## 重要限制

这个版本是纯前端静态版：

- 不上传视频
- 不需要服务器
- 不需要数据库
- 不支持多人协作
- 换电脑或换浏览器后，本地草稿不会自动同步

视频文件只在用户自己的浏览器本地打开。

## 本地打开

直接双击打开：

```text
index.html
```

或者用任意静态服务器打开。

## 上传 GitHub

如果你要把这个目录作为独立 GitHub 仓库：

1. 新建一个 GitHub 仓库
2. 把 `qitongflow-web` 目录里的所有文件上传进去
3. 仓库根目录应该能看到：

```text
index.html
styles.css
core.js
app.js
vercel.json
README.md
```

## 用 Vercel 部署

1. 打开 [Vercel](https://vercel.com)
2. 用 GitHub 登录
3. `Add New...` → `Project`
4. 选择这个仓库
5. Framework Preset 选择 `Other`
6. Build Command 留空
7. Output Directory 留空
8. 点击 `Deploy`

部署完成后会得到：

```text
https://你的项目名.vercel.app
```

## 自定义域名

在 Vercel 项目里：

1. `Settings`
2. `Domains`
3. 添加你的域名，例如：

```text
review.example.com
```

4. 按 Vercel 提示到域名服务商添加 DNS 记录。

常见二级域名配置：

```text
Type: CNAME
Name: review
Value: cname.vercel-dns.com
```

以 Vercel 后台最终提示为准。

## 开发检查

如果你本地有 Node.js，可以运行：

```bash
node scripts/check-core.js
```

这个检查会验证时间码、项目导入导出和意见排序逻辑。

## 后续升级方向

下一版如果要变成真正的云端工具，可以继续加：

- 登录
- 云端项目保存
- 分享链接
- 视频云存储
- 多人协作
- PDF 导出
