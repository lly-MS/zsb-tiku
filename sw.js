/* Service Worker：PWA 离线壳 + 题库静态资源缓存。
   题库数据本身由 boot.js 存入 IndexedDB，这里只缓存应用外壳与静态资源，
   使网站/已安装 PWA 在无网络时仍可打开并作答已缓存的题目。

   缓存策略（重要）：
   - 导航请求 / 静态资源（CSS、JS）：网络优先，失败才回退缓存。
     这样站点一发新版本，用户下一次打开即可拿到最新样式与脚本（不会再被旧缓存挡住）。
   - 题库数据（/data/）：不走 SW 缓存，由 boot.js 的 IndexedDB + ?_= 防缓存参数负责。
   缓存名带版本号：改动 SHELL 或策略时务必 +1，旧缓存会在 activate 时被清理。 */
const CACHE = "zsb-tiku-v6";
const SHELL = [
  "./index.html",
  "./manifest.webmanifest",
  "./assets/css/style.css",
  "./assets/css/katex.min.css",
  "./assets/js/app.js",
  "./assets/js/boot.js",
  "./assets/js/marked.min.js",
  "./assets/js/katex.min.js",
  "./assets/js/auto-render.min.js",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png"
];

self.addEventListener("install", function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).catch(function () {}));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { if (k !== CACHE) return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // 题库数据：不进 SW 缓存（boot.js 的 IndexedDB 负责，且带 ?_= 防缓存）
  if (url.pathname.indexOf("/data/") !== -1) {
    e.respondWith(fetch(req).catch(function () { return Response.error(); }));
    return;
  }

  // 导航请求与静态资源：网络优先，离线/失败时回退缓存
  e.respondWith(
    fetch(req).then(function (res) {
      cachePut(req, res.clone());
      return res;
    }).catch(function () {
      if (req.mode === "navigate") return caches.match("./index.html");
      return caches.match(req);
    })
  );
});

function cachePut(req, res) {
  if (!res || res.status !== 200) return;
  caches.open(CACHE).then(function (c) { c.put(req, res); });
}
