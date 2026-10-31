# Mycen — guía para Claude Code

Referencia de producto: "MYCEN — Etapa 2" (UX/UI, arquitectura y criterios de aceptación).
Rumbo de Identity: `docs/identity/` (auditoría Fase 0, 13 decisiones aprobadas y plan por fases). Ante dudas, manda
`docs/identity/00-decisiones.md`; no implementar una fase sin aprobar la anterior.

## Nombres (decididos)
- **Mycen Identity** — identidad pública en `/{username}` (decisión P4; antes "Mycen Profile" y, antes, "Hub digital").
  Para la persona es "tu Mycen" / "tu identidad". En el código sigue el módulo `src/modules/profile/`.
- **Mycen Studio** — panel privado donde el dueño edita, personaliza, comparte y mide su identidad (Mycen Identity).
- **Mycen Business** — el sistema de negocios existente (menú, pedidos, POS, inventario, servicios). Queda tal cual.
- **Life OS** — espacio personal (`/life`). No es parte del MVP de Profile.
- No usar "Hub" para nada nuevo: hay un solo sistema de identidad.

## Modelo de datos
- Identity (Fase 1–2): `identities` (1 por cuenta) → `profiles` (= Space; `identity_id`, `visibility`, `archived`)
  → `profile_versions` (snapshots inmutables) · `content_objects`/`content_blocks` (proyectos, Fase 5). Ver `docs/identity/05`.
- Mis Spaces (Fase 10): hasta 5 Spaces sin archivar por cuenta (trigger `mycen_space_rules`; el alta de negocios no se frena).
  El principal (`is_primary`) tiene la URL raíz `/{username}`; los demás no tienen username y viven en `/{username}/{space_slug}`
  (slugs reservados: `mycen_reserved_space_slug` = `RESERVED_SPACE_SLUGS` en `studio/lib/spaces.ts`). Las RPC públicas aceptan
  "ana" o "ana/estudio" (`mycen_find_space`) y devuelven `handle`; un principal suspendido oculta sus Spaces. Archivar = `status
  'archived'` (el principal no se archiva); `duplicate_space` copia un Space como borrador. Cada Space tiene su analítica.
- La identidad vive en `profiles` + `profile_modules`, **no** en `restaurants`.
  Un negocio *tiene* un perfil (`profiles.restaurant_id`, opcional).
- Username = slug histórico del negocio (las URLs y QRs impresos no cambian).
  Cambios de username quedan en `profile_username_history` (redirección).
- Usernames reservados: tabla `reserved_usernames` y `src/lib/reservedUsernames.ts` (mantener sincronizados).
- El visitante anónimo **nunca** lee tablas: usa las RPC `get_public_profile`, `get_public_project`, `get_profile_contact_card`,
  `track_profile_event`, `check_username`, `report_profile`, `public_sitemap`, `report_client_error`, `submit_profile_message`,
  `track_product_event` (sin sesión, sólo `signup_started`), `subscribe_profile` y `get_site_flags`.
- Proyectos (Fase 5): `content_objects` (type='project') + `content_blocks`. Son de la identidad y se publican por su cuenta
  (`publish_project` → `published_snapshot`; Studio no puede escribir el snapshot ni pasar a "publicado" directo).
  Los módulos `project`/`portfolio` guardan sólo ids en `content`; `get_public_profile` les agrega `projects` (tarjetas de lo
  publicado) al responder, así que publicar un proyecto actualiza el portfolio sin volver a publicar el Space.
- Analítica: `profile_events` con hash diario anónimo; no guardar IP ni user-agent. Fuentes de tráfico (Fase 7):
  `profile_traffic_sources` (sólo el dueño) agrupa visitas por `?src=` y sitio de origen; Studio las nombra en `lib/trafficSources.ts`.
