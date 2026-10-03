# Mycen — guía para Claude Code

Referencia de producto: "MYCEN — Etapa 2" (UX/UI, arquitectura y criterios de aceptación).
Rumbo de Identity: `docs/identity/` (auditoría Fase 0, 13 decisiones aprobadas y plan por fases). Ante dudas, manda
`docs/identity/00-decisiones.md`; no implementar una fase sin aprobar la anterior.

## Nombres (decididos)
- **Mycen Profile** — identidad pública en `/{username}`. Es lo que antes se llamaba "Hub digital".
- **Mycen Studio** — panel privado donde el dueño edita, personaliza, comparte y mide su Profile.
- **Mycen Business** — el sistema de negocios existente (menú, pedidos, POS, inventario, servicios). Queda tal cual.
- **Life OS** — espacio personal (`/life`). No es parte del MVP de Profile.
- No usar "Hub" para nada nuevo: hay un solo sistema de identidad.

## Modelo de datos
- Identity (Fase 1–2): `identities` (1 por cuenta) → `profiles` (= Space; `identity_id`, `visibility`, `archived`)
  → `profile_versions` (snapshots inmutables) · `content_objects`/`content_blocks` (proyectos, Fase 5). Ver `docs/identity/05`.
- La identidad vive en `profiles` + `profile_modules`, **no** en `restaurants`.
  Un negocio *tiene* un perfil (`profiles.restaurant_id`, opcional).
- Username = slug histórico del negocio (las URLs y QRs impresos no cambian).
  Cambios de username quedan en `profile_username_history` (redirección).
- Usernames reservados: tabla `reserved_usernames` y `src/lib/reservedUsernames.ts` (mantener sincronizados).
- El visitante anónimo **nunca** lee tablas: usa las RPC `get_public_profile`, `get_profile_contact_card`,
  `track_profile_event`, `check_username`.
- Analítica: `profile_events` con hash diario anónimo; no guardar IP ni user-agent.
- Las tablas `hub_*` y `restaurants.hub_*` son legado: se importan con `mycen_import_hub()` y se retiran cuando Studio reemplace al editor viejo.
- Migraciones en `supabase/migrations/`; se aplican pegándolas en Supabase → SQL Editor.

## Código
- Profile público: `src/modules/profile/` en `/:slug` (el Hub viejo queda con `?v=1` como respaldo temporal). `ProfileView` se reutiliza en la vista previa de Studio y en el onboarding.
- Vista previa al compartir: `api/og.ts` (Vercel Edge) + regla en `vercel.json` sólo para previsualizadores (WhatsApp, Facebook, X…).
- Studio: `src/modules/studio/` en `/studio/*` (Inicio, Mi identidad, Módulos, Apariencia, Compartir, Analítica, Ajustes).
  El perfil se guarda solo (autosave con estados Guardando/Guardado/Error); los módulos se guardan al confirmar el panel.
  **Guardar ≠ publicar** (Identity Fase 3): Studio edita la versión de trabajo; `publish_space` congela una versión en
  `profile_versions` y la página pública (`get_public_profile`) lee esa versión. Barra `PublishBar` (estado, "Publicar
  cambios", deshacer/rehacer de la sesión), versiones y "Restaurar" en Ajustes. `profiles.revision` = control de
  concurrencia (el autosave manda la revisión que conoce; si otra pestaña guardó antes, se rechaza).
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

## Idioma y región
- 12 idiomas: es, en, pt, fr, de, it, zh, ja, ko, hi, ar (RTL), ru — lista en `src/i18n/app/languages.ts`
  (sincronizada con los checks de `user_settings.language` y `profiles.default_locale`).
- Life OS, Studio y Profile usan diccionarios tipados por módulo en `src/i18n/app/{life,studio}/<idioma>.ts`
  (el español es la fuente; `tsc` obliga a que cada idioma tenga todas las claves). Mycen Business sigue con i18next (`src/i18n/*.ts`).
- Textos del Profile público (botones del sistema) en `src/modules/profile/lib/profileI18n.ts`.
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
  no publicado, módulos ocultos, vCard, autosave, QR con `?src=qr`.

## Reglas
- No simular funcionalidades sin datos reales; no inventar métricas.
- Validar con `npx tsc -b`, `npm test`, `npm run build` (y `npm run test:e2e` si se toca Identity/Studio) antes de commitear; no sumar errores de lint nuevos.
- Sin `console.log` de debug en código público.
