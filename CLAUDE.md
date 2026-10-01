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
- Profile público: `src/modules/profile/` (página `/:slug?v=2` mientras dure la transición; `ProfileView` se reutiliza en la vista previa de Studio).
- Studio: `src/modules/studio/` en `/studio/*` (Inicio, Mi identidad, Módulos, Apariencia, Compartir, Analítica, Ajustes).
  El perfil se guarda solo (autosave con estados Guardando/Guardado/Error); los módulos se guardan al confirmar el panel.
- El editor viejo (`/dashboard/hub`, `HubPage.tsx`) sigue escribiendo en las tablas `hub_*` hasta el corte.

## Idioma
- Interfaz en español (rioplatense) primero, con i18n (`src/i18n`).
- Profile con botón ES/EN: traducción automática cacheada en `translations` (jsonb) de `profiles` y `profile_modules`.

## Reglas
- No simular funcionalidades sin datos reales; no inventar métricas.
- Validar con `npx tsc -b` y `npm run build` antes de commitear; no sumar errores de lint nuevos.
- Sin `console.log` de debug en código público.