- Toques por botón ("Lo que más tocan", Analítica): cada botón público llama `onAction(moduleId, item?)` con una clave corta
  de `profile/lib/clickKeys.ts` (`urlKey` = hash del link, `supportKey`, plataforma de `listen_on`, `whatsapp|phone|email`,
  `p:<proyecto>`, `reserve`) → `track_profile_event(…, p_item_key)` → `profile_events.item_key` (≤ 64, `[A-Za-z0-9:_.-]`,
  la base descarta lo demás; dedup también por clave). `profile_click_stats(p_profile_id, p_days)` (sólo el dueño) da visitas
  y toques por evento/módulo/clave; `studio/lib/clickStats.ts` les pone nombre con el contenido actual ("Link que ya no
  está" si se borró) y `ClickRanking` muestra ranking, % sobre visitas y totales por módulo. Un botón nuevo con varios
  ítems: mandar su clave y nombrarla en `clickItemLabel`. Migración `20261101000001_profile_click_analytics.sql`, tests en
  `click_analytics.test.sql`, `clickStats.test.ts` y `click-analytics.spec.ts`.
- Módulos programados (Fase 7): `config.show_from` / `config.show_until` (ISO). La RPC pública los filtra al responder
  (`mycen_module_live`), sin volver a publicar; la misma regla en el cliente está en `profile/lib/moduleSchedule.ts`.
- Moderación (Fase 8): `report_profile` (anónimo, sin bots, 1 por perfil y día, máx. 10 por día) guarda en `profile_reports`,
  que nadie lee directo: los super-admins (tabla `super_admins`) usan `admin_list_reports` / `admin_resolve_report` /
  `admin_set_suspension` desde `/super-admin/denuncias`. `profiles.suspended_at` lo cambia sólo esa RPC (trigger) y oculta
  página, proyectos, vCard y redirecciones; Studio muestra el aviso con el motivo. Reglas en `/terminos#reglas`.
- Errores (Lanzamiento L5, sin proveedores externos): `app_errors` (agrupados por huella: zona + mensaje + primer frame del
  stack) y `app_error_hits` (personas afectadas con hash diario anónimo, 90 días). La app reporta con `report_client_error`
  (`src/lib/errorReporter.ts`: errores sin atrapar + `ErrorBoundary`; sólo en producción o con `VITE_REPORT_ERRORS=1`,
  sin bots, con topes; una pantalla de la versión anterior que ya no existe tras publicar recarga la página una vez,
  `src/lib/staleChunk.ts`, sin reportarse) y el super-admin los ve y resuelve en `/super-admin/errores` (`admin_list_errors`,
  `admin_set_error_status`, `admin_error_summary`). Un error resuelto que vuelve a pasar se reabre solo.
- Las tablas `hub_*` y `restaurants.hub_*` son legado: se importan con `mycen_import_hub()`. La página pública vieja y su editor ya no
  existen; quedan las tablas, la importación y `src/modules/hub/lib/` (plantillas que usa el onboarding de Business, `/onboarding`).
- `restaurants` (Business) sin sesión: `anon` tiene SELECT sólo de las columnas de `PUBLIC_RESTAURANT_COLUMNS`
  (`src/modules/public/lib/publicRestaurant.ts` = la lista de `20261108000001_restaurants_public_columns.sql`, un test lo
  verifica). Las pantallas públicas (menú `/r/:slug`, reservas, catálogo, seguimiento, presupuesto, logins de mozo/delivery/
  cocina, landing de referidos) piden columnas, nunca `*`; email, teléfono, dirección, dueño, plan y notas no salen.
  Tests en `restaurants_public_columns.test.sql` y `business-public-menu.spec.ts` (el mock aplica la misma regla).
- Migraciones en `supabase/migrations/`; se aplican pegándolas en Supabase → SQL Editor.

## Código
- Página pública (Identity): `src/modules/profile/` en `/:slug` (el Hub viejo se retiró: `/{username}?v=1` redirige a `/{username}` sin `v` y con el resto de los parámetros, `PublicSlugRoute` en `App.tsx`; E2E en `hub-retired.spec.ts`). `ProfileView` se reutiliza en la vista previa de Studio y en el onboarding.
- Módulos: la lista de tipos es `MODULE_TYPES` (`profileTypes.ts`, igual al check `profile_modules_type_check`). Cada tipo se define en
  dos registros `Record<ModuleType, …>`: el público (`profile/components/moduleRegistry.ts`, cómo se dibuja; lo usan la página y la
  vista previa) y el de Studio (`studio/lib/moduleCatalog.ts`: campos, validación, valores iniciales, qué se guarda, resumen y editor
  propio en `moduleExtraEditors.tsx`). Nada de `if (type === …)` sueltos: un tipo nuevo se agrega en esos dos lugares.
- Apariencia (Fase 9, reemplazada por el perfil V1 en la etapa 03 y en Studio en la 06; los datos viejos quedan sin uso): `profiles.theme` = modo (`dark`/`light`/`auto`, este sigue al dispositivo con `usePrefersLight`),
  `corners`, `background` (liso/brillo/teñido con el acento), `card_style`, acento y tipografía. `profileTheme.ts` arma la paleta
  (`themePalette`) y garantiza WCAG AA: el acento se usa sólo si llega a 3:1 y deja texto legible encima (si no, color de texto);
  el texto secundario se ajusta si hace falta. `contrastReport` se muestra en Studio → Apariencia. Toda la app permite
  zoom (viewport sin `user-scalable=no`). Tests: barrida de contraste en `tests/unit/profileTheme.test.ts` y axe en `tests/e2e/appearance.spec.ts`.
- Links (Fase 7): estilo "Destacado" (`content.style = 'highlight'`) y módulo `link_group` (varios links bajo un título).
- Connect (decisión 1, sin CRM): Studio → Compartir tiene URL, QR (`?src=qr`), vCard, tarjeta de identidad PNG clara/oscura
  (`lib/identityCard.ts`, canvas en el navegador, QR con `?src=card`) y presentación corta para copiar o mandar por WhatsApp.
- Página de proyecto: `/{username}/projects/{slug}` (`ProjectPublicPage` → `ProjectView`). Bloques: registro `Record<BlockType, …>`
  público en `profile/components/ProjectBlocks.tsx` y de Studio en `studio/lib/blockCatalog.ts`. Video sólo YouTube/Vimeo
  (`profile/lib/video.ts`: el iframe se arma con el id validado, YouTube sin cookies).
- Vista previa al compartir: `api/og.ts` (Vercel Edge) + reglas en `vercel.json` sólo para previsualizadores (WhatsApp, Facebook, X…),
  también para las páginas de proyecto (HTML con el contenido publicado y JSON-LD CreativeWork).
- Studio: `src/modules/studio/` en `/studio/*` (Inicio, Mi identidad, Módulos, Proyectos, Apariencia, Compartir, Analítica, Ajustes).
  Proyectos (`/studio/projects`, `/studio/projects/:id`): se guardan solos (bloques con id generado en el cliente, upsert) y tienen
  su propio "Publicar"/"Despublicar".
  El perfil se guarda solo (autosave con estados Guardando/Guardado/Error); los módulos se guardan al confirmar el panel.
  Editor móvil (Fase 6): módulos y bloques se reordenan con `SortableList` (dnd-kit: manija para mouse/dedo, teclado con
  espacio/flechas/Escape y anuncios para lectores de pantalla en `sortable`); las demás acciones van en el menú `Menu` "⋯"
  (Editar, Subir, Bajar, Duplicar, Eliminar; se usa con flechas y Escape). Vista previa a pantalla completa (`FullscreenPreviewButton`).
  **Guardar ≠ publicar** (Identity Fase 3): Studio edita la versión de trabajo; `publish_space` congela una versión en
  `profile_versions` y la página pública (`get_public_profile`) lee esa versión. Barra `PublishBar` (estado, "Publicar
  cambios", deshacer/rehacer de la sesión), versiones y "Restaurar" en Ajustes. `profiles.revision` = control de
  concurrencia (el autosave manda la revisión que conoce; si otra pestaña guardó antes, se rechaza).
- Studio multi-Space (Fase 10): `StudioShell` carga todos los Spaces y abre el activo (recordado en el dispositivo, si no el
  principal); `switchSpace` remonta el editor. Contexto: `spaces`, `handle`, `primaryUsername` (los proyectos son de la identidad
  y viven en `/{primaryUsername}/projects/…`). Selector `SpaceSwitcher` arriba y pantalla `/studio/spaces` (crear, duplicar,
  archivar, restaurar). En Ajustes, un Space secundario cambia su dirección (el link viejo deja de funcionar; no hay redirección).
- Editor de escritorio (Fase 11): `/studio/editor` (`EditorPage`) con 3 paneles: Capas (identidad, apariencia y módulos con
  `SortableList`), vista previa con selección directa (`ProfileView` con `select`: un clic elige el bloque sin abrir links;
  `IDENTITY_TARGET` = encabezado) y Propiedades (`ModuleEditor inline`, `IdentityPage embedded`, `AppearancePage embedded`).
  Las acciones de módulos son `useModuleActions` (las comparten Módulos y el editor); íconos y badges en `lib/moduleUi.ts`.
- Corte hecho: `/dashboard/hub` y `/life/hub` redirigen a `/studio`. Usuarios sin perfil ven el onboarding de 7 pantallas (`OnboardingWizard`, etapa 07a).
- Tareas: viven en Brain (`life_brain_items` con `type='task'`: fecha, hora, recordatorio, meta, "foco de hoy").
  Brain tiene 3 vistas: Capturas (ideas y notas), Tareas (lista por vencimiento o calendario; `?vista=tareas`) y Archivo.
  Recordatorios con la app abierta + `.ics` para el calendario del celular. `life_tasks` es legado (ya copiada a Brain).
  Goals es sólo metas: cada meta muestra lo vinculado por `goal_id` — tareas, hábitos (constancia 30 días),
  movimientos de dinero (por moneda, sin sumar) y notas/ideas. Se vincula con `GoalSelect` al crear o editar.
- Life OS: borrar con "Deshacer" (`src/modules/life/lib/undo.tsx`), "hoy" que cambia a medianoche (`useToday`),
  rachas según los días programados del hábito, progreso de metas = pasos hechos/total (sin pasos, manual),
  Replay calculado con fechas reales del mes (sin Life Score). Menús "⋯" con `ActionMenu` (táctil).
- Inicio de Life OS (`/life`) = "Mi día" (etapa 11; antes "Tu día"): tareas de hoy (foco + vencen hoy + hechas hoy), hábitos programados para hoy,
  metas en curso y el mes en la moneda principal (las otras monedas aparte). Cada tarjeta usa el hook de su módulo.
  No hay Life Score (la tabla `life_score` es legado; no se escribe más).
- Insights (`/life/insights`, `lib/insights.ts`): reglas sobre datos reales calculadas en el dispositivo; cada una exige
  un mínimo de datos y si no alcanza no se muestra. El inicio destaca uno (no repite las vencidas).
  Insights y "Tu mes" (`/life/replay`) están prendidos desde antes del freeze (`FEATURES` en `src/lib/features.ts`);
  E2E en `insights-replay.spec.ts`. "Tu mes" no muestra un 0 de logros (sin culpa).
- Datos de Life OS (Ajustes → Tus datos, `lib/lifeData.ts`): exportar JSON completo y CSV de Dinero; borrar sólo Life OS
  (cuenta, perfil y ajustes quedan). La cuenta entera se exporta/borra desde Studio → Ajustes.
- Sin conexión: el + guarda en una cola local (`lib/outbox.ts`, id generado en el cliente, upsert sin duplicar) y se sube
  al volver la red; el aviso general de "sin conexión" es `src/components/ui/OfflineBanner.tsx`.

## Rendimiento (Lanzamiento L1)
- Plan de lanzamiento mundial: `docs/lanzamiento/00-plan.md` (fases L0–L8).
- Todas las rutas son `lazy` en `App.tsx`: quien abre un perfil no descarga la landing ni Business. GSAP y ScrollTrigger
  vienen de npm y sólo en la landing (`components/landing/landingLibs.ts`); no agregar `<script>` de CDN a `index.html`.
- Movimiento de la landing: `components/landing/motion.ts` (`useLandingMotion`) engancha efectos por atributo — `data-split`
  (títulos palabra por palabra con `SplitText`, que dibuja React), `data-tilt` (+ `.ml-spot`), `data-magnetic`, `data-parallax`,
  `data-rise` — y CSS en `landing-motion.css`. Todo respeta "reducir movimiento" (`reducedMotion()` en cada efecto de GSAP y
  keyframes sólo dentro de `prefers-reduced-motion: no-preference`); lo verifica `landing.spec.ts`.
  Rendimiento del scroll: animar sólo `transform`/`opacity` (nada de `box-shadow`, `left`, `background-position` o `filter`
  en bucle), las secciones fuera de pantalla quedan en pausa (`.ml-paused`), el canvas del hero se detiene cuando no se ve
  y no usar `scroll-behavior: smooth` en `<html>` (las anclas se mueven por JS). El hero es una sola pantalla (sin tarjeta fijada).
  Acentos de títulos: Geist sin cursiva (no hay cursiva cargada) con degradé fijo (`.ml-shine`, `.ch-line2`).
  "Todo conectado" (`SolutionSection` + `solution.css`): la huella de la marca al centro y una órbita por parte
  (Identidad, Organización y, con Business prendido, Negocios) con lo que tiene adentro (`solution.chips`, 12 idiomas).
  Órbitas concéntricas en un plano inclinado y aplastado (`--tilt`, `--k`) que giran juntas, con lo de cada una
  intercalado (`orbitStart`) para que nada se pise; cada cosa se endereza deshaciendo las transformaciones en orden
  inverso. Sólo transform/opacity; quieto con "reducir movimiento"; con mouse, el sistema se inclina en 3D. Decorativo
  (`aria-hidden`): lo dicen las tarjetas de abajo.
  "Hoy tu vida digital está fragmentada" (`FragmentationSection` + `fragmentation.css`) es la entrada a esa sección:
  herramientas que flotan a su ritmo con avisos (puntos, sin números), conexiones que se cortan y la huella apagada con
  interferencia; al bajar (scrub, termina con el dibujo en el medio de la pantalla) se ordenan en un anillo y la huella
  se enciende. Lo que anima CSS y lo que maneja el scroll van en elementos distintos (una animación CSS le gana a GSAP).
- `advancedChunks` sólo agrupa supabase y react (+ el ayudante de precarga de Vite en `vendor`: en el bloque de supabase
  hacía que toda página bajara Supabase): agrupar recharts/framer a mano arrastraba dependencias a todas las páginas.
- La entrada de la app no lleva Supabase ni i18next (antes de la V1: perfil 239 → 166 KB, landing 264 → 191 KB):
  - i18next es sólo de Business: el plugin `scripts/businessI18n.ts` agrega `import '@/i18n'` a cada archivo que usa
    `react-i18next`; el idioma se sincroniza con `syncBusinessLocale` (`src/i18n/businessLocale.ts`).
  - Lo que corre al abrir cualquier página pide el cliente con `loadSupabase()` (`src/lib/supabaseLazy.ts`); un visitante
    sin sesión guardada lo baja recién cuando la página terminó de dibujarse (`useAuth`).
  - Página pública, interruptores, errores y métricas usan `publicRpc` (`src/lib/publicRpc.ts`: POST a /rest/v1/rpc con el
    token de la sesión del dispositivo si hay; si venció, anónimo). No importar `@/lib/supabase` en `profile/` ni en la landing.
- Presupuesto de peso: `npm run check:budget` (después de `npm run build`, también en CI) mide JS+CSS gzip de perfil
  (185 KB), proyecto (175) y landing (215) con `dist/.vite/manifest.json`. Si un cambio lo supera, achicarlo antes de subir el límite.
- Fuentes desde `@fontsource` (`src/lib/fonts.ts`; las de títulos de perfil, a pedido en `ensureProfileFont`): nada de Google Fonts.
- Imágenes: `uploadMedia` las achica (avatar 640 px, resto 1920 px) y las pasa a WebP en el dispositivo (`lib/imageOptimize.ts`).
  También Business (`useImageUpload`: logos 640, fotos 1600; portada y banner 1920) y las fotos de testimonios (640).
- Zoom permitido en toda la app (sin `user-scalable=no`); los campos táctiles usan 16px para que iOS no haga zoom al tocarlos.

## Buscadores (Lanzamiento L2)
- `/sitemap.xml` → `api/sitemap.ts` (regla en `vercel.json`) con la RPC `public_sitemap`: sólo Spaces publicados con
  visibilidad "public" (sin suspensión propia ni del principal) y proyectos publicados y públicos. `public/robots.txt`:
  las rutas privadas terminan en `/` o `$` para no bloquear usernames que empiezan igual (lo verifica `tests/unit/sitemap.test.ts`).
- El HTML para buscadores (`api/og.ts`) declara `<html lang>` con el `default_locale` del perfil.

- Salida de la web: guía del dueño en `docs/lanzamiento/salida-web.md` (planes, Auth, Resend, Google, Turnstile, Search
  Console, monitor, DNS, 2FA, prueba final). `/sitemap.xml` lista la landing en los 12 idiomas con `xhtml:link`
  (hreflang) además de las páginas fijas y lo público; la landing agrega JSON-LD (`Organization` + `WebSite`) desde
  `useLandingLocale`. `/api/health` (Edge, sin caché): 200 si responde `get_site_flags`, 503 si no (lo mira el monitor
  externo; tests en `health.test.ts`). `public/.well-known/security.txt` (contacto de seguridad, vence cada año).

## Seguridad
- CSP en `vercel.json` (regla `/(.*)`): `script-src 'self'` + un `'sha256-…'` por cada `<script>` en línea de `index.html`
  (datos del perfil desde el HTML, esqueleto del hero y pantalla de carga). Lo que cambia (textos, Supabase, archivos del
  build) va en un `<script type="application/json">` que no se ejecuta: el script queda fijo y su hash no cambia entre
  builds ni entornos. `npm run build` termina con `scripts/check-csp.mjs`, que falla si falta o sobra un hash (y dice cuál poner) o si
  aparece un `<script src>` de otro origen o un `on…=` en línea. Nunca `'unsafe-inline'` en scripts. Único origen externo
  de scripts: `https://challenges.cloudflare.com` (Turnstile, CAPTCHA del registro; también en `frame-src`). Un iframe o una
  conexión de un tercero nuevo se suma en `frame-src`/`connect-src`. `vite preview` manda la misma CSP y
  `npm run test:e2e:prod` falla con cualquier violación. El service worker no intercepta otros orígenes (salvo Supabase).
- Límite de pedidos en `/api`: reglas del Vercel Firewall (panel), pasos en `docs/lanzamiento/firewall-api.md`.

## Idioma y región
- 12 idiomas: es, en, pt, fr, de, it, zh, ja, ko, hi, ar (RTL), ru — lista en `src/i18n/app/languages.ts`
  (sincronizada con los checks de `user_settings.language` y `profiles.default_locale`).
- Life OS, Studio y Profile usan diccionarios tipados por módulo en `src/i18n/app/{life,studio}/<idioma>.ts`
  (el español es la fuente; `tsc` obliga a que cada idioma tenga todas las claves). Mycen Business sigue con i18next (`src/i18n/*.ts`).
  Sin destello de español (`createNamespace`, `namespace.ts`): el diccionario del idioma guardado empieza a bajar al cargar
  el grupo y, mientras no llegó, el hook suspende (se ve el esqueleto del `Suspense` de las rutas); `setLang` espera los
  grupos ya cargados antes de cambiar. Si la descarga falla, español (no queda en blanco). E2E en `lang-flash.spec.ts`
  (texto visible desde el primer cuadro, diccionarios demorados). Detector de español compartido: `tests/e2e/support/spanish.ts`.
- Panel interno (super-admin): marca Mycen y diccionario `src/i18n/app/admin/<idioma>.ts` (`useAdminT`; fechas y números
  con `super-admin/lib/adminFormat.ts`) para la estructura y las pantallas de Mycen (Resumen, Denuncias, Verificaciones,
  Errores, Producto); las de Business siguen en español. `i18n-coverage.spec.ts` las recorre en inglés.
- Textos de la página pública (botones del sistema) en `src/modules/profile/lib/profileI18n.ts`.
- Landing (Lanzamiento L3a): diccionario `src/i18n/app/landing/<idioma>.ts` (`useLandingT`), selector de los 12 idiomas en
  el Navbar, `?lang=xx` fija el idioma y `useLandingLocale` pone título, descripción, `dir` (RTL en árabe), `hreflang` (12 +
  `x-default`) y canónica. Sin prueba social inventada: testimonios sólo de la tabla `testimonials` (si no hay, no se muestra).
- Acceso (L3b): login, registro, recuperar y cambiar contraseña con `useAuthT` (`src/i18n/app/auth/`), selector
  `components/ui/LanguageSelect.tsx` y `useLangDir` (RTL). Los errores de Supabase pasan por `authErrorMessage(err, t.errors, …)`
  y entre pantallas viajan códigos (`?message=password_updated`, `?error=expired|invalid`), nunca texto.
  CAPTCHA (Turnstile): `useCaptcha`/`CaptchaField` en registro, acceso y recuperar contraseña; apagado sin
  `VITE_TURNSTILE_SITE_KEY`, no se muestra en la app (Capacitor). Orden para prenderlo: `docs/lanzamiento/captcha.md`.
  El registro guarda `user_metadata.locale` (y `savePrefs` lo actualiza al cambiar de idioma): lo usan los mails.
- Mails (L3c): plantillas de Supabase Auth en `supabase/templates/` (12 idiomas por `.Data.locale`, español por defecto),
  generadas con `node scripts/build-email-templates.mjs` (no editar los `.html` a mano; un test lo verifica). SMTP: Resend
  (pasos en `supabase/templates/LEEME.md`).
- Legales (L4): `/terminos` y `/privacidad` salen de `src/i18n/app/legal/<idioma>.ts` (secciones con id; el español es la
  versión de referencia y las traducciones tienen la misma estructura, lo verifica `tests/unit/legal.test.ts`). Responsable:
  Resilio (Argentina), contacto `team@mycen.id`. Si se suma un proveedor o un dato nuevo, actualizar privacidad en los 12.
  Textos sin revisión de abogado: revisarlos antes de abrir al público.
- Preferencias de la cuenta en `user_settings` (idioma, moneda principal, monedas extra, zona horaria, inicio de semana):
  `src/lib/prefs.ts` (`usePrefs`, `savePrefs`), se cargan en `PrefsInit`. Ajustes en `/life/settings` y Studio → Ajustes.
- Zona horaria de Life OS: "hoy", meses, horas (Mi día desde las 18 h, recordatorios), claves de fecha, bordes de
  consultas y `p_tz` de fijos/cuotas usan `user_settings.timezone` (`lib/zonedTime.ts`, sólo `Intl`: `lifeToday`,
  `lifeDayOf(instante)`, `lifeNow()` = reloj de pared para cuentas de calendario, `startOfLocalDayISO`,
  `zonedTimeToDate`; `prefs.ts` la anota con `setAccountTimeZone`). Sin zona guardada (o inválida) sigue al celular, y
  la zona sólo se guarda si la persona la elige (`timezoneSaved`). `dayKey(d)`/`localDateKey(d)` con un Date de
  calendario leen campos locales; sin argumento, hoy de la cuenta. `LifeShell` espera las preferencias (máx. 5 s).
  Ajustes avisa si el celular está en otra zona ("Usar la del celular"). Tests en `zonedTime.test.ts` y `timezone.spec.ts`.
- Dinero: nunca sumar monedas distintas; cada movimiento guarda su `currency`.
- Fijos que se repiten cada mes (Dinero): `life_recurring_transactions` (día del mes, desde, `last_period`, pausa) y
  `life_transactions.recurring_id`/`recurring_period` (único por mes). La base carga lo vencido con
  `life_materialize_recurring(p_today, p_tz)` (lo llama `useMoney` una vez por día; sin duplicar, día 31 = último día,
  lo borrado no vuelve, al reanudar no se cargan los meses en pausa). App: `hooks/useRecurring.ts`, "Repetir todos los
  meses" en `TransactionSheet` y tarjeta "Fijos del mes". Migración `20261027000001_life_recurring_transactions.sql`,
  tests en `tests/db/life_recurring.test.sql` y `recurring.spec.ts`.
- Compras en cuotas (Dinero): `life_installment_plans` (total, 2–72 cuotas, primera fecha, `last_no`, `cancelled_at`;
  total ≥ 1 por cuota) y `life_transactions.installment_plan_id`/`installment_no` (único). La base carga las vencidas con
  `life_materialize_installments(p_today, p_tz)` (la llama `useMoney` junto con la de fijos): mismo día que la primera
  (31 = último día), total / cuotas redondeado y la última ajusta, sin duplicar, lo borrado no vuelve, nada después de
  cancelar. App: `hooks/useInstallments.ts`, `lib/installments.ts` (misma regla en el cliente), "En cuotas" en
  `TransactionSheet` (sólo gasto nuevo, excluyente con repetir), fila "3 de 12" y tarjeta `InstallmentsCard` (falta pagar
  por moneda; "Eliminar" borra la compra y sus cuotas). Migración `20261029000002_life_installments.sql`, tests en
  `tests/db/life_installments.test.sql`, `installments.test.ts` e `installments.spec.ts`.
- V1.1 en beta (hoy vacía; importar, calendario y voz ya están prendidas): `featureOn(name)` (`src/lib/features.ts`) prende para todos lo que esté en `FEATURES` y, para probar en
  producción, las funciones de `BETA` en el dispositivo que abrió la app con `?beta=1` (`?beta=0` lo apaga).
- Dinero por mes (después de la V1): `useMoney(month)` ('YYYY-MM') trae ese mes y el anterior; `MonthSwitcher` ‹ mes › (llega
  hasta el mes actual o el último con algo programado, `maxMonth`), "En qué se fue" (`categoryBreakdown`: gastos por categoría en la moneda principal, % y cambio contra el
  mes anterior; tocar una filtra), buscar en todos los movimientos (`useMoneySearch`: la base trae candidatos con `or`
  ilike y el nombre traducido de la categoría, el dispositivo confirma con `matchesSearch`; hasta 300) y filtrar por
  tipo/categoría. Memoria de categorías (`learnCategories` / `suggestCategory` en `lib/moneyInsights.ts`, desde
  `useCategoryMemory`: lo ya ordenado del último año, sin números ni signos; por las primeras palabras sólo si nunca fue
  ambiguo): la usan el importador del banco y el formulario de un movimiento nuevo (hasta que se elige a mano).
  Tests en `moneyInsights.test.ts` y `money-insights.spec.ts`. Ojo: nada posicionado debajo de un menú "⋯" (lo tapa).
- Fecha futura (Dinero, `lib/moneyFuture.ts`): lo programado se ve en la lista ("en N días", tono neutro) y en la
  búsqueda, pero `transactions`, totales, curva, "En qué se fue" y presupuestos cuentan sólo lo que ya llegó; lo del mes
  va en `upcoming` y la tarjeta "Próximos" (por moneda). La carga de fijos y cuotas no cambia. El + de Dinero sin
  conexión usa la misma cola que el + general (`createTransaction` → `lib/outbox.ts`, se ve enseguida); fijos, cuotas y
  compartidos no se pueden activar sin conexión (se explica). Tests en `moneyFuture.test.ts` y `money-fixes.spec.ts`.
- Categorías propias (Dinero): tabla `life_categories` (tipo, nombre 1–40 único por tipo entre las activas, color de
  `LIFE_COLORS`; se archivan, no se borran; tope 50 activas) y el movimiento o fijo guarda `'c:' || id` en `category`
  (trigger: sólo propias de la cuenta). Nombre y color de cualquier categoría (fija o propia; archivada sigue con su
  nombre, borrada = "Otros") sólo con `useCategoryLabels()` (`labelOf`/`colorOf`/`keysFor`, `lib/moneyCategories.ts`):
  nunca `t.categories[...]` suelto. `useCategories()` (lista compartida por la cuenta): "+ Nueva" en `TransactionSheet`
  (`CategoryForm`) y Ajustes → "Tus categorías" (`CategoriesCard`: editar, archivar con "Deshacer", restaurar). El CSV de
  Dinero exporta el nombre. Migración `20261029000001_life_custom_categories.sql`, tests en
  `life_custom_categories.test.sql`, `moneyCategories.test.ts` y `custom-categories.spec.ts`.
- Gastos compartidos (Dinero): el movimiento es lo que salió de tu bolsillo (pagaste vos → el total) o tu parte (pagó otra
  persona); las deudas van en `life_splits` (persona, `owed_to_me`|`i_owe`, monto, moneda, `settled_at`,
  `settlement_transaction_id`; RLS del dueño, movimiento vinculado sólo propio por trigger). "Compartido" en
  `TransactionSheet` (`SharedExpenseFields`: quién pagó, personas con sugerencias, partes iguales o a mano) → reparto en
  centavos en `lib/splits.ts` (`planSplit`, `balances` por persona y moneda). Tarjeta "Cuentas compartidas" + `SettleSheet`
  (`hooks/useSplits.ts`): saldar marca todo lo pendiente con esa persona y moneda y, si te debían, registra el ingreso
  "Juan te devolvió" ('Otros') por lo que te debían; lo que debías no suma otro gasto (tu parte ya estaba). Con
  `doneWithUndo`. Borrar un gasto compartido borra sus deudas pendientes. Editarlo recalcula las pendientes
  (`draftFromSplits` → `planSplit` → `diffSplits`, `useSplits.applyEdit`; misma persona y dirección conserva la fila;
  sacarle "Compartido" las borra con "Deshacer"); si algo ya se saldó, monto, moneda, tipo y reparto quedan bloqueados
  (se explica) y lo demás se edita (`splitsEdit.test.ts`). Migración
  `20261029000003_life_shared_expenses.sql`, tests en `life_shared_expenses.test.sql`, `splits.test.ts` y
  `shared-expenses.spec.ts`.
- Presupuestos amables (Dinero): `life_budgets` (categoría fija o propia `'c:' || id` con `life_check_category_owner`,
  moneda, monto > 0; único por categoría y moneda, hasta 60; vale para todos los meses). `lib/budgets.ts` calcula en el
  dispositivo lo gastado del mes en esa moneda, lo que queda, días que faltan y "por día" (mes en curso; un mes pasado sólo
  el resultado) y el estado (bien / cerca ≥ 85 % / pasado). `hooks/useBudgets.ts`, tarjeta `BudgetsCard` (barra con el
  color de la categoría, "+ Presupuesto", editar monto, borrar con "Deshacer"), `BudgetSheet`, "Poner un presupuesto" en
  "En qué se fue" y una línea en Mi día (`BudgetNudge`, la más relevante). Tono sin culpa: "fue $X más de lo previsto",
  nada de rojo. Migración `20261030000001_life_budgets.sql`, tests en `life_budgets.test.sql`, `budgets.test.ts` y
  `budgets.spec.ts`.
- Importar del banco (V1.1, `FEATURES.bankImport`, prendido para todos): botón en Dinero → `ImportBankSheet`. Todo en el dispositivo:
  `lib/bankImport.ts` (CSV con comillas y separador detectado, UTF-8 o Windows-1252, títulos y columnas adivinados en
  12 idiomas, débito/crédito o importe con signo, coma o punto decimal, fechas d/m, m/d, a-m-d y serie de Excel,
  duplicados contando repeticiones) y `lib/xlsx.ts` (lector de .xlsx sin dependencias con `DecompressionStream`; el
  .xls viejo se rechaza con un aviso). Entran como "Otros", hasta 2000 por vez. Tests en `bankImport.test.ts` y
  `bank-import.spec.ts` (fixture `tests/e2e/fixtures/banco.xlsx`).
- Tareas en el calendario (V1.1, `FEATURES.calendarFeed`, prendido): Life OS → Ajustes → `CalendarFeedCard`. Link privado
  `/cal/<token>.ics` (`vercel.json` → `api/calendar.ts`, Edge): RPC `life_calendar_feed(p_token)` (anónima; sólo tareas
  pendientes con fecha, sin notas), horas flotantes, avisos y `RRULE` (mensual con el último día si falta, como la app).
  Token de 64 en `life_calendar_feeds` (nadie lee la tabla; `life_calendar_token(p_rotate)`, `life_calendar_disable()`).
  "cal" reservado como username. Privacidad: el calendario elegido descarga las tareas (12 idiomas). Migración
  `20261028000001_life_calendar_feed.sql`, tests en `life_calendar.test.sql`, `calendarFeed.test.ts` y
  `calendar-feed.spec.ts`.
- Cargar con la voz (V1.1, `FEATURES.voiceCapture`, prendido): "Dictar" en el + (sólo si el navegador tiene reconocimiento de voz).
  `hooks/useSpeech.ts` (Web Speech API, idioma de la app) → `lib/voiceParse.ts` (reglas por idioma, en el dispositivo:
  tipo por palabras clave, primer número como monto con "mil/thousand…", hoy/mañana/día de la semana y hora) →
  `VoiceCaptureSheet` (se revisa y corrige antes de guardar; gasto/ingreso en "Otros", tarea con fecha y hora, idea).
  Privacidad: el reconocimiento del navegador (Google en Chrome, Apple en Safari), 12 idiomas. Tests en
  `voiceParse.test.ts` y `voice.spec.ts` (reconocimiento simulado).
- Diario privado (V1.1, `FEATURES.journal`, prendido): `/life/journal` (`LifeJournalPage`), se entra desde el
  encabezado de Brain (la barra de abajo sigue con 5). `life_journal_entries` (RLS sólo de la dueña; texto 1–10.000,
  fecha 1900…mañana, ≤ 20 por día y 20.000 por cuenta; `hooks/useJournal.ts`): varias por día, editar en el lugar,
  borrar con "Deshacer", buscar (la base trae candidatos con `ilike`, el dispositivo confirma sin acentos) y lista por
  mes. No entra en la búsqueda general, Insights, "Tu mes", métricas ni el calendario; sí en exportar y en "Borrar
  Life OS". Bloqueo en el dispositivo (Ajustes → `JournalLockCard`, `lib/journalLock.ts`): PIN de 4–8 dígitos
  guardado como hash PBKDF2-SHA-256 (600.000 vueltas, sal de 16 bytes) en `localStorage` (`mycen_journal_lock:<id>`),
  espera 30 s ×2 hasta 15 min desde el 3.er error, huella/cara opcional con WebAuthn de plataforma (sólo presencia,
  sin servidor); se vuelve a bloquear al salir, al pasar a segundo plano y a los 5 min sin uso. Olvidé el PIN =
  borra el bloqueo del dispositivo y cierra la sesión. No es cifrado: la UI y privacidad (12 idiomas) lo dicen.
  Migración `20261030000004_life_journal.sql`, tests en `life_journal.test.sql`, `journalLock.test.ts` y `journal.spec.ts`.
- Vaciar la cabeza: "Vaciar la cabeza" en el + → `BrainDumpSheet` (texto grande y "Dictar" con `useSpeech`).
  `lib/brainDump.ts` separa en cosas (línea, oración; comas sólo si son 3 o más) y cada una pasa por `parseVoice`; se
  revisa (tipo con un toque, monto, quitar) y "Guardar todo": tareas e ideas a Brain, gastos/ingresos a Dinero con
  `suggestCategory` u "Otros"; sin conexión, a `lib/outbox.ts`. Tests en `brainDump.test.ts` y `why-dump.spec.ts`.
- Entrar con Google (V1.1, `FEATURES.googleSignIn`, prendido): `GoogleButton` (`modules/auth/components/`) debajo del
  login y del registro. Google sólo da nombre, email y foto: la aceptación la pide Mycen, una sola vez. En el registro no
  va a Google sin la casilla del formulario; en el login no se pide y una cuenta nueva de Google sin `terms_accepted_at`
  pasa por `/auth/terms` (`AcceptTerms`, "Un paso más"; `TermsGate` en `App` no la deja usar la app hasta aceptar). `lib/googleSignIn.ts`: antes de salir anota
  idioma y referido (`mycen_oauth_pending`), Supabase vuelve a `/auth/callback` y `applyPendingSignup` completa
  `terms_accepted_at`, `locale` y `ref` sin pisar lo que haya. El nombre y la foto los da Google (`name`, `avatar_url`).
  Configuración en Google Cloud (Google Auth Platform) + Supabase → Providers → Google. E2E en `google-signin.spec.ts`.
- El contenido que escribe el dueño se muestra en su idioma original (`default_locale`) o en la traducción guardada en `translations`;
  la traducción automática con Claude está pendiente (Fase 7).
- Interfaz en español (rioplatense) primero.

## Tests
- `npm test`: tipos de los tests + unitarios (Vitest, `tests/unit/`). `npm run test:e2e`: Playwright (`tests/e2e/`) contra la app
  con Supabase simulado (`tests/e2e/support/mockSupabase.ts`, replica las RPC públicas: si cambia una RPC, actualizar el mock).
- `npm run test:db`: migraciones de Identity + `tests/db/*.test.sql` en un Postgres real (necesita PGHOST/PGUSER).
- CI (`.github/workflows/ci.yml`): lint de Identity/Studio/Life OS/tests, unitarios, build, E2E y base de datos en cada PR.
- Los E2E cubren lo que la migración de Identity no puede romper: URL pública, redirección de usernames viejos, perfil
  no publicado, módulos ocultos, vCard, autosave, QR con `?src=qr`, proyectos (`projects.spec.ts`), editor sin mouse (`editor.spec.ts`), links y Connect (`links-connect.spec.ts`), moderación (`moderation.spec.ts`), registro de errores (`errors.spec.ts`), landing en 12 idiomas con axe (`landing.spec.ts`), legales (`legal.spec.ts`), acceso en otros idiomas con axe (`auth.spec.ts`), Mis Spaces (`spaces.spec.ts`), onboarding (`onboarding.spec.ts`), Studio en los dos temas con axe (`studio-theme.spec.ts`), editor de escritorio (`desktop-editor.spec.ts`), apariencia y accesibilidad con axe (`appearance.spec.ts`), y cómo se ve y se guarda cada tipo de módulo
  (`modules.spec.ts`: si un cambio de módulo es deliberado, regenerar con `--update-snapshots` y revisar el diff).
- Red de seguridad de la V1 (etapa 15): destino después del login por tipo de cuenta (`login-routes.spec.ts`), axe en
  cada pantalla del onboarding en los dos temas (`a11y.spec.ts`, cero violaciones serias o críticas) y capturas de
  referencia (`visual.spec.ts`: 5 estructuras × 2 temas × 390/1280 px, "Mi día", Hábitos e Inicio de Studio en los dos
  temas; fecha, hora y zona fijas, sin animaciones ni avisos flotantes, tolerancia 2 % por el suavizado entre versiones
  de Chromium). Cambio de diseño deliberado → `npx playwright test tests/e2e/visual.spec.ts --update-snapshots` y revisar.

## Reglas
- No simular funcionalidades sin datos reales; no inventar métricas.
- Validar con `npx tsc -b`, `npm test`, `npm run build` (y `npm run test:e2e` si se toca Identity/Studio) antes de commitear; no sumar errores de lint nuevos.
- Sin `console.log` de debug en código público.

## Mycen V1 — reglas de trabajo
Documentos: `docs/design/DESIGN_SYSTEM.md` (sistema visual Universo / Amanecer y huella), `docs/v1/ROADMAP.md` (alcance),
`docs/v1/prompts/00…17` (una etapa por prompt), `docs/v1/PROGRESS.md` (avance del piloto automático).

### Sistema de diseño en el código (etapa 01)
- `src/design/tokens.css` (global, en `main.tsx`): variables `--my-*` sólo dentro de `[data-mycen-theme="universo|amanecer"]`
  y acento con `[data-mycen-accent="plasma|ion|nebulosa|aurora"]` (sin atributo = Plasma); `.my-sky` = cielo + estrellas
  (`public/design/stars-*.svg`, de `scripts/generate-starfield.mjs`). Unbounded en `src/design/fonts.css` (latin y latin-ext).
- `src/design/motion.css`: `.my-float(-1…6)`, `.my-spin`, `.my-pulse`, `.my-draw`, `.my-enter` / `.my-enter-item` (`--my-i`),
  todo dentro de `prefers-reduced-motion: no-preference`.
- `installLowFx()` marca `<html data-mycen-lowfx>` (reducir transparencia o ≤ 4 núcleos): el vidrio pasa a `--my-glass-solid`.
- Componentes en `@/design`: `GlassPanel`, `PrimaryAction`, `IconButton` (exige `label`), `Chip`, `StatusChip`, `Field`, `Sheet`
  (portal que copia tema y acento, foco atrapado, Escape). Sin textos propios: los traduce quien los usa.
- Huella (etapa 02): `src/lib/huella/` (copia exacta de `docs/design/huella.ts`, sin DOM; un test lo verifica) +
  `huellaSeed(profile)` = `id:huella_salt` (nunca el nombre). Componente `<Huella seed variant spin draw />` en `@/design`
  (decorativa, ids únicos por instancia; `draw` anima una máscara para no perder el punteado). Tests en `tests/unit/huella.test.ts`.
- Perfil V1 (etapa 03): `profiles.theme` suma `layout` (credencial|portada|editorial|bento|clasica), `mode` (universo|amanecer),
  `accent` (plasma|ion|nebulosa|aurora; después, 8 más), `huella_variant` y `cover`; columnas `huella_salt` (va con la versión publicada),
  `status_text` (≤ 60) y `available` (perfil vivo: `get_public_profile` los lee de la fila, sin volver a publicar). La base valida
  todo (`mycen_valid_profile_look`) y todavía acepta los valores viejos (dark/light/auto y #RRGGBB) hasta la etapa 06.
  `profileLook()` (`profile/lib/profileLook.ts`) interpreta lo viejo igual que `mycen_upgrade_theme` / `mycen_nearest_accent`
  (acento por tono). `ProfileView` arma las piezas y carga la estructura de `profile/layouts/` (un chunk por estructura);
  los módulos toman el tema por `lookVars` (--p-* → --my-*). Tamaño Bento por tipo en `moduleRegistry` (`bento`).
  Los objetos que se tocan no flotan (sólo la credencial); E2E en `profile-layouts.spec.ts`.
- Video y música (etapa 04): módulo `media` (`content.url` + `provider`/`kind` de referencia). `profile/lib/media.ts`
  (`inspectMediaUrl`/`parseMediaUrl`): lista cerrada (YouTube sin cookies, Vimeo, Spotify, SoundCloud, TikTok), links cortos
  rechazados, el iframe se arma con el id validado. Fachada `MediaModule` (chunk propio, huella del perfil por
  `ProfileHuellaContext`): nada de terceros hasta tocar "Reproducir" (lo verifica `media.spec.ts`). Bento: video L, música M
  (`bento` puede ser función). Los proveedores están en privacidad (12 idiomas).
- Último video (bio, `FEATURES.bioModules`): módulo `latest_video` (`content`: `url`, `channel_id` UC… o `handle` @…,
  `show_title`, `count` 1|3). Reglas puras en `profile/lib/latestVideo.ts` (link del canal, feed y respuesta; imports
  relativos porque también las usa la función Edge). `api/youtube-latest.ts` (`?channel=` o `?handle=`): con un @ lee la
  página del canal para saber el id, después el feed público; caché 30 min en la CDN, errores con códigos fijos. Sin volver
  a publicar. `LatestVideoModule` (chunk propio): fachada con la huella, sin miniaturas de ytimg, YouTube sin cookies al
  tocar; con error o sin videos no se muestra (en la vista previa, un aviso). Studio: `LatestVideoEditor` con "Probar".
  E2E en `latest-video.spec.ts` (mock en `support/mockYoutubeLatest.ts`), unitarios en `latestVideo.test.ts`.
- Formulario de contacto (etapa 05): módulo `contact_form` (`ContactFormModule`, chunk propio con sus textos en
  `profile/lib/contactFormI18n.ts`) → RPC `submit_profile_message` → `profile_messages` (RLS: el dueño lee, marca `read_at` y
  borra; nadie inserta directo). Sin email. Límites en la base: largos, ≤ 3 links, 5 por visitante/perfil/día (hash diario,
  sin IP), 200 por perfil/día; bots (trampa, < 3 s, agente) reciben "ok" sin guardar. Studio → Mensajes (`/studio/messages`)
  y `useUnreadMessages` (contador en la navegación, "Más" en el celular y el Inicio; servirá para el push nativo).
  `ProfileModuleContext` da a los módulos huella, handle y si es vista previa (en la vista previa no se envía).
- Colaboraciones (V1.1, `FEATURES.bioModules`): módulo `collab` (`CollabModule`, chunk propio, textos en
  `profile/lib/collabI18n.ts`; título, invitación, "Tarifas desde…" y texto del botón) → RPC `submit_profile_collab`
  (sólo con un `collab` publicado; mismos controles que el formulario y los límites cuentan juntos) → `profile_messages`
  con `kind 'collab'` y `details` (empresa, web https, formato de `COLLAB_DELIVERABLES` en `profile/lib/collab.ts`,
  presupuesto y fecha límite; la base valida con `mycen_valid_collab_details`). Studio → Mensajes filtra Todos /
  Mensajes / Colaboraciones y muestra los detalles. Migración `20261031000002_profile_collab_messages.sql`, tests en
  `tests/db/collab.test.sql` y `collab.spec.ts`.
- Suscribirse (módulos de bio, V1.1, `FEATURES.bioModules`): módulo `subscribe` (`SubscribeModule`, chunk propio, textos en
  `profile/lib/subscribeI18n.ts`; título, texto, nombre opcional si el dueño lo pide, botón y casilla de consentimiento
  obligatoria con el nombre del dueño — `displayName` en `ProfileModuleContext` — y link a privacidad) → RPC
  `subscribe_profile` → `profile_subscribers` (RLS: el dueño lee sin el hash y borra; nadie inserta directo). Email en
  minúsculas ≤ 254, único por perfil (repetido = "ok" sin revelar nada), 5 por visitante/perfil/día (hash diario, sin IP),
  500 por perfil/día, tope 50.000; bots reciben "ok" sin guardar. Mycen no le manda nada a la lista. Studio →
  Suscriptores (`/studio/subscribers`, en la navegación y en "Más"): buscar, borrar y "Exportar CSV"
  (`lib/subscribersCsv.ts`: escapado y fórmulas neutralizadas). Entra en exportar la cuenta; privacidad (12 idiomas).
  Migración `20261031000003_profile_subscribers.sql`, tests en `subscribers.test.sql`, `subscribersCsv.test.ts` y
  `subscribe.spec.ts`.
- Apoyame y Escuchá en (módulos de bio V1.1, `FEATURES.bioModules`): `support` = hasta 6 medios (Mercado Pago, PayPal,
  Ko-fi, Buy Me a Coffee y "otro link" con dominio validado y https; alias/CVU/CBU ≤ 60 y clave Pix ≤ 80 con "Copiar" y
  aviso `role="status"`), mensaje ≤ 140 y montos sugeridos como texto. Mycen no cobra ni procesa pagos (lo dice la tarjeta).
  `listen_on` = canción o disco, artista, portada (o la huella) y hasta 8 links, uno por plataforma (Spotify, Apple Music,
  YouTube Music, YouTube, Deezer, TIDAL, SoundCloud, Amazon Music; la plataforma se detecta por el dominio). Sólo links:
  ni reproductores ni íconos de terceros. Reglas puras en `profile/lib/support.ts` y `listenOn.ts` (la página vuelve a
  validar lo guardado), chunks propios `SupportModule`/`ListenOnModule` con textos en `supportListenI18n.ts` y CSS en
  `supportListen.css`; editores en `studio/components/supportListenEditors.tsx`. Tests en `support.test.ts`,
  `listenOn.test.ts` y `bio-support-listen.spec.ts` (5 estructuras × 2 temas con axe).
- Plantillas de Identity: `studio/lib/templates.ts` (puro: Músico/a, Creador/a, Profesional, Negocio local, Personal →
  estructura, acento y tipos de módulo en orden; textos en `templates` del diccionario de Studio). Los módulos se crean
  VACÍOS, OCULTOS y con `config.template` ("Completá esto"; `addTemplateModules` en `lib/applyTemplate.ts`): el ojo no los
  muestra vacíos, abre el editor; guardarlos completos en `ModuleEditor` les saca la marca y los pone visibles. Así nada
  inventado entra en la versión publicada. Nunca borra; no repite `SINGLETON_TYPES` ni apila pendientes. Studio → Módulos
  "Usar una plantilla" (`TemplatePicker`, estructura y acento opcionales) + aviso "Completá tus módulos"; el onboarding
  aplica la del propósito en el paso de contacto (sin repetir lo cargado). Tests en `templates.test.ts` y `templates.spec.ts`.
- Apariencia (etapa 06): `AppearancePage` = estructura (miniaturas con la huella real), tema, acento, huella (estilos +
  "Generar otra" → `huella_salt`, con "Volver a la anterior" hasta publicar), portada (sólo Portada) y perfil vivo
  (`status_text`, `available`). Guarda siempre los valores nuevos del tema; vista previa en vivo al costado (≥ 1280 px) o
  en la misma página. Las opciones viejas (esquinas, fondo, tarjetas, tipografía, contraste) ya no están en la interfaz.
- Onboarding (etapa 07a): `OnboardingWizard` en 7 pantallas — nombre, username, para qué (personal→credencial,
  creador→portada, profesional→editorial, negocio→bento; crea el perfil con un `contact_form` y `onboarding_step` 3), foto
  (se puede saltar), WhatsApp/Instagram (red social + acción principal; paso 4), el momento de la huella (Universo) y vista
  previa → "Publicar perfil" (paso 5 + `publishSpace`). Si se corta, sigue donde quedó. E2E en `onboarding.spec.ts`.
- Studio con el sistema de diseño (etapa 07b): `.st-root` (y los portales: barra móvil, pantalla completa) llevan
  `data-mycen-theme` según el celular (`useStudioTheme` / `useStudioSurface` en `studio/lib/useStudioTheme.ts`, fondo con
  `THEME_BG`); las `--st-*` de `studio.css` sólo traducen a `--my-*` (estados nuevos `--my-danger/ok/warn`). Barra móvil:
  Inicio, Editar, Mis Spaces, Compartir, Más (la vista previa pasó a "Más"). Mis Spaces explica qué es un Space con
  ejemplos y el link que tendría; un Space nuevo sigue por Apariencia. axe en los dos temas: `studio-theme.spec.ts`.
- Compartir y crecimiento (etapa 08): `/studio/everywhere` (`EverywherePage`, desde el Inicio, Compartir y "Perfil
  publicado"): copiar el link y pasos generales por plataforma en un solo archivo `src/i18n/app/share/everywhere.ts`
  (12 idiomas; cada plataforma copia su link con `?src=`). QR con huella (`HuellaQr`, sólo en Studio): blanco con
  `QR_COLORS`, corrección H, zona de silencio, usuario debajo; PNG y SVG. Imagen al compartir: `api/og/[slug].tsx`
  (cielo del tema, huella con `huellaToSvg`, nombre; fuentes en `public/fonts/og/`) y `api/og.ts` la pide con `?v=`
  (cambia con el aspecto). `profileLook.ts` usa imports relativos porque también lo usa esa función Edge.
  "Creá tu identidad": `/register?ref=<handle>&tipo=<propósito>` (`signupLink`, `src/lib/referral.ts`) → `user_metadata`
  → el onboarding preselecciona el tipo y llama a `record_referral` (tabla `referrals`: una por cuenta, sólo perfiles
  publicados de otra persona). "Tu semana" (`WeekCard`, `lib/weekly.ts`): visitas, acción principal, contactos y
  mensajes de 7 días y de dónde llegaron; la visita toma `?src=` o `utm_source`.
- Tareas que se repiten (etapa 09): `life_brain_items.recurrence` (`{ freq, interval?, weekdays?, monthday? }`, sólo
  tareas con fecha), `subtasks` (`[{ id, text, done }]`, ≤ 20 y ≤ 200 caracteres) y `next_occurrence_id`; la base valida
  (`life_valid_recurrence` / `life_valid_subtasks`). `lib/recurrence.ts`: `nextOccurrence` (fechas locales; mensual con
  el último día si no existe; atrasada → la primera desde hoy) y el selector (`repeatChoiceOf` / `recurrenceFor`). Al
  completar, `useTasks` crea la siguiente (hora, aviso y subtareas sin hacer) y la anota; al destildar, la borra si no se
  hizo. Ficha: `RepeatField` y `SubtasksField` (`TaskExtras.tsx`); lista con ícono y "3 de 5"; el calendario muestra las
  próximas repeticiones. E2E en `tasks.spec.ts`. Una sola siguiente: `occurrence_of` (en la siguiente, su origen) con
  índice único y trigger de dueña (`20261103000002_life_task_next_once.sql`); si llega 23505, `useTasks` usa la que
  existe. Tildar bloquea la tarea mientras se guarda (`useSavingTasks`, casillero deshabilitado). Tests en
  `life_task_next_once.test.sql` y `life-once.spec.ts`.
- Hábitos (etapa 10): `life_habits` suma `target_value` (null = sí/no), `unit`, `anchor` ("después de…"),
  `reminder_time`/`reminder_enabled`; `frequency` admite `{ type: 'times_per_week', times }`; `life_habit_logs.value`
  (con cantidad, el día se cumple con `value >= target_value`). Rachas que perdonan en `lib/habitStreak.ts` (un día
  programado perdido no corta, dos seguidos sí; por semana igual con semanas; hoy nunca cuenta como perdido).
  `useHabits`: `addToday` ("+1"), `setDayValue`, `weekCount`, `streakUnit`. UI: `QuantityButton` (anillo), `HabitMeta`,
  `HabitValueSheet` (`components/HabitControls.tsx`). Recordatorio por hábito: `useHabitReminders` (con Life OS abierto,
  una vez por día y hábito). E2E en `habits.spec.ts`.
  Recordatorios (hábitos y tareas) con varias pestañas: `lib/reminderLeader.ts` — avisa sólo la pestaña líder
  (`electLeader`: Web Locks o, sin ellos, alquiler en localStorage + `BroadcastChannel`); `reminderLoop` lee la base al
  abrir, al volver a la pestaña, con `remindersChanged()` (lo llaman `useTasks`/`useHabits` al cambiar algo) y cada
  5 min, y compara horas en el dispositivo cada 30 s. Hábitos: marca por hábito y día antes de avisar (`claimMark`),
  marcas de más de 7 días se borran; tareas: avisa quien logra marcar `reminded_at` (sólo si seguía vacío).
  Tests en `reminderLeader.test.ts` y `life-once.spec.ts`.
- "¿Por qué lo hago?": `why` (≤ 200, no en blanco; vacío = null) en `life_habits` y `life_goals` (migración
  `20261030000003_life_why.sql`, tests en `life_why.test.sql`). `components/Why.tsx`: `WhyField` (al crear/editar),
  `WhyQuote` (discreta en la tarjeta del hábito, la de la meta y su ficha, y en "Qué bueno verte de vuelta") y
  `LetGoDialog`: antes de desactivar o borrar un hábito, o borrar una meta, con frase → "Lo empezaste porque: …" con
  "Seguir intentando" / "Soltar igual" (sin frase, como siempre). E2E en `why-dump.spec.ts`.
- "Mi día" (etapa 11): `/life` (`LifePage`) es "Mi día": `MyDaySection` (`components/MyDay.tsx`) arriba con hasta 3
  prioridades (tareas o texto; una cuarta explica por qué son 3) y "Cerrar el día" (resaltado desde las 18 h). El cierre
  (`DayReviewSheet`) muestra primero lo logrado (hábitos, tareas hechas hoy y prioridades, con celebración breve), después lo
  que quedó (pasar a mañana, cambiar fecha o soltar; soltar una tarea que se repite salta a la próxima) y "¿Cómo te fue
  hoy?". Datos: `life_daily_reviews` (una por persona y fecha local; `useDailyReview`). Debajo siguen tareas de hoy,
  hábitos, la meta en foco y el mes. `LifeSheet` va en un portal (si no, quedaba bajo la barra). E2E en `my-day.spec.ts`.
  La tarjeta "Mi identidad" (`HubSection`, → Studio) va arriba de Mi día; se oculta o se muestra en Life OS → Ajustes
  ("Mi día", `useHomePrefs` en `lib/homePrefs.ts`, guardado en el dispositivo).
- Ánimo y revisión semanal (V1.1, `FEATURES.lifeReflection`, prendido): en el cierre del día 5 caritas (`MoodPicker`,
  botones con nombre y `aria-pressed`; un toque guarda, tocar otra vez borra) → `life_daily_reviews.mood` (1–5, null =
  no contestó). `lib/mood.ts`: Insights `moodHabits` (sólo si fue más alto) y `moodSpend` con ≥ 14 días con ánimo, ≥ 5 de
  cada lado y ½ punto de diferencia; textos en condicional, sin causas. "Tu mes" suma "Cómo te sentiste" si hay datos.
  "Tu semana en 5 minutos" (`components/WeeklyReview.tsx`): tarjeta en Mi día el último día de la semana (`week_start`;
  "Ahora no" la guarda en el dispositivo) y en Insights → "Tus semanas" (revisar cuando quieras + semanas anteriores).
  3 pasos: lo que salió bien (tareas, hábitos y ánimo reales + texto), qué soltar (atrasadas: semana que viene, fecha o
  soltar) y hasta 3 focos (texto o tarea con fecha al empezar la semana) → `life_weekly_reviews` (una por semana; `wins`/
  `let_go` ≤ 500, `next_focus` como las prioridades). Migración `20261030000002_life_reflection.sql`, tests en
  `life_reflection.test.sql`, `reflection.test.ts` y `reflection.spec.ts`.
- Life OS con el sistema de diseño y tono sin culpa (etapa 12): `LifeShell` pone `data-mycen-theme` en `<html>` según el
  celular (también lo heredan las hojas en portal) y `MotionConfig reducedMotion="user"`. Los tokens de
  `life/design-system/tokens.ts` apuntan a `--my-*` y a `life.css` (`--life-money|goals|habits|brain` por tema y
  `--life-ink`); `tint(color, %)` para transparencias (sirve con variables) e `ink(color)` para los colores que elige la
  persona (hábito, meta, categoría): se mezclan con el texto del tema para leerse en los dos. Texto con acento:
  `colors.accent.ink`. Nada de hex sueltos en Life OS. Contraste en `tests/unit/lifeTokens.test.ts`, axe en
  `life-theme.spec.ts`. Momentos amables (`lib/kindMoments.ts`, `components/KindMoments.tsx`): "Qué bueno verte de
  vuelta" tras 3 días o más sin entrar (un solo hábito sugerido, sin rachas en Mi día ese día), "nuevos comienzos" el
  primer día de la semana (`week_start`) y el 1 del mes (una vez por fecha), "Este mes…" en Hábitos (sólo se compara con
  uno mismo y sólo si fue mejor). Logros = avisos de progreso real ("Tu progreso"). Al completar: `celebrate()`
  (vibración de 15 ms) + `.life-pop` (sin "reducir movimiento"). Anillos: `MiniProgressRing` (hoy y semana).
- Marca (etapa 13): hero de la landing con el cielo de Universo y la huella de la marca (semilla "mycen", sin canvas);
  `StructuresSection` (las 5 estructuras × 2 temas) y "Mi día" en `LifeOSSection` son imágenes WebP de ejemplo en
  `public/landing/`, generadas con `npx playwright test --config scripts/landing-shots/playwright.config.ts` (la app
  servida como mycen.id; no corre en CI). `brand.spec.ts` (mismo config) genera el SVG maestro del ícono
  (`design/app-icon/mycen-app-icon.svg`), favicon (svg/ico/png), apple-touch, íconos del manifest y
  `public/email/huella.png`. `theme-color` según el tema del celular. Mails en paleta Amanecer con la huella en PNG
  (`scripts/build-email-templates.mjs`). Rendimiento de la landing: esqueleto del hero en `index.html`
  (`scripts/heroShell.ts`, textos de los diccionarios al compilar; `CinematicHero` lo saca al montar), secciones que se
  montan de a una (`LandingPage`, `shown`; los efectos de `useLandingMotion` se enganchan al final), framer-motion sólo
  si hay testimonios, `Geist Fallback` con `size-adjust` para no saltar al cargar la fuente. Lighthouse celular: 74
  (antes 42); llegar a 85 pide pre-render o sacar Supabase del arranque (V1.1).
- Métricas propias (etapa 14): `product_events` (RLS sin políticas) ← `track_product_event(event, props)` (lista cerrada
  de 13 eventos, props planas con claves conocidas y textos ≤ 64, sin contenido; 300 por cuenta y hora, sin sesión sólo
  `signup_started`). En la app: `trackEvent` / `trackOncePerSession` (`src/lib/productEvents.ts`, en segundo plano, si
  falla se ignora). Panel `/super-admin/producto` (`ProductTab`) con `admin_product_metrics(days)`: mediana hasta
  publicar, % publicadas, retención de Life OS por cohorte semanal (día 1, días 7–13, días 30–36), hábito 4+ días por
  semana, tasa de regreso y registros por referido. Privacidad: "Uso de la app" (12 idiomas). E2E en `metrics.spec.ts`.
- Métricas de Life OS (`20261111000001_life_os_metrics`): la lista de eventos vive en la tabla `product_event_types`
  (FK desde `product_events`); para sumar uno: `insert into product_event_types … on conflict do nothing` (no redefinir
  `track_product_event`). Eventos: `goal_created`, `item_linked_to_goal {tipo}` (`trackGoalLink` en las hojas, sólo si la
  meta es nueva para el ítem), `capture_used {tipo: quick|voice|dump, dest, count?}` (`trackCapture` en `CaptureButton`),
  `weekly_review_done` (primera vez que se termina la semana), `reminder_shown`/`reminder_opened {kind, channel: app|push}`.
  Sus props se validan con valores fijos (`mycen_valid_event_shape`). Los push mostrados los registra la Edge Function
  `life-reminders` (service role, uno por recordatorio entregado); al tocar un aviso la URL lleva `?aviso=<kind>.<channel>`
  y `useReminderOpened` (`lib/reminderOpen.ts`, en LifeShell) lo registra y lo saca. El panel suma integración con metas,
  captura por tipo y destino, revisiones, tasa de apertura por canal y mediana hasta el primer valor (del registro al
  primer `life_priorities_set`, `habit_logged` o `task_completed`, calculado en la RPC). E2E en `life-metrics.spec.ts`.
- Constancia de hábitos (Metas, Insights, Replay): `habitConsistency` (`lib/habitStreak.ts`), la misma regla que Hábitos:
  días programados, o "X veces por semana" por semana (hasta X; la semana en curso sólo suma lo hecho), y con cantidad sólo
  los días que llegaron a la meta (`isDone`).
- "Agregar a inicio" (después de la etapa 15): `InstallAppButton` (`src/components/ui/`) en el encabezado de Mi día y del
  Inicio de Studio, textos en `src/i18n/app/install.ts` (12 idiomas). Con la ventana del navegador (Chrome, Edge,
  Android) instala directo; en iPhone/iPad o Android sin esa ventana muestra los pasos; instalada, no aparece
  (`useInstallPWA`, `installMode`). E2E en `install.spec.ts`; `visual.spec.ts` la marca como instalada.
- Inicio de Studio con el perfil arriba (después de la etapa 15): tarjeta `.st-profile-hero` en `OverviewPage` (foto o
  huella, nombre, descriptor y dirección sobre la huella del perfil, con su acento), "Abrir perfil" (si está publicado) y
  "Editar identidad"; debajo siguen estado, link, Tu semana y pendientes.
- Seguridad (auditoría V1, `docs/seguridad/auditoria-v1.md`): `super_admins` y `site_config` sólo para admins (sin
  escritura desde la app), fotos sin listado público (cada cuenta lista su carpeta), CSP mínima en `vercel.json`.
  `access_requests`: el formulario público sólo crea solicitudes nuevas; leerlas y aprobarlas, sólo admins.
  Migraciones `20261023000001_security_hardening.sql` y `20261023000002_access_requests_admin.sql`, tests en
  `tests/db/security.test.sql`.
  Auditoría total (antes del freeze): metas sólo propias en Life OS (trigger `life_check_goal_owner`,
  `20261026000001_life_goal_owner.sql`), aviso de "sin conexión" en 12 idiomas (`src/i18n/app/offline.ts`) y recorrido de
  todas las pantallas en `smoke-routes.spec.ts` (sin errores, sin pantalla de error, sin scroll de costado).
- Landing: las tarjetas de Business dicen "Próximamente" y no llevan a ningún lado (Business no está abierto en la V1).
- Interruptor de Business: `mycen_site_flags` (nadie lee la tabla) ← `get_site_flags()` (anónima) y
  `admin_set_site_flag` (sólo super-admins; Super-admin → Landing, `BusinessSwitch`). `src/lib/siteFlags.ts`
  (`useSiteFlags`, lo último visto queda en el dispositivo; sin respuesta, apagado). Apagado (de entrada): la landing no
  muestra la sección de Business, Precios (sección y links del menú y del pie), el satélite "Negocios" ni la pregunta de
  cancelar el plan; la de "¿Puedo usar Mycen para mi negocio?" responde con `faq.businessSoon` y el cierre usa
  `cta.subtitlePersonal`. La app no cambia (quien ya tiene un negocio lo sigue usando). Migración
  `20261104000001_site_flags.sql`, tests en `site_flags.test.sql` y `business-switch.spec.ts`.
- Acentos (después de la etapa 15): 12 (`MYCEN_ACCENTS` en `design/themes.ts` = `tokens.css`, un test compara): los 4
  originales + sol, rosa, lima y los sobrios luna, mono, grafito, pizarra y arena. La base valida los nombres
  (`20261024000001_v1_more_accents.sql`); la conversión de colores viejos sigue eligiendo entre los 4 originales.
- "Elegí tu nombre" (registro más rápido): `ClaimName` (`src/components/claim/`, textos en `src/i18n/app/claim.ts`, 12
  idiomas) = campo `mycen.id/<nombre>` que consulta `check_username` por `publicRpc` (sin Supabase) y ofrece alternativas
  libres (`claimSuggestions`). Está arriba de la landing (`CinematicHero`), en el cierre (`FinalCTA`), en un perfil que
  no existe si el nombre está libre (`FreeName`, chunk propio; reservado o con dueño = el aviso de siempre) y en el pie
  del perfil ("Creá tu identidad" lo abre; conserva ref y tipo). Lleva a `/register?u=&desde=hero|cierre|perfil|pie`
  (`src/lib/claim.ts`); el registro (email o Google/Apple, `PendingSignup`) guarda `claimed_username`/`claim_from` en la
  cuenta y el onboarding salta el paso de la dirección si sigue libre (si no, lo muestra). `signup_started` y
  `signup_completed` llevan `channel` = el lugar; el panel → Producto lo muestra en "Desde dónde se registran"
  (`admin_signup_sources`, migración `20261113000001_signup_sources.sql`, tests en `signup_sources.test.sql`). Reglas del username sin dependencias en `src/lib/username.ts`.
  No reserva: el nombre es de la persona al crear su perfil. E2E en `claim.spec.ts`.
- Fotos en los módulos (auditoría): una foto suelta (`ImageModule`) muy alta se recorta a 4:5 y una chica (< 320 px) no se
  agranda; una que ya no carga no deja ícono roto (`SafeImage` con `onFail`: la foto suelta y la de un texto se ocultan,
  la galería saca la miniatura, la portada de video/música vuelve a la huella). Texto con foto = `.mp-card-media` (la foto
  llega a los bordes en las 5 estructuras). Visor de la galería con flechas táctiles, contador y página quieta. Studio
  marca la foto guardada que ya no carga (`StudioThumb`, `imageBroken`). Una HEIC que el navegador no convirtió no se
  sube. Pruebas con fotos reales: `tests/e2e/support/testImages.ts` (PNG de cualquier tamaño, transparente o rota),
  `imageStress.ts` y `images.spec.ts`; el mock sirve imágenes de verdad para el almacenamiento y `cdn.example.com`.
- Links en los módulos (auditoría): una sola regla en `profile/lib/safeUrl.ts` valida en Studio y dibuja en la página.
  `cleanLinkInput` saca comillas, `<…>`, el punto o coma final y lo pegado encima del "https://"; arregla "https//".
  `safeHref` acepta un dominio suelto (también con letras de otros idiomas, puerto, `?` o `#`) y un email suelto
  (→ `mailto:`), y rechaza lo que no abriría nada o engaña: dominio sin punto o con espacios, `usuario@sitio`,
  `localhost`, `mailto:`/`tel:` vacíos. `withWebScheme` sirve para video y música (`youtube.com/watch…` sin https,
  también music.youtube.com). WhatsApp necesita el código de país (`whatsappNeedsCountry`: con `+`/`00` o un link
  wa.me alcanza con 8 dígitos; sin eso, 11): Contacto, Red social → WhatsApp y el onboarding lo piden con
  `badWhatsapp`; el teléfono con `badPhone`. Red social: un link pegado en "Usuario" se usa tal cual y un usuario con
  espacios se rechaza (`socialUrl`). Al salir de un campo de link (`urlOnBlur`), un email pasa a `mailto:`. Tests en
  `safeUrl.test.ts`, `urlInput.test.ts` y `modules-create.spec.ts` (cada tipo de módulo creado desde Studio con links
  pegados como vienen, publicado y con cada botón llevando al lugar correcto).
- Supabase → Advisors (auditoría de lanzamiento, `20261114000001_advisor_hardening.sql`, tests en
  `advisor_hardening.test.sql`): las vistas `view_*` de Business pasan a `security_invoker` y sin lectura anónima; toda
  función propia lleva `set search_path = public, extensions, pg_temp`; triggers sin EXECUTE para nadie y `admin_*` sólo
  para `authenticated` (Supabase da EXECUTE a `anon` por defecto: una función del panel nueva necesita
  `revoke … from public, anon`); buckets públicos de Business sin listado (`business_media_owner_select`); las políticas
  usan `(select auth.uid())` (se calcula una vez por consulta). Política nueva: escribirla ya con `(select auth.uid())`.
  Lo que queda en el panel de Supabase: "Leaked password protection" (Auth → Providers → Email) y `pg_trgm` en public.
- Movimiento del perfil: las entradas arrancan con opacidad 0,01 (no 0): Chrome no cuenta como visible (LCP) un
  elemento en 0 hasta que termina la animación (con 0, el LCP real del perfil era 2,3 s; con 0,01, 0,6 s).
- "Poné tu Mycen en todos lados": sólo botones de copiar (general y uno por plataforma con `?src=`), sin pasos por app.
- Verificación de cuenta (antes V1.1, sumada antes del freeze): Studio → Ajustes → "Verificación" (`useVerification`,
  RPC `request_verification`: mensaje 10–1000, link https opcional, uno pendiente por vez, 3 cada 30 días) →
  `verification_requests` (el dueño lee el suyo) → `/super-admin/verificaciones` (`admin_list_verifications`,
  `admin_resolve_verification`, `admin_set_verified`). `identities.verified_at` sólo lo cambian esas RPC (trigger) y
  `get_public_profile` devuelve `verified` para todos los Spaces: tilde `.mp-verified` junto al nombre en las 5
  estructuras (también en la vista previa de Studio). Migración `20261025000001_v1_verification.sql`, tests en
  `tests/db/verification.test.sql` y `verification.spec.ts`. Privacidad actualizada (12 idiomas).
- Errores de contraseña de Supabase (`code: weak_password`, reglas o contraseña filtrada) muestran `weakPassword`.
- Áreas táctiles de 44 px (auditoría v2, #22): `src/design/touch.css` da a cada botón/link/control de Life OS
  (`html[data-mycen-theme]`), Studio (`.st-root` y portales), el perfil (`.mp-root`) y `.my-tap-root` (acceso, legales,
  super-admin) un `::after` transparente de ≥ 44 px (detrás del contenido, `isolation`) sin cambiar el dibujo; los links
  dentro de un párrafo quedan afuera. Si hay vecinos pegados o un contenedor con scroll, agrandar de verdad (filas de
  44 px). `touch-targets.spec.ts` mide a 390 px y prueba el toque en los bordes (excepciones: links en texto,
  deshabilitados y `data-touch-dense`, hoy sólo los 7 puntos de la semana de Hábitos).
- Pantalla de carga: `scripts/bootSplash.ts` (plugin de Vite) pone en `index.html` la huella de la marca (semilla "mycen")
  centrada y girando sobre el fondo del tema del celular (quieta con "reducir movimiento"; en "/" no, la landing tiene su
  esqueleto). `src/lib/bootSplash.ts`: la app la saca al dibujar la primera pantalla (`BootSplashDone` en `App.tsx`) y la
  muestra mientras baja otra ruta (`RouteLoading`); por las dudas se va sola a los 12 s. iPhone instalado: `body` lleva
  `padding-top: env(safe-area-inset-top)` y lo fijo arriba (barras, cajones) usa `top`/`padding` con ese valor.
- Celular (teclado, ancho y gestos): `installViewportVars` (`src/lib/viewportVars.ts`, en `main.tsx`) anota `--kb`
  (alto del teclado) y `--vvh` (alto visible) con `visualViewport`; `LifeSheet`, `.my-sheet-backdrop`, `.st-overlay` y
  `.st-dialog-wrap` se apoyan arriba del teclado y nunca son más altos que lo visible; su contenido sólo se mueve para
  arriba y abajo. Nada de `autoFocus` en hojas: `ref={focusOnMount}` (enfoca sin mover la pantalla). Fechas y horas de Mycen van
  en `PickerWrap` (`components/ui/PickerWrap.tsx`; `TextField` de Studio y `Field` del sistema de diseño lo hacen solos):
  sin dibujo nativo (en iPhone no se achicaban y se pisaban) y con ícono de calendario/reloj (vacías, si no, quedaban en
  blanco); sólo dentro de `.my-picker`, Business sigue nativo. Brain cambia de vista deslizando de costado
  (`hooks/useSwipeNav.ts`: gesto claramente horizontal, no sobre campos ni zonas con scroll de costado; RTL invertido).
  La landing en el celular muestra idioma y cuenta (sin menú hamburguesa). Con una hoja o diálogo abierto lo de atrás
  queda quieto: `useScrollLock` (`src/lib/scrollLock.ts`, cuenta hojas abiertas) bloquea `<body>` y cada
  `[data-scroll-root]` (Life OS y Studio scrollean su marco, no la página); fondos con `touch-action: none`, hojas con
  `pan-y pinch-zoom` y `overscroll-behavior: none` (no se arrastran ni rebotan). Grillas en hojas con `minmax(0, 1fr)`
  o `auto-fill` (nada de `repeat(N, 1fr)` con mínimos que no entran en 320 px). E2E en `swipe-sheets.spec.ts`.
  En Studio `.st-row` y `.st-topbar` bajan a otra línea lo que no entra y `.st-btn` parte su texto antes de salirse.
  Auditoría de diseño permanente: `layout-audit.spec.ts` (detector en `support/layoutAudit.ts`) recorre a 320 px todas
  las pantallas (español y ruso), el perfil con todos los módulos (5 estructuras × 2 temas) y cada editor de módulo:
  nada se sale de la pantalla ni de su recuadro, nada queda cortado y los controles no se pisan.
- Pantallas de acceso (login, registro, recuperar, cambiar contraseña, aceptar términos): `AuthBrand` (huella de la
  marca de `src/lib/brandMark.ts`, la misma de la pantalla de carga, y "mycen.id" debajo); sin link al panel del equipo.
- Panel del equipo (auditoría del panel): menú en dos grupos — Mycen (Resumen, Personas, Denuncias, Verificaciones,
  Errores, Producto, Actividad del equipo, Landing, Testimonios) y Business (plegable; abierto si Business está prendido)
  —, contadores de pendientes (`admin_pending_counts`), huella de la marca y, en el celular, barra de abajo (Resumen,
  Personas, Denuncias, Errores, Más) sin hamburguesa. Resumen (`HomeTab`, `admin_overview`): cuentas, publicados, Life OS
  activo, verificadas/suspendidos, "Para revisar" con links y barras de 30 días; el resumen viejo de Business va debajo
  sólo con Business prendido. Personas (`PeopleTab`, `?q=`/`?id=`): `admin_search_accounts` (email, usuario o nombre;
  comodines como texto) y `admin_account_detail` (Spaces con denuncias/mensajes/suscriptores, verificar, suspender con
  motivo, Life OS sólo en cantidades). Actividad (`ActivityTab`): triggers `mycen_audit` anotan solos en
  `admin_audit_log` (nadie lee la tabla; `admin_list_audit`) cada suspensión, verificación, denuncia o pedido resuelto,
  error y interruptor que cambia un super-admin. Migración `20261105000001_admin_console.sql`, tests en
  `admin_console.test.sql` y `admin-console.spec.ts`; textos en `src/i18n/app/admin/` (12 idiomas).
- Portada automática (Video y música, "Escuchá en"): al pegar un link de YouTube, Vimeo, Spotify, SoundCloud o TikTok sin
  portada, Studio (`studio/lib/autoCover.ts`, `useAutoCover`) pide `/api/media-cover?url=` (Edge: reglas puras en
  `profile/lib/mediaCover.ts` — YouTube por i.ytimg, el resto por oEmbed; sólo servidores de imágenes de cada proveedor,
  tope 6 MB) y la sube con `uploadMedia` (WebP) como `content.cover_url`. La página la muestra desde Mycen
  (`.mp-media-cover` en `MediaModule`), así el visitante no se conecta con el proveedor; se puede cambiar o sacar y no
  se vuelve a buscar para el mismo link. Los editores propios reciben `fields`/`setField` (la de "Escuchá en" completa
  su campo `cover_url`). Privacidad (12 idiomas). Tests en `mediaCover.test.ts` y `media.spec.ts`.
- App de iOS y Android (Capacitor 8, `capacitor.config.ts`, `ios/`, `android/`; pasos y lo que hace el usuario en
  `docs/app/README.md`, fichas de las tiendas en `docs/app/STORE.md`). Es la misma web: `src/lib/platform.ts`
  (`isNativeApp` sin importar @capacitor/core, `webOrigin()` = mycen.id en la app, `apiUrl()` para `/api`,
  `authCallbackUrl()`); nada de `window.location.origin` para links públicos. En la app: `/` → `/login` (sin landing ni
  precios), sin "Agregar a inicio" ni service worker, descargas y compartir con `saveFile`/`shareLink`
  (`src/lib/nativeFiles.ts`), acceso con PKCE y navegador del sistema (`googleSignIn.ts`, `startOAuthSignIn`), links de
  mycen.id que abren la app (`NativeBridge`, `lib/appLinks.ts`, `public/.well-known/`), recordatorios programados en el
  teléfono (`life/lib/nativeReminders.ts`, desde `useTaskReminders`/`useHabitReminders`). Los plugins se importan sólo
  en la app (dinámicos). Entrar con Apple: `FEATURES.appleSignIn` (en BETA hasta configurarlo; textos y privacidad en
  12 idiomas; mientras esté apagado, la app de iPhone no muestra Google — regla 4.8, `oauthProviders()`). Íconos:
  `node scripts/build-app-assets.mjs`. E2E `native-app.spec.ts` (simula el puente de iOS). Para las tiendas: `/api`
  público con CORS `*` (la app pide desde `capacitor://localhost`), "Eliminar mi cuenta" también en Life OS → Ajustes
  (E2E en `delete-account.spec.ts`; `oauthProviders()` en `googleSignIn.test.ts`),
  sin dictado en Android ni huella del diario en la app (sólo PIN), permisos de micrófono/voz en `Info.plist` (12
  idiomas en `*.lproj/InfoPlist.strings`) y `PrivacyInfo.xcprivacy` (igual a `docs/app/STORE.md`).
  Páginas públicas para las tiendas: `/soporte` y `/eliminar-cuenta` (el link de Google Play), con `LegalPage` en 12
  idiomas (`support` / `deletion` en `src/i18n/app/legal/*`). En Studio → Mensajes, "Reportar" (copia al equipo en
  `profile_message_reports`, panel → Denuncias) y "Bloquear" (`profile_blocked_senders`; un trigger descarta lo que
  llega de ese contacto y al visitante se le responde "ok"), migración `20261106000001_message_block_report.sql`.
- Muestra sólo en desarrollo: `/dev/design`. Contraste medido sobre `tokens.css` en `tests/unit/designTokens.test.ts`.

### Antes de cada tarea
- Leer `docs/design/DESIGN_SYSTEM.md` y `docs/v1/ROADMAP.md`.
- Si la tarea pide algo fuera del alcance del ROADMAP, avisar antes de hacerlo (va a la sección V1.1).

### Flujo
- Nunca pushear a `main`. Cada prompt va en su propia rama, partiendo de `main` actualizada: la que indica el prompt o,
  en Claude Code en la web, la rama asignada a la sesión (un PR por etapa).
- Sin `gh`: pushear la rama y dar el link `https://github.com/elevareluxury/menulife/pull/new/<rama>`.
- No mergear: lo hace el usuario después de probar el preview.
  **Excepción:** en modo piloto automático (`docs/v1/prompts/PILOTO-AUTOMATICO.md`), con acceso a GitHub (`gh` o la
  integración de GitHub de Claude Code), se crea el PR, se espera el CI y se mergea (merge commit) siguiendo ese archivo.
- Una migración se aplica en Supabase (el usuario la pega y confirma) **antes** de mergear.

### Verificación obligatoria antes de pushear (los mismos pasos del CI)
- `npx eslint` con la lista de carpetas de `.github/workflows/ci.yml`
- `npm test`
- `npm run build` (incluye `tsc -b`)
- `node scripts/check-bundle-budget.mjs`
- `npm run test:e2e`
- `npm run test:db` si hay migraciones
Reportar el resultado de cada uno. Si algo falla, arreglarlo antes de pushear.

### Código
- Colores, radios, sombras y tipografías solo desde las variables del sistema de diseño (`src/design`).
- Todo texto visible al usuario va por i18n, en los 12 idiomas (`es` es la fuente).
- Migraciones: nombre `YYYYMMDDHHMMSS_descripcion.sql`, idempotentes, con RLS, y con tests en `tests/db/`.
  Avisar en el resumen que hay que aplicarlas en Supabase.
- Funciones fuera de la V1 van detrás de `src/lib/features.ts`.
- No sumar dependencias sin justificarlo en el resumen (peso, mantenimiento, alternativa).
- Nada de contenedores con scroll interno ni `touch-action: none` en páginas públicas.
- Terceros nuevos (por ejemplo, reproductores embebidos) se suman a la política de privacidad en los 12 idiomas.

### Resumen al terminar
Rama y link del PR, commits, migraciones a aplicar, resultado de cada verificación, y qué probar en el celular.
