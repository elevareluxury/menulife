# Auditoría de seguridad V2 — web y funciones Edge

Fecha: octubre de 2026 (sobre `main` en `6fe23b2`). Alcance: lo que corre en el navegador (página pública, Studio,
Life OS, acceso), las funciones Edge de Vercel (`api/`), `vercel.json` y las dependencias. La base de datos ya se revisó
en la [auditoría V1](auditoria-v1.md); acá sólo se confirma lo que la web necesita de ella (panel de super-admin).

**En pocas palabras:** no apareció nada grave en lo nuevo (Identity, Studio, Life OS). Lo más importante estaba en la
**página vieja del Hub** (`/{username}?v=1`, la de respaldo): un link armado por el dueño de un negocio podía ejecutar
código en mycen.id al tocarlo. Está arreglado. También se arreglaron cosas chicas (una foto que el servidor descargaba
de cualquier lado, el micrófono bloqueado para "Dictar", fórmulas en el CSV de Dinero) y quedan algunas decisiones.

## Arreglado en esta revisión

| Gravedad | Qué pasaba | Qué podía pasar | Arreglo | Prueba |
|---|---|---|---|---|
| **Alta** | Hub viejo (`?v=1`, `HubPublicPage`): los links del dueño (`hub_links`, botón principal, reseñas de Google, producto destacado) se abrían tal cual. Los botones usan `window.open(link.url)`, que no pasa por la protección de React. | Un dueño de negocio (o quien entre a su cuenta) carga un link `javascript:…`. Cualquiera que lo toque ejecuta código en mycen.id: si tiene la sesión abierta, le pueden leer o cambiar su cuenta. | Todos esos links pasan por `safeHref` (sólo http/https, mailto, tel, sms y rutas internas). Uno que no sirve no se muestra o no abre nada. | `tests/unit/securityWeb.test.ts` (variantes de `javascript:` con mayúsculas, tabulaciones, nulos y saltos). |
| Media | Imagen al compartir (`api/og/[slug].tsx`): descargaba la foto del perfil desde **cualquier** `https://` que tuviera `avatar_url`. | El dueño (llamando a la API directo) pone la URL que quiera y el servidor de Mycen la pide por él (SSRF): servicios internos, archivos enormes o hacer que Mycen “visite” sitios de terceros. | `ogAvatar`: sólo fotos del almacenamiento público de Supabase del proyecto (`/storage/v1/object/public/…`, mismo host, sin usuario/contraseña). Si no, se dibuja la inicial. | `securityWeb.test.ts`: lista de URLs rechazadas y la función nunca pide otro host. |
| Media | `Permissions-Policy: microphone=()` en `vercel.json`. | **"Dictar" y "Vaciar la cabeza" no andaban en producción** (el navegador niega el micrófono a la propia página). Los E2E no lo veían porque simulan el reconocimiento y no usan los encabezados de Vercel. | `microphone=(self)`: sólo mycen.id puede pedirlo (los iframes de YouTube, Spotify, etc. no). Cámara y ubicación siguen apagadas. | `securityWeb.test.ts` (lee `vercel.json`). Probar "Dictar" en el celular después del deploy. |
| Baja | CSV de Dinero (`exportMoneyCsv`): no neutralizaba fórmulas (el de suscriptores sí). | Una descripción que llega de un extracto bancario importado, como `=HYPERLINK(…)`, se ejecuta al abrir el CSV en Excel o Sheets. | `csvCell` antepone `'` a textos que empiezan con `= + - @`, tabulación o retorno (los montos y fechas no cambian). | `securityWeb.test.ts`. |
| Baja | vCard (`vcard.ts`) y calendario (`api/calendar.ts`) escapaban `\n` pero no un `\r` suelto. | Un nombre o una tarea con `\r` podía agregar un campo de más en la tarjeta o el evento (por ejemplo, otro email). Lo escribe la misma persona, así que el daño es chico. | Se escapan `\r\n`, `\r` y `\n`. | `securityWeb.test.ts`. |
| Baja | Studio → Mensajes: "Responder por mail" armaba `mailto:` con lo que escribió el visitante. | `ana@x.com?bcc=…&body=…` abría un mail con copias o texto que el dueño no escribió. | El contacto sólo se toma como email si no tiene `? & # % , ; :` ni comillas; si no, no hay botón (el contacto se sigue viendo). | `securityWeb.test.ts`. |
| Baja | `safeHref` aceptaba `/\evil.com` como ruta interna. | El navegador lo lee como `//evil.com`: el link iba a otro sitio en la misma pestaña. No ejecuta código. | Se rechaza. | `securityWeb.test.ts`. |
| Baja | CSP sin `frame-src`. | Si algún día se colara un iframe con otra dirección, se cargaría igual. | `frame-src 'self'` + YouTube (sin cookies y el de siempre, que usa el Hub viejo), Vimeo, Spotify, SoundCloud y TikTok. | `securityWeb.test.ts`. |
| Baja | `Referrer-Policy: origin-when-cross-origin` y `X-XSS-Protection: 1; mode=block`. | El primero manda el origen también a páginas `http://`; el segundo es un filtro viejo que los navegadores ya sacaron y que en algunos casos se usaba para atacar. | `strict-origin-when-cross-origin` y `X-XSS-Protection: 0` (lo recomendado hoy). | `securityWeb.test.ts`. |

