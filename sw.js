/* Service Worker：PWA 离线壳 + 题库静态资源缓存。
   题库数据本身由 boot.js 存入 IndexedDB，这里只缓存应用外壳与静态资源，
   使网站/已安装 PWA 在无网络时仍可打开并作答已缓存的题目。 */
const CACHE = "zsb-tiku-v5";
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

  // 导航请求：网络优先，失败回退到缓存的 index.html（SPA 外壳）
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then(function (res) { cachePut(req, res.clone()); return res; })
        .catch(function () { return caches.match("./index.html"); })
    );
    return;
  }

  // 题库数据（questions.json / manifest）走 boot.js 的 IndexedDB 缓存，且带 ?_= 防缓存，
  // 不放进 SW 缓存，避免污染；其余静态资源：缓存优先（stale-while-revalidate）
  if (url.pathname.indexOf("/data/") !== -1) {
    e.respondWith(fetch(req).catch(function () { return Response.error(); }));
    return;
  }
  e.respondWith(
    caches.match(req).then(function (cached) {
      var network = fetch(req).then(function (res) { cachePut(req, res.clone()); return res; }).catch(function () { return cached; });
      return cached || network;
    })
  );
});

function cachePut(req, res) {
  if (!res || res.status !== 200) return;
  caches.open(CACHE).then(function (c) { c.put(req, res); });
}
