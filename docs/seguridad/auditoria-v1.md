# Auditoría de seguridad — Identity y Life OS (V1)

Fecha: octubre de 2026. Alcance: base de datos (RLS, funciones RPC, almacenamiento), página pública, Studio, Life OS,
funciones Edge de Vercel (`api/`) y configuración de la web. Business queda afuera (sólo se anotan cosas vistas al pasar).

## Arreglado en esta revisión (migraciones `20261023000001_security_hardening.sql` y `20261023000002_access_requests_admin.sql`)

| Gravedad | Hallazgo | Arreglo |
|---|---|---|
| Alta | `access_requests` (solicitudes de acceso a Business): cualquier cuenta podía **leer todas** (nombre, email, teléfono, ciudad) y aprobarlas o rechazarlas; la pantalla de admin sólo se escondía en la app. | Leer, cambiar y borrar: sólo super-admins (`20261023000002_access_requests_admin.sql`). El formulario público sigue enviando, sólo solicitudes nuevas. |
| Alta | `site_config`: la política "Super admins manage site_config" era `using (true)`. Cualquier cuenta podía leer y cambiar los links de demo/contacto y el negocio de prueba. | Sólo super-admins (`mycen_is_admin()`). |
| Alta (a confirmar en producción) | `super_admins` se creó desde el panel de Supabase: no hay migración que garantice RLS. Si alguna cuenta pudiera escribirla, podría hacerse admin. | RLS activo, sin escritura desde la app, cada cuenta ve sólo su fila (los admins, la lista). |
| Media | Fotos (`profile-media`): la lectura pública permitía **listar** los archivos de todas las cuentas. | El bucket sigue público por URL; listar, sólo la carpeta propia. |
| Baja | Sin `Content-Security-Policy`. | `base-uri 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self'` (sin romper YouTube, Spotify ni Supabase). |

Tests: `tests/db/security.test.sql`. Vuelta atrás: `docs/v1/sql/seguridad_rollback.sql`.

## Revisado y bien

- **RLS en Identity y Life OS**: cada tabla tiene RLS y políticas por dueño (`auth.uid()`). El visitante anónimo no lee
  tablas: sólo las RPC públicas, todas `security definer` con `search_path` fijo y con topes (denuncias, mensajes,
  errores, métricas) y sin guardar IP.
- **Columnas protegidas**: snapshots publicados (`profile_versions`, `published_snapshot`) sólo los escriben las RPC;
  suspensión sólo `admin_set_suspension` (trigger); `identity_id` validado por trigger.
- **Links en perfiles** (`safeHref`): bloquea `javascript:`, `data:` y `vbscript:`. Iframes de video y música armados con
  el id validado y lista cerrada de proveedores. Nada de HTML del dueño se pinta como HTML.
- **Vista previa al compartir** (`api/og.ts`): todo el texto se escapa y los links se filtran.
- **Borrar cuenta**: `delete_my_account()` sólo borra la cuenta propia y no está disponible para anónimos.
- **Secretos**: no hay claves privadas en el repo (sólo la anon key pública, por variables de entorno).
- **Encabezados**: HSTS, `nosniff`, `X-Frame-Options`, `Referrer-Policy` y `Permissions-Policy` ya estaban.
- **Fotos**: sólo imágenes (jpg, png, webp, gif, avif; sin SVG), hasta 5 MB, cada cuenta escribe sólo en su carpeta.

## Para hacer en el panel de Supabase (no se puede desde el código)

1. **Contraseñas** (Authentication → Sign In / Providers → Email, o Password settings): mínimo 8 caracteres con letras y
   números. Hoy esa regla está sólo en la app y se puede saltear llamando a la API directo.
2. **Contraseñas filtradas** ("Leaked password protection"), si el plan lo permite.
3. **Security Advisor** (Advisors → Security): correrlo después de aplicar la migración y revisar lo que marque.
4. Confirmar que no queden tablas sin RLS ni políticas abiertas (consulta en el resumen del PR).

## Auditoría total previa al freeze (octubre de 2026)

Recorrido automático de 35 pantallas (Studio, Life OS, perfil público, proyecto, landing, acceso y legales) con datos
variados y sin datos, en 390 y 1280 px y en los dos temas: sin errores, sin pantalla de "Algo salió mal" y sin
desplazamiento de costado. Queda como prueba permanente en `tests/e2e/smoke-routes.spec.ts`.

| Gravedad | Hallazgo | Arreglo |
|---|---|---|
| Alta | Después de cada publicación, la app abierta pedía partes de la versión anterior: abrir Analítica (u otra pantalla no cargada) caía en "Algo salió mal". | Se recarga sola una vez (`src/lib/staleChunk.ts`), PR #62. |
| Media | `react-router` 7.15 con avisos de seguridad (redirección abierta con `\`, entre otros). | Actualizado a 7.18.4. |
| Baja | Life OS: se podía vincular una tarea, idea, hábito, movimiento, paso o check-in a una meta de otra cuenta. | Trigger `life_check_goal_owner` (`20261026000001_life_goal_owner.sql`), tests en `tests/db/life_goal_owner.test.sql`. |
| Baja | El aviso de "sin conexión" estaba sólo en español (también en perfiles públicos) y aparecía dos veces. | 12 idiomas (`src/i18n/app/offline.ts`), un solo aviso. `offline.spec.ts`. |
| Baja | Dinero: borrar la fecha de un movimiento daba "No se pudo guardar". | Fecha vacía = hoy. |
| Baja | Analítica: dos módulos borrados repetían la clave de React. | Una sola fila "Módulo eliminado" (PR #62). |
| — | 16 archivos viejos sin uso (check-in semanal, filtros y buscador de Brain, banners de instalación, etc.). | Borrados. |

Revisado y bien: `profile_messages` ya limitaba al dueño a cambiar sólo `read_at` (permiso por columna); todas las
funciones `security definer` fijan `search_path`; todas las tablas nuevas tienen RLS; no hay `console.log` ni secretos
en el código; el almacenamiento local siempre está protegido con `try`.

## Pendiente (fuera de la V1)

- `@vercel/og` trae `sharp` con avisos de seguridad. La imagen al compartir corre en Edge y no usa `sharp`; pasar a
  `@vercel/og` 1.x (cambio grande) en la V1.1.
- `pdfjs-dist` (importar el menú en PDF, sólo Business): actualizar a la 6.x antes de abrir Business.

## Business (fuera de alcance, para revisar aparte)

- `verify_staff_pin` y `upsert_daily_snapshot` se pueden llamar sin sesión; la segunda no fija `search_path`.
  Revisar que el PIN tenga límite de intentos.
