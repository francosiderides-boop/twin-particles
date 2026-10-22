// Twin Particles: abre sin conexión y busca siempre la versión más nueva
const CACHE='tp-beta-0.40';
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
/* notificaciones en segundo plano (Web Push) */
const VIB={
  beat:[25,45,25,45,25,45,25,250,25,45,25,45,25,45,25], // doble latido, como un corazón real
  alarm:[300,120,300,120,300,120,300,120,300],
  letter:[20,60,20,60,80,60,20],
  alarmResp:[15,50,15],
  event:[40,50,40,50,40],
  list:[40,50,40,50,40],
  touch:[18,60,18],
  remind:[30,40,30,40,30]
};
self.addEventListener('push',e=>{
  let d={};try{d=e.data?e.data.json():{}}catch(err){}
  const title=d.title||'Twin Particles';
  const tag=d.tag||'tp';
  e.waitUntil((async()=>{
    // si la app ya está abierta y a la vista, el aviso ya llegó en vivo (con su
    // propia vibración correcta); mostrar también la notificación del sistema
    // solo duplicaría vibración y sonido. La excepción es la alarma: si en ese
    // momento no llegó a conectarse de verdad, es la única forma de que suene.
    if(tag!=='alarm'){
      const cl=await self.clients.matchAll({type:'window',includeUncontrolled:true});
      if(cl.some(c=>c.visibilityState==='visible'))return;
    }
    await self.registration.showNotification(title,{
      body:d.body||'',
      icon:'icon-192.png',
      badge:'icon-192.png',
      tag,
      renotify:true,
      requireInteraction:tag==='alarm',
      vibrate:VIB[tag]||[60,40,60],
      data:{url:d.url||'./'}
    });
  })());
});
/* si el navegador rota la suscripción push sola (pasa cada tanto), hay que
   renovarla; si no, dejan de llegar avisos en 2do plano sin que nadie se
   entere. La app vuelve a mandarle la nueva al otro teléfono la próxima vez
   que se abra (ensurePush ya hace eso siempre). */
self.addEventListener('pushsubscriptionchange',e=>{
  const VAPID='BMzKUgL6etueLcdZg9z7grPb8F01ZjYBNPYk2uL978mFxENeNOALZsX8wjlrUPPtejHd1BuU0arYbZK9i_yGWdM';
  const b64uToBuf=s=>{s=s.replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';const bin=atob(s);const a=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i);return a};
  e.waitUntil(self.registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64uToBuf(VAPID)}).catch(()=>{}));
});
self.addEventListener('notificationclick',e=>{
  e.notification.close();
  const url=(e.notification.data&&e.notification.data.url)||'./';
  const tag=e.notification.tag;
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
    // si la app ya estaba corriendo (solo en 2do plano, no cerrada de verdad),
    // "enfocarla" no le avisa de nada por sí solo: el '#ring' de la URL solo
    // se lee una vez, al arrancar. Para este caso le mandamos un mensaje directo.
    if(tag==='alarm')list.forEach(c=>c.postMessage({type:'ring'}));
    for(const c of list)if('focus' in c)return c.focus();
    if(self.clients.openWindow)return self.clients.openWindow(url);
  }));
});
