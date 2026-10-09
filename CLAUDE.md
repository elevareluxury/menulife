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
  `track_profile_event`, `check_username`, `report_profile`, `public_sitemap`, `report_client_error`, `submit_profile_message`.
- Proyectos (Fase 5): `content_objects` (type='project') + `content_blocks`. Son de la identidad y se publican por su cuenta
  (`publish_project` → `published_snapshot`; Studio no puede escribir el snapshot ni pasar a "publicado" directo).
  Los módulos `project`/`portfolio` guardan sólo ids en `content`; `get_public_profile` les agrega `projects` (tarjetas de lo
  publicado) al responder, así que publicar un proyecto actualiza el portfolio sin volver a publicar el Space.
- Analítica: `profile_events` con hash diario anónimo; no guardar IP ni user-agent. Fuentes de tráfico (Fase 7):
  `profile_traffic_sources` (sólo el dueño) agrupa visitas por `?src=` y sitio de origen; Studio las nombra en `lib/trafficSources.ts`.
- Módulos programados (Fase 7): `config.show_from` / `config.show_until` (ISO). La RPC pública los filtra al responder
  (`mycen_module_live`), sin volver a publicar; la misma regla en el cliente está en `profile/lib/moduleSchedule.ts`.
- Moderación (Fase 8): `report_profile` (anónimo, sin bots, 1 por perfil y día, máx. 10 por día) guarda en `profile_reports`,
  que nadie lee directo: los super-admins (tabla `super_admins`) usan `admin_list_reports` / `admin_resolve_report` /
  `admin_set_suspension` desde `/super-admin/denuncias`. `profiles.suspended_at` lo cambia sólo esa RPC (trigger) y oculta
  página, proyectos, vCard y redirecciones; Studio muestra el aviso con el motivo. Reglas en `/terminos#reglas`.
- Errores (Lanzamiento L5, sin proveedores externos): `app_errors` (agrupados por huella: zona + mensaje + primer frame del
  stack) y `app_error_hits` (personas afectadas con hash diario anónimo, 90 días). La app reporta con `report_client_error`
  (`src/lib/errorReporter.ts`: errores sin atrapar + `ErrorBoundary`; sólo en producción o con `VITE_REPORT_ERRORS=1`,
  sin bots, con topes) y el super-admin los ve y resuelve en `/super-admin/errores` (`admin_list_errors`,
  `admin_set_error_status`, `admin_error_summary`). Un error resuelto que vuelve a pasar se reabre solo.
- Las tablas `hub_*` y `restaurants.hub_*` son legado: se importan con `mycen_import_hub()` y se retiran cuando Studio reemplace al editor viejo.
- Migraciones en `supabase/migrations/`; se aplican pegándolas en Supabase → SQL Editor.

## Código
- Página pública (Identity): `src/modules/profile/` en `/:slug` (el Hub viejo queda con `?v=1` como respaldo temporal). `ProfileView` se reutiliza en la vista previa de Studio y en el onboarding.
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
  y no usar `scroll-behavior: smooth` en `<html>` (traba el hero fijado por ScrollTrigger; las anclas se mueven por JS).
  Acentos de títulos: Geist sin cursiva (no hay cursiva cargada) con degradé fijo (`.ml-shine`, `.ch-line2`).
- `manualChunks` sólo agrupa supabase y react: agrupar recharts/framer a mano arrastraba dependencias a todas las páginas.
- Presupuesto de peso: `npm run check:budget` (después de `npm run build`, también en CI) mide JS+CSS gzip de perfil,
  proyecto y landing con `dist/.vite/manifest.json`. Si un cambio lo supera, achicarlo antes de subir el límite.
- Fuentes desde `@fontsource` (`src/lib/fonts.ts`; las de títulos de perfil, a pedido en `ensureProfileFont`): nada de Google Fonts.
- Imágenes: `uploadMedia` las achica (avatar 640 px, resto 1920 px) y las pasa a WebP en el dispositivo (`lib/imageOptimize.ts`).
- Zoom permitido en toda la app (sin `user-scalable=no`); los campos táctiles usan 16px para que iOS no haga zoom al tocarlos.

## Buscadores (Lanzamiento L2)
- `/sitemap.xml` → `api/sitemap.ts` (regla en `vercel.json`) con la RPC `public_sitemap`: sólo Spaces publicados con
  visibilidad "public" (sin suspensión propia ni del principal) y proyectos publicados y públicos. `public/robots.txt`:
  las rutas privadas terminan en `/` o `$` para no bloquear usernames que empiezan igual (lo verifica `tests/unit/sitemap.test.ts`).
