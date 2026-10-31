# Twin Particles — cómo seguir el proyecto

**App:** https://francosiderides-boop.github.io/twin-particles/
**Repo:** https://github.com/francosiderides-boop/twin-particles (rama `main`; GitHub Pages publica sola cada push)
**Versión actual:** beta 0.65

## Contexto (resumen del chat anterior)
- **Quiénes:** Franco (Android, dueño del proyecto) y Cami, su pareja (iPhone 11). Franco escribe en español rioplatense y espera que cada arreglo se publique de verdad (versión nueva + commit + push), probado, no solo explicado. Pide **gastar pocos tokens**.
- **Concepto:** "Twin Particles": lo que le pasa a uno le tiene que pasar al otro. **Todo cambio tiene que sincronizarse en los dos teléfonos.**
- **Prioridades de Franco:** que la alarma le suene a Cami con el teléfono bloqueado y la app cerrada; que nada se pierda al sincronizar; que los toques vibren y los latidos mantengan la vibración; que la gente **no tenga que configurar el teléfono** (la app pide los permisos una vez, con un toque).
- **Decisión tomada:** seguir con la versión web gratuita (sin App Store / Google Play) y pasar el backend a Firebase. Ya está hecho el paso 1 (Firestore).
- **Decisiones:** solo soluciones **gratis** (ni USD 99 de Apple ni tarjeta); sin pedirle a Cami que haga nada en su teléfono; todo tiene que funcionar dentro de Twin Particles. Se usa el Worker de Cloudflare como servidor, no Blaze.
- **Problema abierto:** Cami tiene el iPhone **siempre en silencio**, y la alarma tiene que sonarle bloqueado y con la app cerrada. Gratis no hay solución: la web no puede pasar el silencio y la app nativa requiere cuenta paga.
- **Opciones que Franco ya rechazó:** tono estándar de notificación (no suena en silencio), truco con Atajos + SMS (queda por fuera de la app), "Modo dormir" con audio en loop, cuenta de Apple de USD 99.
- **IPA gratis (AltStore/SideStore) no conviene:** sin push no llega ninguna notificación con la app cerrada, y vence cada 7 días. Solo ganaría alarmas programadas con AlarmKit (sin confirmar que ande con cuenta gratis).
- **Vía para pasar el silencio (beta 0.55):** tras enviar la alarma, un botón abre `icloud.com/find`; Franco entra con el Apple ID de Cami (con su acuerdo) y toca Reproducir sonido. Apple no da API: automatizarlo exigiría guardar sus credenciales en un servidor, descartado. Sin probar en el iPhone real.
- **App nativa gratis descartada:** sin push no recibe la alarma en el momento; las alarmas programadas no sirven para despertarla.
- **Sin probar todavía en los teléfonos reales:** betas 0.52 a 0.54. Se probó contra el servidor real simulando a la pareja desde un navegador: señales y tareas llegan en las dos direcciones, se borran al leerse, un tercero no entra.

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

## Secciones (desde beta 0.58)
Barra inferior: Nosotros (partículas, señales, resumen) · Hogar (Tareas, Compras, Cuentas, Agenda) · Comidas (Recetas, Platos) · Ocio (Para ver, Música) · Recuerdos (Álbumes, Cartas). Mapa en `GROUPS`; `S.tab` guarda la vista interna. El despertador quedó en Ajustes (`V.despertador`).
Datos nuevos en `S.h` y un solo par de mensajes: `hPut`/`hDel` mandan `hset`/`hdel`; al recibir se invierten `by`, `paid` y `mine` (% del gasto que le toca a cada uno). Música: reproductor oficial de Spotify (`open.spotify.com/embed`), sin cuenta de desarrollador: 30 s o tema completo si hay sesión de Spotify en ese navegador; en Android se puede compartir desde Spotify a la app (`share_target`).

## Cuenta y respaldo (desde beta 0.61)
Login obligatorio con Google o mail y contraseña (`showLogin`); teléfono no, porque el SMS pide Blaze. Una cuenta anónima se convierte conservando el uid, así sigue en `couples`. Respaldo en `users/{uid}`: `data/state` y fuentes en partes (`bkPut`/`bkGet`), fotos de a una en `blobs/` (`bkPump`, máx. ~1 MB). Al entrar en un teléfono sin datos se restaura todo (`afterLogin`, `tp-restore`). Probar con el emulador de Firebase, no con cuentas reales.

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

## Pendiente
1. Probar la 0.54 en los teléfonos reales: que Franco vea "Revisar avisos" → "Teléfono de Cami" y le mande una alarma con el iPhone bloqueado.
2. Opcional y gratis: APK de Android para Franco (Capacitor + FCM), con alarma fuerte en pantalla bloqueada. Hay que instalar Java y Android SDK en la Mac. Franco todavía no la pidió.
3. Opcional: investigar si AlarmKit anda con Apple ID gratis, solo para alarmas programadas.
- Audios de más de ~1 MB: siguen sin solución gratis (Storage pide Blaze).
- Ideas: recordatorios con horario para tareas/eventos, aniversarios, modo "llegué bien".

## Entorno en la Mac de Franco
Repo en `~/twin-particles`; GitHub CLI y Wrangler ya logueados; node instalado (`node --check` funciona).
