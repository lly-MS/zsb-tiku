# 打包成手机 APK（Android WebView 工程）

本目录是一个标准 Android Studio 工程，用系统 WebView 加载题库网站（默认 `https://zsb-ele-tiku.cc.cd`），**题库不打包进 APK**——每次启动 App 都会按网站逻辑检查并更新题库（与网页端一致）。

## 已为你生成好的产物（直接用）

- `android/app-release-signed.apk` —— **已签名、可直接安装**的正式版 APK（拷到手机，允许「未知来源」后安装即可）。
- `android/zsbtiku.keystore` —— 签名密钥库（见下方密码）。**保留它**，以后更新 APK 必须用同一个密钥，否则手机无法覆盖安装。

签名信息（重签或更新时用）：
- keystore：`zsbtiku.keystore`
- alias：`zsbtiku`
- keystore 密码 / key 密码：`zsbtiku2026`

## 重新编译（改了代码 / 网址后）

> 环境要求：**JDK 17**（AGP 8.5.2 + Gradle 8.9 不支持 JDK 25），并安装 Android SDK（`platforms;android-34`、`build-tools;34.0.0`）。`local.properties` 里已写 `sdk.dir`，或设置环境变量 `ANDROID_HOME` 指向 SDK 目录。

```bash
cd android
# 直接用已生成的 wrapper 编译（distributionUrl 已指向腾讯镜像，下载快）
./gradlew assembleRelease        # Windows 用 gradlew.bat
# 产物：android/app/build/outputs/apk/release/app-release-unsigned.apk
```

### 签名（把上面的 unsigned 变成可安装）

```bash
# 用自带 keystore 签名（密码见上）
java -jar $ANDROID_HOME/build-tools/34.0.0/lib/apksigner.jar sign \
  --ks zsbtiku.keystore --ks-key-alias zsbtiku \
  --ks-pass pass:zsbtiku2026 --key-pass pass:zsbtiku2026 \
  --out app-release-signed.apk \
  app/build/outputs/apk/release/app-release-unsigned.apk
# 校验
java -jar $ANDROID_HOME/build-tools/34.0.0/lib/apksigner.jar verify app-release-signed.apk
```

## 关于项目路径含中文

AGP 默认拒绝含非 ASCII 字符的工程路径。已在本文件加入 `android.overridePathCheck=true` 允许就地编译。
若仍遇到 aapt2 相关报错，最稳妥是把 `android/` 整个目录复制到**纯英文路径**（如 `D:/tiku_build/android`）再编译。

## 改题库网址 / 本地调试

- 改网址：编辑 `android/app/src/main/res/values/strings.xml` 里的 `app_url`。
- 本地调试：把 `app_url` 改成 `http://电脑局域网IP:8765/`（根目录 `启动刷题网站.bat` 可起本地服务）；模拟器访问电脑本机用 `http://10.0.2.2:8765/`。

## 说明

- `minSdk 21`（Android 5.0），`targetSdk 34`，Java 17。
- 题库数据走网站的「清单比对 + IndexedDB 缓存」机制（见 `assets/js/boot.js`），APK 体积极小、题库更新无需重新发版。
- 无网络时回退到首次联网已缓存的题库（WebView + 站点 Service Worker 提供离线壳）。
