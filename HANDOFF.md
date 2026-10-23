# Twin Particles — cómo seguir el proyecto

**App:** https://francosiderides-boop.github.io/twin-particles/
**Repo:** https://github.com/francosiderides-boop/twin-particles (rama `main`; GitHub Pages publica sola cada push)
**Versión actual:** beta 0.54

## Contexto (resumen del chat anterior)
- **Quiénes:** Franco (Android, dueño del proyecto) y Cami, su pareja (iPhone 11). Franco escribe en español rioplatense y espera que cada arreglo se publique de verdad (versión nueva + commit + push), probado, no solo explicado. Pide **gastar pocos tokens**.
- **Concepto:** "Twin Particles": lo que le pasa a uno le tiene que pasar al otro. **Todo cambio tiene que sincronizarse en los dos teléfonos.**
- **Prioridades de Franco:** que la alarma le suene a Cami con el teléfono bloqueado y la app cerrada; que nada se pierda al sincronizar; que los toques vibren y los latidos mantengan la vibración; que la gente **no tenga que configurar el teléfono** (la app pide los permisos una vez, con un toque).
- **Decisión tomada:** seguir con la versión web gratuita (sin App Store / Google Play) y pasar el backend a Firebase. Ya está hecho el paso 1 (Firestore).
- **Decisión pendiente de Franco:** cargar tarjeta para el plan **Blaze** de Firebase (Functions + Storage; en la práctica USD 0 o centavos, pero la alerta de presupuesto no corta el gasto) **o** seguir sin tarjeta usando el Worker de Cloudflare como servidor (repetir la alarma desde ahí; no cubre audios grandes).
- **Sin probar todavía en los teléfonos reales:** beta 0.52 (Firestore). Se probó contra el servidor real simulando a la pareja desde un navegador: señales y tareas llegan en las dos direcciones, se borran al leerse, un tercero no entra.

## Para arrancar en una sesión nueva (otra cuenta o chat)
1. Darle acceso al repo `francosiderides-boop/twin-particles` y pedir: "Leé HANDOFF.md y seguí desde ahí".
2. Toda la app es **un solo archivo: `index.html`** (HTML + CSS + JS adentro de un `(function(){ ... })()`). Se edita directo ahí.
3. Cada cambio:
   - subir `const VERSION='beta X.YY'` dentro de `index.html`;
   - poner el mismo número en `const CACHE='tp-beta-X.YY'` de `sw.js` (si no, los teléfonos siguen con la versión vieja);
   - actualizar la línea `**Versión:**` del README;
   - `git commit` + `git push` a `main`. En 1–2 minutos está en la URL.
   - Revisar sintaxis antes: extraer el `<script>` y correr `node --check`.

## Firebase (desde beta 0.52)
- Proyecto `twin-particles` (plan Spark), Firestore en `southamerica-east1`, Auth anónima (sin borrado automático).
- Ya vinculados, todo viaja por Firestore: `couples/{idA__idB}` (ids de PeerJS ordenados) con `members` (uids), `subs.{uid}` (dirección de avisos) y `vis.{uid}`; mensajes en `couples/{id}/msgs` (`from`, `t`, `d` = el mensaje de siempre). El que recibe lo aplica con `handleMsg` y lo borra. Código: `fbStart`, `fbWrite`, `fbSub`, `fbVis`.
- Reglas en `firestore.rules` (publicadas desde la consola): solo los 2 miembros leen/escriben; un tercero no puede sumarse.
- PeerJS solo para vincularse y como respaldo si Firebase no responde.
- Fotos: comprimidas (1280 px) viajan dentro del mensaje (límite 1 MB por documento).
- Pendiente (requiere plan Blaze): Cloud Functions que manden los push y repitan la alarma desde el servidor; Storage para fotos/audios grandes. Se puede desplegar desde Cloud Shell en la consola de Firebase.

