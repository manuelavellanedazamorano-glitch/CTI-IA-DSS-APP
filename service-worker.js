const CACHE='cti-v9-ahp-protegido';
const ASSETS=['./','./index.html','./styles.css','./app.js','./app_data.js','./logo.png','./icon-192.png','./icon-512.png','./manifest.webmanifest','./CTI_IA_DSS_100_CASOS_RESUELTOS.json','./CTI_IA_DSS_100_HISTORICO_VALIDADO.json'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',e=>{e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));});
