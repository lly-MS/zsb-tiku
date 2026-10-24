# 专升本刷题 · 题库网站

专升本（广东普通专升本 / 3+2）备考刷题 Web App，含**高等数学、英语、政治理论、电子技术基础**四科真题与模拟题库，支持练习、模拟考试、错题本、学习进度，可安装到手机（PWA / Android APK），并支持**启动时自动检查题库更新**。

## 功能
- **四科题库**：练习模式（按章节/题型筛选、答题卡、上一组/下一组）、模拟考试（计时、交卷、评分）、错题本、学习进度统计。
- **分类优化**：单选题统一显示为「选择题」；英语按**题型**（阅读理解 / 词汇与语法 / 完形填空 / 语法填空 / 七选五 / 应用文写作）分类，且仅英语去掉「章节」分类。
- **启动更新**：每次打开自动拉取 `data/bank-manifest.json` 比对版本，有新版则下载最新题库存入 IndexedDB，离线时回退内置题库。
- **PWA**：可「添加到主屏幕」离线使用。
- **Android APK**：`android/` 为 Java WebView 工程，加载线上题库站点，自动获得更新能力（见 `android/BUILD.md`）。

## 本地运行（纯静态站）
直接用任意静态服务器打开即可，例如：
```bash
# 在项目根目录
python3 -m http.server 8080
# 浏览器访问 http://localhost:8080
```
无需构建步骤。`data/questions.js` 为内置兜底题库；线上版本以 `data/questions.json` + `data/bank-manifest.json` 为准。

## 更新题库（站点会自动生效）
1. 修改 `data/questions.json`（题目数据）。
2. 把 `data/questions.json` 重新生成 `data/questions.js`（`window.QUESTION_BANK = ...;`）。
3. `data/bank-manifest.json` 中 `version` +1，并更新 `count` / `updatedAt`。
4. 部署站点（Vercel / GitHub Pages / 任意静态托管）。用户端下次打开即提示「题库已更新至 vX」。

## 线上地址

| 平台 | 地址 | 说明 |
| --- | --- | --- |
| GitHub Pages | **https://lly-ms.github.io/zsb-tiku/** | 本仓库 main 分支自动构建 |
| Vercel（生产） | https://zsb-ele-tiku.cc.cd | `vercel --prod --yes` 部署 |

两个站点内容一致，均为相对路径部署；APK 内加载的是 Vercel 域名。

## 部署
- **GitHub Pages**：已开启，源为 `main` 分支根目录（仓库含 `.nojekyll`，跳过 Jekyll 构建）。推送到 `main` 后约 1 分钟自动生效。
- **Vercel**：`vercel --prod --yes`（见 `.vercelignore`）。

> 注：若在受限网络下 `git push` / SSH 无法连接 `github.com`，可改用 GitHub REST API（Git Data API：blob → tree → commit → 更新 ref）上传，等效于一次提交。

## 目录结构
```
index.html              入口
assets/js/app.js        应用主逻辑
assets/js/boot.js       启动加载 + 题库更新检查 + PWA 注册
sw.js                   Service Worker（离线壳）
data/questions.json     题库数据（权威）
data/questions.js       内置兜底题库（window.QUESTION_BANK）
data/bank-manifest.json 题库版本清单
assets/icons/           PWA 图标
android/                Android WebView 工程与构建说明
```

## 说明
题库内容整理自本地学习资料，仅用于个人备考练习。
