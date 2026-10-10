# Auditoría de seguridad — Identity y Life OS (V1)

Fecha: octubre de 2026. Alcance: base de datos (RLS, funciones RPC, almacenamiento), página pública, Studio, Life OS,
funciones Edge de Vercel (`api/`) y configuración de la web. Business queda afuera (sólo se anotan cosas vistas al pasar).

## Arreglado en esta revisión (migración `20261023000001_security_hardening.sql`)

| Gravedad | Hallazgo | Arreglo |
|---|---|---|
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

## Bajo riesgo, anotado (V1.1)

- Life OS: una tarea, hábito o movimiento podría apuntar con `goal_id` a una meta de otra cuenta (no se puede leer ni
  cambiar esa meta; el id es un UUID imposible de adivinar). Agregar el chequeo como en `life_tasks`.
- `profile_messages`: el dueño puede editar el texto de los mensajes que recibió (sólo los suyos). Limitar a `read_at`.

## Business (fuera de alcance, para revisar aparte)

- `verify_staff_pin` y `upsert_daily_snapshot` se pueden llamar sin sesión; la segunda no fija `search_path`.
  Revisar que el PIN tenga límite de intentos.
