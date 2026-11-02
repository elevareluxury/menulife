# Fichas de las tiendas (App Store y Google Play)

Nombre: **Mycen** · Categoría principal: **Productividad** (secundaria: Estilo de vida) · Edad: la que dé el cuestionario de cada tienda (declarar contenido de otras personas: perfiles públicos y mensajes; probablemente 12+ / Adolescentes).
Sitio: https://mycen.id · Soporte: https://mycen.id/soporte · Privacidad: https://mycen.id/privacidad · Borrar la cuenta
(Google Play → Seguridad de los datos): https://mycen.id/eliminar-cuenta · Contacto: team@mycen.id.
Precio: gratis, sin compras dentro de la app (nada de precios ni planes adentro de la app).

Límites: subtítulo de Apple ≤ 30 caracteres · descripción corta de Google ≤ 80 · palabras clave de Apple ≤ 100.

| Idioma | Subtítulo (Apple) | Descripción corta (Google) |
|---|---|---|
| es | Tu identidad y tu día | Tu página personal y tu día ordenado: hábitos, tareas, metas y dinero. |
| en | Your identity and your day | Your personal page and your day in order: habits, tasks, goals and money. |
| pt | Sua identidade e seu dia | Sua página pessoal e seu dia em ordem: hábitos, tarefas, metas e dinheiro. |
| fr | Ton identité et ta journée | Ta page perso et ta journée en ordre : habitudes, tâches, objectifs, budget. |
| de | Deine Identität, dein Tag | Deine Seite und dein Tag im Griff: Gewohnheiten, Aufgaben, Ziele, Geld. |
| it | La tua identità, la tua giornata | La tua pagina e la tua giornata in ordine: abitudini, attività, obiettivi. |
| zh | 你的身份与你的一天 | 你的个人主页与井井有条的一天：习惯、任务、目标和收支。 |
| ja | あなたのページと一日 | 自分のページと整った一日：習慣、タスク、目標、お金。 |
| ko | 나의 아이덴티티와 하루 | 나만의 페이지와 정돈된 하루: 습관, 할 일, 목표, 돈. |
| hi | आपकी पहचान, आपका दिन | आपका पेज और व्यवस्थित दिन: आदतें, काम, लक्ष्य और पैसा। |
| ar | هويتك ويومك | صفحتك الشخصية ويومك المنظّم: عادات ومهام وأهداف ومال. |
| ru | Твой профиль и твой день | Твоя страница и упорядоченный день: привычки, задачи, цели и деньги. |

## Descripción (es, fuente; traducir con el mismo tono para los otros 11)
Mycen junta dos cosas en una sola app.

**Tu Mycen:** una página propia en mycen.id/tu-nombre con tus links, redes, proyectos, música, videos, formulario de
contacto y más. Elegí entre 5 estructuras, dos temas y tu huella única. Compartila con un QR o un link.

**Life OS, tu día:** tus 3 prioridades, hábitos que perdonan un día perdido, tareas con recordatorios, metas con
pasos, un diario privado y tu dinero por moneda, con presupuestos amables. Todo sin culpa y sin anuncios.

En 12 idiomas. Tus datos son tuyos: los exportás o los borrás cuando quieras.

Palabras clave (es): `link en bio,perfil,hábitos,tareas,metas,diario,presupuesto,gastos,productividad,qr`

## Privacidad (App Store "Privacy Nutrition Label" y Google "Seguridad de los datos")
- **Rastreo entre apps:** no. Sin publicidad ni SDKs de terceros.
- **Datos vinculados a la persona (para que la app funcione):** nombre, email, foto, contenido que carga (perfil,
  tareas, hábitos, metas, diario, movimientos), identificador de cuenta.
- **Uso de la app (analítica propia, vinculado a la cuenta):** eventos de producto sin contenido (`product_events`).
- **Diagnóstico (no vinculado):** errores de la app con un hash diario anónimo (`app_errors`).
- **Cifrado en tránsito:** sí (HTTPS). **Borrar la cuenta desde la app:** sí (Studio → Ajustes y Life OS → Ajustes →
  Cuenta, así llega también quien usa sólo Life OS).
- El manifiesto `ios/App/App/PrivacyInfo.xcprivacy` declara lo mismo (nombre, email, fotos, contenido, información
  financiera de Dinero, id de cuenta, uso de la app y errores no vinculados); si cambia esta lista, cambiarlo también.
- Export compliance: sólo cifrado estándar (`ITSAppUsesNonExemptEncryption = false` ya está en Info.plist).

