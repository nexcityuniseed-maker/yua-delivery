// YUA Delivery Service Worker
// 静的アセットをキャッシュして、オフラインでもUIが起動できるようにする
// GAS API（script.google.com）はキャッシュ対象外（常にネットワーク）

const CACHE_VERSION = 'v3';
const CACHE_NAME = `yua-delivery-${CACHE_VERSION}`;

// プリキャッシュ対象（インストール時に取得）
const PRECACHE_URLS = [
  './',
  './index.html',
  './driver.html',
  './import.html',
  './route.html',
  './shops.html',
  './history.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

// インストール: プリキャッシュ
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// アクティベート: 旧キャッシュ削除
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// fetch: API以外はキャッシュ優先 → ネット失敗時はキャッシュ
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // 外部ドメイン（GAS, Google Maps等）はSW介入しない
  if (url.origin !== self.location.origin) return;

  // HTML はネットワーク優先（更新を反映しやすく）、失敗時キャッシュ
  if (req.headers.get('accept') && req.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // それ以外（画像、manifest、JSなど）はキャッシュ優先
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        }
        return res;
      });
    })
  );
});

// メッセージ: 強制更新コマンド
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
