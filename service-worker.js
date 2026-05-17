const CACHE_NAME = 'cti-ia-dss-v12-metodologia';
const ASSETS = [
  './',
  'index.html',
  'styles.css',
  'app.js',
  'app_data.js',
  'manifest.webmanifest',
  'logo.png',
  'icon-192.png',
  'icon-512.png',
  'CTI_IA_DSS_100_CASOS_RESUELTOS.json',
  'CTI_IA_DSS_100_HISTORICO_VALIDADO.json'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', event => {
  event.respondWith(caches.match(event.request).then(resp => resp || fetch(event.request)));
});