## Revisión de Apple
- Contenido de otras personas (guía 1.2): denunciar un perfil ("Denunciar" en cada perfil público) y, en Studio →
  Mensajes, reportar un mensaje al equipo o bloquear a quien lo escribió. El equipo lo revisa en el panel (Denuncias).
- "Entrar con Apple" va junto a "Continuar con Google" (guía 4.8). Aparece solo cuando Apple está configurado en
  Supabase; mientras no lo esté, la app de iPhone no muestra Google (`oauthProviders()` en `googleSignIn.ts`) y se entra
  con email. Las notas de abajo traen los dos párrafos "SIGN-IN": dejá el que corresponda.
- Permisos de iOS (`Info.plist` y los 12 `InfoPlist.strings`): sólo cámara y fotos (foto de perfil, portada e imágenes
  de proyectos) y guardar en Fotos (QR y tarjeta). Sin micrófono ni reconocimiento de voz: "Dictar" no se ofrece en la
  app (`speechSupported()` en `useSpeech.ts`). Si vuelve el dictado nativo, declarar los dos permisos de nuevo.

### Antes de mandar a revisión
- [ ] **Cuenta de prueba** con email (sin datos reales) y con contenido: perfil publicado con foto, portada y algunos
      módulos; en Life OS, tareas, hábitos, una meta y movimientos de dinero. Que **tenga al menos un mensaje
      recibido** en Studio → Mensajes (mandalo desde el formulario de contacto de su perfil) para probar reportar y bloquear.
- [ ] **Un segundo perfil publicado** (de otra cuenta tuya) para que el revisor pruebe "Report": en el perfil propio
      el botón no aparece. Reemplazá `<PERFIL_DE_EJEMPLO>` en las notas.
- [ ] La cuenta de prueba entra **en la build de TestFlight** (no sólo en la web), con el email y la contraseña tal
      cual van en "App Review Information".
- [ ] **TestFlight probado en un iPhone real:** entrar, crear una tarea con recordatorio y recibirlo con la app
      cerrada, compartir el perfil, subir una foto (cámara y galería), modo avión y volver, borrar una cuenta de prueba.
- [ ] Links universales: `https://mycen.id/.well-known/apple-app-site-association` responde con tu Team ID y un link
      de mycen.id abre la app.
- [ ] **team@mycen.id recibe mails** (mandá uno de prueba desde otra casilla) y https://mycen.id/soporte,
      /privacidad y /eliminar-cuenta abren sin entrar a la cuenta.