- El HTML para buscadores (`api/og.ts`) declara `<html lang>` con el `default_locale` del perfil.

## Idioma y región
- 12 idiomas: es, en, pt, fr, de, it, zh, ja, ko, hi, ar (RTL), ru — lista en `src/i18n/app/languages.ts`
  (sincronizada con los checks de `user_settings.language` y `profiles.default_locale`).
- Life OS, Studio y Profile usan diccionarios tipados por módulo en `src/i18n/app/{life,studio}/<idioma>.ts`
  (el español es la fuente; `tsc` obliga a que cada idioma tenga todas las claves). Mycen Business sigue con i18next (`src/i18n/*.ts`).
- Textos de la página pública (botones del sistema) en `src/modules/profile/lib/profileI18n.ts`.
- Landing (Lanzamiento L3a): diccionario `src/i18n/app/landing/<idioma>.ts` (`useLandingT`), selector de los 12 idiomas en
  el Navbar, `?lang=xx` fija el idioma y `useLandingLocale` pone título, descripción, `dir` (RTL en árabe), `hreflang` (12 +
  `x-default`) y canónica. Sin prueba social inventada: testimonios sólo de la tabla `testimonials` (si no hay, no se muestra).
- Acceso (L3b): login, registro, recuperar y cambiar contraseña con `useAuthT` (`src/i18n/app/auth/`), selector
  `components/ui/LanguageSelect.tsx` y `useLangDir` (RTL). Los errores de Supabase pasan por `authErrorMessage(err, t.errors, …)`
  y entre pantallas viajan códigos (`?message=password_updated`, `?error=expired|invalid`), nunca texto.
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
- Dinero: nunca sumar monedas distintas; cada movimiento guarda su `currency`.
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
  `accent` (plasma|ion|nebulosa|aurora), `huella_variant` y `cover`; columnas `huella_salt` (va con la versión publicada),
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
- Formulario de contacto (etapa 05): módulo `contact_form` (`ContactFormModule`, chunk propio con sus textos en
  `profile/lib/contactFormI18n.ts`) → RPC `submit_profile_message` → `profile_messages` (RLS: el dueño lee, marca `read_at` y
  borra; nadie inserta directo). Sin email. Límites en la base: largos, ≤ 3 links, 5 por visitante/perfil/día (hash diario,
  sin IP), 200 por perfil/día; bots (trampa, < 3 s, agente) reciben "ok" sin guardar. Studio → Mensajes (`/studio/messages`)
  y `useUnreadMessages` (contador en la navegación, "Más" en el celular y el Inicio; servirá para el push nativo).
  `ProfileModuleContext` da a los módulos huella, handle y si es vista previa (en la vista previa no se envía).
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
  próximas repeticiones. E2E en `tasks.spec.ts`.
- Hábitos (etapa 10): `life_habits` suma `target_value` (null = sí/no), `unit`, `anchor` ("después de…"),
  `reminder_time`/`reminder_enabled`; `frequency` admite `{ type: 'times_per_week', times }`; `life_habit_logs.value`
  (con cantidad, el día se cumple con `value >= target_value`). Rachas que perdonan en `lib/habitStreak.ts` (un día
  programado perdido no corta, dos seguidos sí; por semana igual con semanas; hoy nunca cuenta como perdido).
  `useHabits`: `addToday` ("+1"), `setDayValue`, `weekCount`, `streakUnit`. UI: `QuantityButton` (anillo), `HabitMeta`,
  `HabitValueSheet` (`components/HabitControls.tsx`). Recordatorio por hábito: `useHabitReminders` (con Life OS abierto,
  una vez por día y hábito). E2E en `habits.spec.ts`.
- "Mi día" (etapa 11): `/life` (`LifePage`) es "Mi día": `MyDaySection` (`components/MyDay.tsx`) arriba con hasta 3
  prioridades (tareas o texto; una cuarta explica por qué son 3) y "Cerrar el día" (resaltado desde las 18 h). El cierre
  (`DayReviewSheet`) muestra primero lo logrado (hábitos, tareas hechas hoy y prioridades, con celebración breve), después lo
  que quedó (pasar a mañana, cambiar fecha o soltar; soltar una tarea que se repite salta a la próxima) y "¿Cómo te fue
  hoy?". Datos: `life_daily_reviews` (una por persona y fecha local; `useDailyReview`). Debajo siguen tareas de hoy,
  hábitos, la meta en foco y el mes. `LifeSheet` va en un portal (si no, quedaba bajo la barra). E2E en `my-day.spec.ts`.
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