## Arquitectura
- **Transporte:** ya vinculados, `netSend` → `fbWrite` (Firestore). PeerJS (`netConnectToPartner`, `netWire`) solo para vincularse y como respaldo. Todo lo recibido pasa por `handleMsg`.
- **Envío garantizado:** `netSendSure(msg)` → si no hay conexión, guarda en `S.outbox` (se reenvía al reconectar) **y** mete el mensaje dentro del próximo aviso push (`pendSync` / `takeSync`, máx ~2,6 KB). El service worker guarda esos mensajes en IndexedDB `tp-inbox` y la app los aplica al abrir (`drainInbox`). Cada mensaje tiene `mid` y se descarta si llega repetido (`S.seen`).
- **Fotos/audios:** IndexedDB `tp-blobs` (`setBlob`, `loadBlobsFromIDB`), comprimidas con `compressImage` (1280 px). Viajan dentro del mensaje de Firestore (máx. 1 MB por documento; audios largos pueden no pasar).
- **Quién es quién:** `who`/`doneBy` son relativos (`m` = yo, `p` = pareja); al recibir se invierten con `flipW`.
- **Avisos (Web Push):** `ensurePush` (suscribe), `pushPartner(title,body,tag)` → `sendPush` → relay de Cloudflare → servicio push (Apple/Google). El relay agrega `Urgency: high` para alarm/touch/beat/letter.
- **Service worker (`sw.js`):** caché offline, muestra notificaciones, en iPhone **siempre** muestra una por push (si no, Safari corta los avisos), cada repetición de alarma es una notificación nueva con etiqueta única.
- **Alarma (beta 0.54):** el Worker la repite cada 6 s por 3 min (Durable Object `Rep`, `relayRepeat`) aunque el teléfono que la manda se bloquee; se corta con `relayStop` (al contestar, al detenerla o al recibir `alarmResp`). Si el Worker no responde, sigue el respaldo local `alarmRepeat`.
- **Diagnóstico remoto (beta 0.53):** cada teléfono escribe `diag.{uid}` en Firestore (`fbDiag`); "Revisar avisos" muestra el estado del teléfono de la pareja (`diagPartner`).
- **Toques/latidos:** `tap` (cada toque al instante), `beatOn`/`beatOff` (latido en vivo), `felt` (confirmación "le vibró ✓"). En iPhone no hay vibración web: suena un golpe grave (`thump`).
- **Letra a mano:** fuente propia en `localStorage['tp-font']`; se manda a la pareja (`sendMyFont` / `fontset`).
- **Diagnóstico:** Ajustes → "Revisar avisos" (`pushDiag`).

## Relay de avisos (Cloudflare Worker)
- URL: `https://twin-particales-push.francosiderides.workers.dev`
- Código local en `~/twin-particles-worker` (worker.js + wrangler.toml, fuera del repo). Desplegar: `npx wrangler@4 deploy` (ya logueado en la Mac de Franco). **El código no está en el repo porque contiene la clave privada VAPID**; está guardado en la cuenta de Cloudflare. Para verlo/modificarlo, entrar ahí.
- La app le manda `{subscription, payload}` con el header `x-relay-key`; el relay cifra y envía con `TTL` = `payload.ttl` y `Urgency`.

## Límites conocidos (versión web, sin tiendas)
- iPhone: solo recibe avisos si la app se abre desde el ícono de la pantalla de inicio (iOS 16.4+). Con el teléfono en silencio, iOS no hace sonar avisos de apps web. No hay vibración por patrón.
- Android: el patrón de vibración de la notificación lo decide el sistema; el sonido depende del canal de notificación.
- Audios/fotos de más de ~1 MB: necesitan Storage (plan Blaze).
- Para alarma con tono propio y alertas que pasen el modo silencio: app nativa (App Store / Google Play).

## Pendiente (en orden)
1. Que los dos abran y cierren la app (para tomar la beta 0.52) y confirmar que la sincronización por Firestore anda en los teléfonos reales.
2. En los dos: Ajustes → "Revisar avisos" y ver qué sale con ⚠️ en el iPhone (lo más probable: abierta desde Safari y no desde el ícono de inicio).
3. Según lo que decida Franco: Blaze (Cloud Function que mande los push y repita la alarma cada ~6 s hasta `alarmResp`; Storage para audios) o servidor en el Worker de Cloudflare.
4. Más adelante, si quieren alarma con tono propio en iPhone: envolver con Capacitor (app nativa, USD 99/año Apple).
- Ideas: recordatorios con horario para tareas/eventos, aniversarios, modo "llegué bien".
