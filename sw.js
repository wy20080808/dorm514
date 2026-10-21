/* 郑科宿舍社区 · Service Worker
   改完 index.html 并上传后，把下面的 VERSION 数字 +1，手机上的缓存才会更新。 */
const VERSION = "zkdorm-v6";

const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(VERSION)
      .then(cache => Promise.all(ASSETS.map(asset => cache.add(asset).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;

  let url;
  try { url = new URL(req.url); } catch (e) { return; }

  // 跨域请求（Supabase 的数据、图片等）一律不拦截，直接走网络
  if (url.origin !== self.location.origin) return;

  // 页面导航：先走网络，拿不到就用缓存里的首页（离线也能打开）
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(VERSION).then(cache => cache.put("./index.html", copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // 静态资源：缓存优先，没有再走网络
  event.respondWith(
    caches.match(req).then(hit => {
      if (hit) return hit;
      return fetch(req).then(res => {
        const copy = res.clone();
        caches.open(VERSION).then(cache => cache.put(req, copy)).catch(() => {});
        return res;
      });
    })
  );
});
