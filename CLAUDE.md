# Mycen — guía para Claude Code

Referencia de producto: "MYCEN — Etapa 2" (UX/UI, arquitectura y criterios de aceptación).

## Nombres (decididos)
- **Mycen Profile** — identidad pública en `/{username}`. Es lo que antes se llamaba "Hub digital".
- **Mycen Studio** — panel privado donde el dueño edita, personaliza, comparte y mide su Profile.
- **Mycen Business** — el sistema de negocios existente (menú, pedidos, POS, inventario, servicios). Queda tal cual.
- **Life OS** — espacio personal (`/life`). No es parte del MVP de Profile.
- No usar "Hub" para nada nuevo: hay un solo sistema de identidad.

## Modelo de datos
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
- Corte hecho: `/dashboard/hub` y `/life/hub` redirigen a `/studio`. Usuarios sin perfil ven el onboarding de 5 pasos (`OnboardingWizard`).
- Tareas: viven en Brain (`life_brain_items` con `type='task'`: fecha, hora, recordatorio, meta, "foco de hoy").
  Brain tiene 3 vistas: Capturas (ideas y notas), Tareas (lista por vencimiento o calendario; `?vista=tareas`) y Archivo.
  Recordatorios con la app abierta + `.ics` para el calendario del celular. `life_tasks` es legado (ya copiada a Brain).
  Goals es sólo metas: cada meta muestra sus tareas vinculadas (`goal_id`).
- Life OS: borrar con "Deshacer" (`src/modules/life/lib/undo.tsx`), "hoy" que cambia a medianoche (`useToday`),
  rachas según los días programados del hábito, progreso de metas = pasos hechos/total (sin pasos, manual),
  Replay calculado con fechas reales del mes (sin Life Score). Menús "⋯" con `ActionMenu` (táctil).
- Inicio de Life OS (`/life`) = "Tu día": tareas de hoy (foco + vencen hoy + hechas hoy), hábitos programados para hoy,
  metas en curso y el mes en la moneda principal (las otras monedas aparte). Cada tarjeta usa el hook de su módulo.
  No hay Life Score (la tabla `life_score` es legado; no se escribe más).

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

## Reglas
- No simular funcionalidades sin datos reales; no inventar métricas.
- Validar con `npx tsc -b` y `npm run build` antes de commitear; no sumar errores de lint nuevos.
- Sin `console.log` de debug en código público.
