// Twin Particles: abre sin conexión y busca siempre la versión más nueva
const CACHE='tp-beta-0.16';
const FILES=['./','index.html','manifest.webmanifest','icon-192.png','icon-512.png','maskable-192.png','maskable-512.png','apple-touch-icon.png','favicon.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))));self.clients.claim()});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  // solo se ocupa de los archivos de la app y de las tipografías; lo demás va directo a internet
  if(u.origin!==location.origin&&!/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname))return;
  const nav=e.request.mode==='navigate'||e.request.url.endsWith('index.html');
  if(nav){e.respondWith(fetch(e.request).then(res=>{const cp=res.clone();caches.open(CACHE).then(c=>c.put('index.html',cp));return res}).catch(()=>caches.match('index.html')));return}
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{
    if(res.ok&&(new URL(e.request.url).origin===location.origin||e.request.url.includes('fonts.g'))){const cp=res.clone();caches.open(CACHE).then(c=>c.put(e.request,cp))}
    return res})));
});
