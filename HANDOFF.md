# Twin Particles — cómo seguir el proyecto

**App:** https://francosiderides-boop.github.io/twin-particles/
**Repo:** https://github.com/francosiderides-boop/twin-particles (rama `main`; GitHub Pages publica sola cada push)
**Versión actual:** beta 0.51

## Para arrancar en una sesión nueva (otra cuenta o chat)
1. Darle acceso al repo `francosiderides-boop/twin-particles` y pedir: "Leé HANDOFF.md y seguí desde ahí".
2. Toda la app es **un solo archivo: `index.html`** (HTML + CSS + JS adentro de un `(function(){ ... })()`). Se edita directo ahí.
3. Cada cambio:
   - subir `const VERSION='beta X.YY'` dentro de `index.html`;
   - poner el mismo número en `const CACHE='tp-beta-X.YY'` de `sw.js` (si no, los teléfonos siguen con la versión vieja);
   - actualizar la línea `**Versión:**` del README;
   - `git commit` + `git push` a `main`. En 1–2 minutos está en la URL.
   - Revisar sintaxis antes: extraer el `<script>` y correr `node --check`.

## Arquitectura
- **Conexión en vivo:** PeerJS (WebRTC) entre los dos teléfonos (`netConnectToPartner`, `netWire`, `handleMsg`). Reconexión automática al volver a la app / online / cada 15 s.
- **Envío garantizado:** `netSendSure(msg)` → si no hay conexión, guarda en `S.outbox` (se reenvía al reconectar) **y** mete el mensaje dentro del próximo aviso push (`pendSync` / `takeSync`, máx ~2,6 KB). El service worker guarda esos mensajes en IndexedDB `tp-inbox` y la app los aplica al abrir (`drainInbox`). Cada mensaje tiene `mid` y se descarta si llega repetido (`S.seen`).
- **Fotos/audios:** IndexedDB `tp-blobs` (`setBlob`, `loadBlobsFromIDB`), comprimidas con `compressImage`. Solo viajan por conexión en vivo (pesan demasiado para un push).
- **Quién es quién:** `who`/`doneBy` son relativos (`m` = yo, `p` = pareja); al recibir se invierten con `flipW`.
- **Avisos (Web Push):** `ensurePush` (suscribe), `pushPartner(title,body,tag)` → `sendPush` → relay de Cloudflare → servicio push (Apple/Google). El relay agrega `Urgency: high` para alarm/touch/beat/letter.
- **Service worker (`sw.js`):** caché offline, muestra notificaciones, en iPhone **siempre** muestra una por push (si no, Safari corta los avisos), cada repetición de alarma es una notificación nueva con etiqueta única.
- **Alarma:** el que la manda reenvía el push cada 6 s por 3 min (`alarmRepeat`) hasta recibir `alarmResp`; pantalla encendida con Wake Lock mientras tanto.
- **Toques/latidos:** `tap` (cada toque al instante), `beatOn`/`beatOff` (latido en vivo), `felt` (confirmación "le vibró ✓"). En iPhone no hay vibración web: suena un golpe grave (`thump`).
- **Letra a mano:** fuente propia en `localStorage['tp-font']`; se manda a la pareja (`sendMyFont` / `fontset`).
- **Diagnóstico:** Ajustes → "Revisar avisos" (`pushDiag`).

## Relay de avisos (Cloudflare Worker)
- URL: `https://twin-particales-push.francosiderides.workers.dev`
- Se edita desde el panel de Cloudflare (Workers → `twin-particales-push` → Edit code). **El código no está en el repo porque contiene la clave privada VAPID**; está guardado en la cuenta de Cloudflare. Para verlo/modificarlo, entrar ahí.
- La app le manda `{subscription, payload}` con el header `x-relay-key`; el relay cifra y envía con `TTL` = `payload.ttl` y `Urgency`.

## Límites conocidos (versión web, sin tiendas)
- iPhone: solo recibe avisos si la app se abre desde el ícono de la pantalla de inicio (iOS 16.4+). Con el teléfono en silencio, iOS no hace sonar avisos de apps web. No hay vibración por patrón.
- Android: el patrón de vibración de la notificación lo decide el sistema; el sonido depende del canal de notificación.
- Fotos y audios necesitan que las dos apps coincidan abiertas (falta un almacenamiento en la nube para eso).
- Para alarma con tono propio y alertas que pasen el modo silencio: app nativa (App Store / Google Play).

## Pendiente
- Confirmar con "Revisar avisos" en los dos teléfonos por qué al iPhone no le llegan avisos con la app cerrada (lo más probable: abierta desde Safari y no desde el ícono, o la dirección de avisos del iPhone nunca llegó al Android).
- Fotos sin coincidir (almacenamiento en la nube).
- Ideas: recordatorios con horario para tareas/eventos, aniversarios, modo "llegué bien".
