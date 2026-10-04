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
  `track_profile_event`, `check_username`, `report_profile`, `public_sitemap`.
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
- Las tablas `hub_*` y `restaurants.hub_*` son legado: se importan con `mycen_import_hub()` y se retiran cuando Studio reemplace al editor viejo.
- Migraciones en `supabase/migrations/`; se aplican pegándolas en Supabase → SQL Editor.

## Código
- Página pública (Identity): `src/modules/profile/` en `/:slug` (el Hub viejo queda con `?v=1` como respaldo temporal). `ProfileView` se reutiliza en la vista previa de Studio y en el onboarding.
- Módulos: la lista de tipos es `MODULE_TYPES` (`profileTypes.ts`, igual al check `profile_modules_type_check`). Cada tipo se define en
  dos registros `Record<ModuleType, …>`: el público (`profile/components/moduleRegistry.ts`, cómo se dibuja; lo usan la página y la
  vista previa) y el de Studio (`studio/lib/moduleCatalog.ts`: campos, validación, valores iniciales, qué se guarda, resumen y editor
  propio en `moduleExtraEditors.tsx`). Nada de `if (type === …)` sueltos: un tipo nuevo se agrega en esos dos lugares.
- Apariencia (Fase 9): `profiles.theme` = modo (`dark`/`light`/`auto`, este sigue al dispositivo con `usePrefersLight`),
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
- Corte hecho: `/dashboard/hub` y `/life/hub` redirigen a `/studio`. Usuarios sin perfil ven el onboarding de 5 pasos (`OnboardingWizard`).
- Tareas: viven en Brain (`life_brain_items` con `type='task'`: fecha, hora, recordatorio, meta, "foco de hoy").
  Brain tiene 3 vistas: Capturas (ideas y notas), Tareas (lista por vencimiento o calendario; `?vista=tareas`) y Archivo.
  Recordatorios con la app abierta + `.ics` para el calendario del celular. `life_tasks` es legado (ya copiada a Brain).
  Goals es sólo metas: cada meta muestra lo vinculado por `goal_id` — tareas, hábitos (constancia 30 días),
  movimientos de dinero (por moneda, sin sumar) y notas/ideas. Se vincula con `GoalSelect` al crear o editar.
- Life OS: borrar con "Deshacer" (`src/modules/life/lib/undo.tsx`), "hoy" que cambia a medianoche (`useToday`),
  rachas según los días programados del hábito, progreso de metas = pasos hechos/total (sin pasos, manual),
  Replay calculado con fechas reales del mes (sin Life Score). Menús "⋯" con `ActionMenu` (táctil).
- Inicio de Life OS (`/life`) = "Tu día": tareas de hoy (foco + vencen hoy + hechas hoy), hábitos programados para hoy,
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
- Todas las rutas son `lazy` en `App.tsx`: quien abre un perfil no descarga la landing ni Business. GSAP, ScrollTrigger y
  Splitting vienen de npm y sólo en la landing (`components/landing/landingLibs.ts`); no agregar `<script>` de CDN a `index.html`.
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
  no publicado, módulos ocultos, vCard, autosave, QR con `?src=qr`, proyectos (`projects.spec.ts`), editor sin mouse (`editor.spec.ts`), links y Connect (`links-connect.spec.ts`), moderación (`moderation.spec.ts`), landing en 12 idiomas con axe (`landing.spec.ts`), acceso en otros idiomas con axe (`auth.spec.ts`), Mis Spaces (`spaces.spec.ts`), editor de escritorio (`desktop-editor.spec.ts`), apariencia y accesibilidad con axe (`appearance.spec.ts`), y cómo se ve y se guarda cada tipo de módulo
  (`modules.spec.ts`: si un cambio de módulo es deliberado, regenerar con `--update-snapshots` y revisar el diff).

## Reglas
- No simular funcionalidades sin datos reales; no inventar métricas.
- Validar con `npx tsc -b`, `npm test`, `npm run build` (y `npm run test:e2e` si se toca Identity/Studio) antes de commitear; no sumar errores de lint nuevos.
- Sin `console.log` de debug en código público.