## A decidir (no se cambió)

| Gravedad | Hallazgo | Por qué no se tocó / recomendación |
|---|---|---|
| Media | **CSP sin `script-src` ni `connect-src`.** Si algún día entra un XSS, nada frena que cargue scripts de afuera o mande datos a otro sitio. | `index.html` tiene un script en línea (esqueleto del hero, `scripts/heroShell.ts`), así que `script-src 'self'` lo rompería. Propuesta: calcular su hash en el build y publicar `script-src 'self' 'sha256-…'`; `connect-src 'self' https://<proyecto>.supabase.co wss://<proyecto>.supabase.co`. Conviene probarlo primero como `Content-Security-Policy-Report-Only` en un preview. |
| Media | **Hub viejo (`?v=1`) sigue vivo.** Lee tablas `hub_*` y `restaurants` directo, carga Google Fonts (`useThemeFonts`), no usa el sistema de diseño y es la zona que tuvo el problema alto. | Retirarlo cuando Studio reemplace al editor viejo (ya está previsto en CLAUDE.md). Mientras tanto, los links quedan filtrados. |
| Baja | `src/modules/hub/components/blocks/BioBlock.tsx` limpia HTML con `innerHTML` en un `div` del documento (las imágenes con `onerror` se ejecutan antes de limpiar) y no revisa lo que queda tras desarmar una etiqueta no permitida. | Hoy **no se usa** (nadie importa `HubBlockRenderer` ni `HubBlockEditor`). Borrar esos archivos junto con el Hub viejo; si se reviviera, usar `DOMParser` y texto plano. |
| Baja | Imágenes del perfil (foto, portada, links con imagen) se muestran desde la URL guardada. Studio siempre sube a Supabase, pero si alguien guarda otra URL por la API, el navegador del visitante la pide al abrir el perfil (ese sitio ve su IP). | Opcional: aceptar en la página pública sólo imágenes del almacenamiento de Mycen (como ya hace la imagen al compartir). |
| Baja | Cola sin conexión de Life OS (`mycen_life_outbox`) no es por cuenta: si alguien carga algo sin red, cierra sesión y entra otra cuenta en el mismo celular, al volver la red se intenta subir (la base lo rechaza por RLS) y el aviso de error muestra el título a la otra cuenta. | Guardar la cola por usuario (`mycen_life_outbox:<id>`) o vaciarla al cerrar sesión. |
| Baja | `api/youtube-latest` se puede usar desde afuera como “lector de feeds de YouTube” gratis. Tiene formato estricto, 5 s de espera, tope de tamaño y caché de 30 min en la CDN, así que el costo es bajo. Sigue redirecciones antes de mirar adónde fueron (sólo YouTube puede redirigir). | Si se ve abuso: firewall de Vercel con límite por IP. |
| Baja | Diario: el bloqueo es del dispositivo (está bien documentado que no es cifrado). Quien tiene el celular y sabe abrir las herramientas del navegador puede borrar el registro; un PIN de 4 dígitos se adivina sin límite si se copia el hash. | Es la decisión de diseño aprobada. Si se quisiera más, cifrar las entradas con una clave derivada del PIN (cambio grande, V1.1+). |
| — | `npm audit --omit=dev`: 3 avisos altos. `pdfjs-dist` < 6.2.108 (ejecutar código con un PDF malicioso; sólo Business → importar menú, el propio dueño elige el PDF) y `sharp` vía `@vercel/og` 0.11 (las funciones Edge no usan `sharp`). | Ninguno se arregla con un parche chico: los dos piden versión mayor (`pdfjs-dist` 6.x, `@vercel/og` 1.x). Ya estaban anotados en la V1; `pdfjs-dist` antes de abrir Business. |

