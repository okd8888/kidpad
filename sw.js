/* 極簡 Service Worker：優先走網路（內容永遠最新），沒網路時用快取（離線也能練字）
   筆順資料檔太多，不預先快取，改成用過一次就自動存起來。 */
const CACHE = 'kidpad-v5';
const ASSETS = [
  './', './index.html', './styles.css', './app.js',
  './modules/index.js', './modules/stroke.js', './modules/math.js', './modules/english.js',
  './lib/storage.js', './lib/sound.js', './lib/hanzi-data.js',
  './lib/stars.js', './lib/quiz-ui.js', './lib/speech.js',
  './vendor/hanzi-writer.min.js',
  './manifest.webmanifest', './assets/icon.svg',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
  );
});