- [ ] Capturas subidas (iPhone 6,9" obligatorias) y ficha completa: subtítulo, descripción, palabras clave,
      categoría, clasificación por edad, URL de soporte y de privacidad, etiqueta de privacidad igual a la de arriba.
- [ ] "App Review Information": nombre, teléfono y email de contacto, la cuenta de prueba y las notas de abajo con
      los marcadores reemplazados.
- [ ] Versión y build en Xcode (`MARKETING_VERSION` 1.0.0, número de build mayor al último que subiste).

### Notas para el revisor (copiar y pegar en "App Review Information → Notes")
En inglés porque los revisores leen inglés. Reemplazá `<EMAIL_DE_PRUEBA>`, `<CONTRASEÑA>` y `<PERFIL_DE_EJEMPLO>`.
El campo admite hasta 4000 caracteres y este bloque entra.

```text
ABOUT THE APP
Mycen has two parts in one app:
- Studio: you build your own public page (mycen.id/your-name) with links, social profiles, projects, music, videos and a contact form, and share it with a link or QR code.
- Life OS: a private daily planner with your top 3 priorities, tasks with reminders, habits, goals, a private journal and a money tracker with budgets.
The app uses the device language (12 languages). Everything is free.

SIGN-IN
Use this demo account (email and password):
Email: <EMAIL_DE_PRUEBA>
Password: <CONTRASEÑA>
The app also offers "Continue with Apple" next to "Continue with Google" (guideline 4.8).
[If Apple is not configured in Supabase yet, use this sentence instead: "In this version the iPhone app only offers email sign-in. It shows no third-party login on iOS, so guideline 4.8 does not apply."]

ACCOUNT DELETION (5.1.1(v))
Inside the app, from either part:
- Studio > Settings > "Delete my account"
- Life OS > Settings > Account > "Delete my account"
After typing a confirmation word, the account and all its data are deleted right away. It is also available on the web at https://mycen.id/eliminar-cuenta.

USER-GENERATED CONTENT (1.2)
- Report a profile: open any public profile, for example https://mycen.id/<PERFIL_DE_EJEMPLO> (it opens in the app), scroll to the footer and tap "Report". Choose a reason and send it. The button is not shown on your own profile.
- Report or block a message: Studio > Messages, open a message and tap "Report" (sends it to our team and blocks the sender) or "Block". The demo account already has a message to try this.
- Our team reviews every report in an internal moderation panel and removes content or accounts that break our content rules. Contact: team@mycen.id.

PAYMENTS (3.1)
The app sells nothing: no subscriptions, no in-app purchases, no digital goods, and no prices or plans in the app. The optional "Support me" module on a profile only shows links and bank aliases added by the profile owner (Mercado Pago, PayPal, Ko-fi, etc.), which open outside the app. Mycen does not process these payments or take any part of them.

NATIVE FEATURES (4.2)
- Task and habit reminders are scheduled as local notifications on the device and arrive even when the app is closed.
- The native share sheet is used to share the profile, QR code, contact card (vCard), calendar file and data export.
- Universal Links: mycen.id links open directly in the app.
- Offline mode: quick capture in Life OS works without a connection and syncs when the network returns.
- The session is kept in native storage. Camera and photo library are used for the profile picture, cover and project images, and Photos to save the QR code and identity card.

PERMISSIONS
Only camera, photo library and "add to Photos", each requested when you use that feature. The app does not use the microphone, location or tracking.
```

### Las mismas notas en español (para vos; no se pegan)
```text
SOBRE LA APP
Mycen tiene dos partes en una app:
- Studio: armás tu página pública (mycen.id/tu-nombre) con links, redes, proyectos, música, videos y un formulario de contacto, y la compartís con un link o un QR.
- Life OS: un planificador privado del día con tus 3 prioridades, tareas con recordatorios, hábitos, metas, un diario privado y tu dinero con presupuestos.
La app usa el idioma del teléfono (12 idiomas). Todo es gratis.

CÓMO ENTRAR
Con esta cuenta de prueba (email y contraseña):
Email: <EMAIL_DE_PRUEBA>
Contraseña: <CONTRASEÑA>
En esta versión la app de iPhone sólo ofrece entrar con email. No muestra ningún acceso de terceros (Google ni otro) en iOS, así que la guía 4.8 no aplica. "Entrar con Apple" se suma junto a Google en una próxima versión.

BORRAR LA CUENTA (5.1.1(v))
Desde la app, en cualquiera de las dos partes:
- Studio > Ajustes > "Eliminar mi cuenta"
- Life OS > Ajustes > Cuenta > "Eliminar mi cuenta"
Después de escribir una palabra de confirmación, la cuenta y todos sus datos se borran en el momento. También en la web: https://mycen.id/eliminar-cuenta.

CONTENIDO DE OTRAS PERSONAS (1.2)
- Denunciar un perfil: abrí cualquier perfil público, por ejemplo https://mycen.id/<PERFIL_DE_EJEMPLO> (se abre en la app), bajá al pie y tocá "Denunciar". Elegí un motivo y enviá. En el perfil propio el botón no aparece.
- Reportar o bloquear un mensaje: Studio > Mensajes, abrí un mensaje y tocá "Reportar" (lo manda al equipo y bloquea a quien lo escribió) o "Bloquear". La cuenta de prueba ya tiene un mensaje para probarlo.
- El equipo revisa cada denuncia en un panel interno de moderación y saca el contenido o las cuentas que no cumplen las reglas. Contacto: team@mycen.id.

PAGOS (3.1)
La app no vende nada: ni suscripciones, ni compras dentro de la app, ni bienes digitales, ni precios o planes adentro. El módulo opcional "Apoyame" de un perfil sólo muestra links y alias que carga el dueño del perfil (Mercado Pago, PayPal, Ko-fi, etc.), que se abren fuera de la app. Mycen no procesa esos pagos ni se queda con nada.

LO NATIVO (4.2)
- Los recordatorios de tareas y hábitos se programan como notificaciones locales en el teléfono y llegan con la app cerrada.
- El menú nativo de compartir se usa para el perfil, el QR, la tarjeta de contacto (vCard), el calendario y la exportación de datos.
- Links universales: los links de mycen.id abren directo la app.
- Sin conexión: la captura rápida de Life OS funciona sin red y se sincroniza cuando vuelve.
- La sesión se guarda en el almacenamiento nativo. La cámara y las fotos se usan para la foto de perfil, la portada y las imágenes de proyectos, y Fotos para guardar el QR y la tarjeta de identidad.

PERMISOS
Sólo cámara, fotos y "agregar a Fotos", cada uno cuando usás esa función. La app no usa el micrófono, la ubicación ni el rastreo.
```