## Revisado y bien

- **Sin HTML del dueño como HTML** en Identity, Studio ni Life OS: el único `dangerouslySetInnerHTML` vivo es la huella del
  QR (`HuellaQr`), que sale de números y colores fijos. React 19 además bloquea `javascript:` en `href`.
- **Links de módulos**: link, grupo de links, redes, contacto, ubicación, producto, acción destacada, reseñas, imagen,
  galería, proyecto (bloques y portada), foto y portada del perfil pasan por `safeHref`. Apoyame y Escuchá en usan sus
  propias reglas (`support.ts`, `listenOn.ts`: sólo https, dominio por plataforma, sin usuario/contraseña) y la página
  vuelve a validar lo guardado. La web de Colaboraciones la valida la base (`https://…`).
- **Iframes**: video y música (`media.ts`, `video.ts`, `latestVideo.ts`) arman el `src` con el id validado y una lista
  cerrada; nada de terceros carga antes de tocar "Reproducir" (lo verifica `media.spec.ts`). "Último video" no usa
  miniaturas de `ytimg`.
- **`target="_blank"`**: en Identity, Studio y Life OS todos los externos llevan `rel="noopener noreferrer"` (los
  navegadores actuales además lo aplican solos; en Business hay algunos `window.open` sin él, fuera de alcance).
- **Funciones Edge**: `api/og.ts` escapa todo el texto (también el JSON-LD) y filtra links; `api/sitemap.ts` escapa y sólo
  acepta rutas con forma de perfil; `api/calendar.ts` exige un token de 64 hex, responde `private` y `noindex`;
  `api/youtube-latest.ts` sólo pide a `www.youtube.com` con formato estricto, tiempo y tamaño máximos, y errores con
  códigos fijos (nunca repite lo que llegó). Los previsualizadores no pueden llegar a rutas privadas: `og.ts` manda
  `studio`, `life`, `super-admin`, etc. a la app normal.
- **Fuentes**: todas desde `@fontsource` y `public/fonts` (nada de Google Fonts fuera del Hub viejo).
- **Acceso**: no hay `?next=` ni redirecciones con destino que venga de la URL; Google y los mails vuelven siempre a
  `/auth/callback` del mismo sitio; los errores viajan como códigos. `mycen_oauth_pending` guarda sólo idioma, aceptación,
  referido y hora (vence en 1 h). `TermsGate` es un paso de consentimiento, no de seguridad (la base no depende de él).
- **Super-admin**: la pantalla exige `isSuperAdmin` y **cada** RPC `admin_*` llama a `mycen_assert_admin()` en la base.
- **Almacenamiento local**: sesión de Supabase y preferencias; el reporte de errores manda sólo la ruta (sin `?` ni `#`).
- **Privacidad**: los terceros que realmente se usan (Supabase, Vercel, Resend, reproductores, Google para entrar,
  calendario, reconocimiento de voz, Anthropic y Mercado Pago de Business) están en la política, en los 12 idiomas.
