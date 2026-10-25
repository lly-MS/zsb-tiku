/* 启动加载器：负责「题库链接网站 + 每次启动检查更新」。
   流程：
   1) 先尝试用打包内置的 questions.js（已同步设置 window.QUESTION_BANK）作为兜底；
   2) 拉取题库清单 data/bank-manifest.json，比对本地缓存版本号；
   3) 若清单版本更新（或无缓存），从清单指定的 url 下载最新题库并存入 IndexedDB；
   4) 用（最新的）缓存覆盖 window.QUESTION_BANK；
   5) 注入 assets/js/app.js 真正启动应用；
   6) 注册 Service Worker（PWA 离线壳）。
   离线 / 拉取失败时回退到内置题库，应用始终可用。 */
(function () {
  "use strict";

  var params = new URLSearchParams(location.search);
  var BANK_BASE = params.get("base") || ".";      // 题库基地址（默认同源）
  var LOCAL_ONLY = params.get("local") === "1";   // ?local=1 时跳过远程，直接用内置题库

  /* ---------- IndexedDB 缓存 ---------- */
  var DB_NAME = "zsb-tiku-bank", STORE = "kv", KEY = "bank";
  function idbOpen() {
    return new Promise(function (res, rej) {
      if (!("indexedDB" in window)) { rej(new Error("no-idb")); return; }
      var r = indexedDB.open(DB_NAME, 1);
      r.onupgradeneeded = function () { r.result.createObjectStore(STORE); };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
  }
  function idbGet(k) {
    return idbOpen().then(function (db) {
      return new Promise(function (res, rej) {
        var tx = db.transaction(STORE, "readonly").objectStore(STORE).get(k);
        tx.onsuccess = function () { res(tx.result); };
        tx.onerror = function () { rej(tx.error); };
      });
    });
  }
  function idbSet(k, v) {
    return idbOpen().then(function (db) {
      return new Promise(function (res, rej) {
        var tx = db.transaction(STORE, "readwrite").objectStore(STORE).put(v, k);
        tx.oncomplete = function () { res(); };
        tx.onerror = function () { rej(tx.error); };
      });
    });
  }

  /* ---------- 轻量 toast（复用站点样式） ---------- */
  function toast(msg, type) {
    var wrap = document.getElementById("toastWrap");
    if (!wrap) return;
    var el = document.createElement("div");
    el.className = "toast " + (type || "");
    el.textContent = msg;
    wrap.appendChild(el);
    setTimeout(function () { el.style.opacity = "0"; el.style.transform = "translateY(6px)"; }, 2400);
    setTimeout(function () { if (el.parentNode) el.remove(); }, 2750);
  }

  function registerSW() {
    if (!("serviceWorker" in navigator)) return;
    // 新版本 Service Worker 接管时提示用户（下次打开即用上新版样式/脚本）
    var noticed = false;
    navigator.serviceWorker.addEventListener("controllerchange", function () {
      if (noticed) return;
      noticed = true;
      toast("站点已更新，下次打开生效", "ok");
    });
    try { navigator.serviceWorker.register("sw.js").catch(function () {}); } catch (e) {}
  }

  function launchApp() {
    var s = document.createElement("script");
    s.src = "assets/js/app.js";
    s.onerror = function () {
      toast("应用脚本加载失败，请检查网络后刷新", "no");
    };
    document.head.appendChild(s);
    registerSW();
  }

  /* 离线兜底：若最终没有可用题库，至少用内置 questions.js（若已加载） */
  function fallbackLaunch() {
    if (window.QUESTION_BANK && window.QUESTION_BANK.subjects) launchApp();
    else toast("题库加载失败，请检查网络后刷新页面", "no");
  }

  if (LOCAL_ONLY) { launchApp(); return; }

  (async function () {
    try {
      var manifest = await fetch(BANK_BASE + "/data/bank-manifest.json?_=" + Date.now(), { cache: "no-store" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; });

      var cached = await idbGet(KEY).catch(function () { return null; });
      var needUpdate = manifest && manifest.version &&
        (!cached || !cached.data || !cached.version || cached.version < manifest.version);

      if (needUpdate) {
        var data = await fetch(BANK_BASE + "/" + manifest.url + "?_=" + Date.now(), { cache: "no-store" })
          .then(function (r) { return r.ok ? r.json() : null; })
          .catch(function () { return null; });
        if (data) {
          await idbSet(KEY, { version: manifest.version, data: data, updatedAt: manifest.updatedAt })
            .catch(function () {});
          var prev = cached && cached.version;
          if (prev && prev !== manifest.version) {
            toast("题库已更新至 v" + manifest.version, "ok");
          }
        }
      }

      var finalCached = await idbGet(KEY).catch(function () { return null; });
      if (finalCached && finalCached.data) window.QUESTION_BANK = finalCached.data;
    } catch (e) {
      /* 拉取失败：保留内置题库 */
    }
    fallbackLaunch();
  })();
})();
