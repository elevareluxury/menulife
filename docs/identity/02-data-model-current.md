# 02 — Modelo de datos actual (auditoría Fase 0)

Fuente: `supabase/migrations/20261001000001_mycen_profiles_foundation.sql`, `…000002_mycen_import_hub.sql`,
`20261002000001_profile_cards_tags_life_tasks.sql` y `20261003000001_cutover_resync_delete_account.sql`.
Las migraciones se aplican a mano en Supabase → SQL Editor (no hay CLI ni migraciones automáticas).

## Tablas de Identity

### `profiles` — hoy es identidad + página pública a la vez

| Columna | Tipo / regla | Notas |
|---|---|---|
| `id` | uuid PK | Lo referencian módulos, eventos, historial |
| `user_id` | uuid → `auth.users` (cascade) | Dueño |
| `restaurant_id` | uuid único → `restaurants` (set null) | Vínculo opcional con Business |
| `username` | text, único, minúsculas, `^[a-z0-9][a-z0-9_-]{0,62}$` | El trigger exige 3–30 caracteres sin `_` ni `--` (salvo importación legada) |
| `display_name` (≤80), `descriptor` (≤120), `bio` (≤1000) | text | |
| `avatar_url`, `cover_url` | text | Storage `profile-media` |
| `purpose` | `personal · professional · creator · business · event` | No existe `artist`, `brand`, `project` |
| `status` | `draft · published · unpublished` (default `draft`) | No existe `archived` |
| `is_primary` | bool | Índice único parcial: **un solo principal por usuario**; la tabla ya admite varios perfiles por usuario |
| `theme` | jsonb (<4 KB) | `{mode, accent, title_font}` |
| `primary_action` | jsonb | `{kind, label, url}` |
| `contact_card` | jsonb (<4 KB) | `{enabled, name, title, email, phone, …}` opt-in |
| `default_locale` | text (12 idiomas) | |
| `translations` | jsonb (<64 KB) | `{en: {bio, descriptor, _hash}}` |
| `tags` | text[] (≤8) | |
| `onboarding_step`, `username_changed_at`, `published_at`, `created_at`, `updated_at` | | `published_at` lo pone un trigger al pasar a publicado |

Triggers: `mycen_validate_username` (formato, reservados, historial), `mycen_profile_status_change`
(`published_at`), `mycen_touch_updated_at`.
RLS: el dueño hace select/insert/update/delete de lo suyo (y sólo puede vincular un negocio propio). **`anon` no tiene acceso.**

### `profile_modules`

| Columna | Notas |
|---|---|
| `id`, `profile_id` (cascade) | |
| `type` | 13 tipos: `link, social, contact, location, image, text, featured_action, contact_card, gallery, product, testimonials, hours, cards` |
| `title` (≤120), `content` jsonb (<32 KB), `config` jsonb (<8 KB), `translations` jsonb (<64 KB) | El contenido vive **dentro** del módulo (no hay objetos reutilizables) |
| `position` | orden |
| `visibility` | `active · hidden` |
| `deleted_at` | borrado lógico |

Límite: 100 módulos vivos por perfil (trigger). RLS: sólo el dueño del perfil. `anon` sin acceso.

### `profile_username_history`

`old_username` (PK) → `profile_id`. La usa `get_public_profile` para redirigir URLs y QR viejos al username actual
(sólo si el perfil está publicado).

### `reserved_usernames`

`username` PK, `reason`. Sin políticas: sólo se consulta desde funciones `security definer`.

### `profile_events` + vista `profile_stats_daily`

Eventos: `view, module_click, primary_action_click, share, copy_link, qr_download, vcard_download`, con
`visitor_hash` (sha256 de IP + UA + perfil + día + sal privada; no se guardan IP ni UA), `referrer_host` y `source`.
Deduplicación de 30 minutos, tope de 300 eventos por visitante, día y perfil, sin bots y sin contar al dueño.
La vista agrupa por día UTC, tipo y módulo (`security_invoker`).

### `mycen_private.secrets`, `mycen_private.hub_imports`

Esquema privado: sal del hash de visitantes y registro de importaciones del Hub.

## RPC públicas (`security definer`)

| Función | Quién | Qué hace |
|---|---|---|
| `get_public_profile(text)` | anon, auth | Perfil + módulos activos; `{redirect}` o `{status:'unavailable'}` |
| `get_profile_contact_card(uuid)` | anon, auth | Campos autorizados de la vCard |
| `track_profile_event(...)` | anon, auth | Registro anónimo de eventos |
| `check_username(text)` | anon, auth | `available · taken · reserved · invalid` |
| `delete_my_account()` | auth | Borra el usuario (cascada); bloqueado si tiene negocio |
| `mycen_import_hub(...)` | sólo servidor | Importa el Hub legado a perfiles/módulos |

Trigger en `restaurants` (`mycen_profile_for_restaurant`): crea el perfil del negocio al dar de alta un restaurante.

## Storage

Bucket `profile-media`: público, 5 MB por archivo, sólo imágenes (jpeg, png, webp, gif, avif), una carpeta por usuario (`{uid}/…`).

## Diagnóstico

1. **Identidad y presentación están en la misma fila.** No hay raíz privada separada de la página.
2. **No hay versión publicada.** La página pública lee las mismas filas que edita Studio.
3. **El contenido no es reutilizable.** Un "proyecto" sólo puede existir como datos de un módulo (`cards`).
4. La tabla ya permite varios perfiles por usuario (`is_primary`), pero Studio usa sólo el principal.
5. Faltan estados y tipos que pide la definición: `archived`; `artist`, `brand`, `project`; visibilidad `unlisted`/`private`.

## Consultas de solo lectura para dimensionar la migración

Pegar en Supabase → SQL Editor. **No modifican nada.** Con los resultados se ajusta el plan.

```sql
-- 1. Volumen general
select
  (select count(*) from auth.users)                                         as usuarios,
  (select count(*) from public.profiles)                                    as perfiles,
  (select count(*) from public.profiles where status = 'published')         as publicados,
  (select count(*) from public.profiles where status = 'draft')             as borradores,
  (select count(*) from public.profiles where status = 'unpublished')       as pausados,
  (select count(*) from public.profiles where restaurant_id is not null)    as de_negocios,
  (select count(*) from public.profile_modules where deleted_at is null)    as modulos_vivos,
  (select count(*) from public.profile_username_history)                    as usernames_anteriores,
  (select count(*) from public.profile_events)                              as eventos;

-- 2. ¿Alguien tiene más de un perfil?
select user_id, count(*) as perfiles, count(*) filter (where is_primary) as principales
from public.profiles group by user_id having count(*) > 1;

-- 3. Módulos por tipo
select type, count(*) from public.profile_modules where deleted_at is null group by type order by 2 desc;

-- 4. Perfiles con módulos legados del Hub todavía sin tocar
select count(distinct profile_id) from public.profile_modules
where deleted_at is null and config ? 'legacy_source';

-- 5. Usernames que no cumplen el formato estricto actual (importados del Hub)
select username from public.profiles
where username !~ '^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$' or username like '%--%';
```
