# 05 — Modelo objetivo (Fase 1)

Diseño aprobado con las decisiones P1–P10 (`00-decisiones.md`). SQL: `supabase/migrations/20261007000001_identity_spaces_expand.sql`
(Expand + Migrate de la Fase 2). Verificación y rollback en `docs/identity/sql/`.

**Probado** en Postgres 16 con los objetos de Supabase simulados (auth, storage, roles) y datos parecidos a producción:
verificación 7/7, idempotente (correrla dos veces no duplica), alta de negocio nuevo crea su identidad, identidad ajena
rechazada (`IDENTITY_MISMATCH`), el cliente no puede escribir versiones ni identidades, `anon` sin acceso, y el rollback
deja perfiles y módulos intactos y permite volver a aplicar.

## Punto de partida (consultas del 3/10/2026)

22 usuarios · 8 perfiles (todos de negocios, todos publicados) · 13 módulos vivos · 0 usernames anteriores ·
62 eventos · nadie con más de un perfil · ningún username con formato legado. Migración chica y de bajo riesgo.

## Entidades

```
auth.users ──1:1── identities ──1:N── profiles (= Space) ──1:N── profile_modules ──0..1──▶ content_objects
                        │                    │                                                   │
                        │                    └──1:N── profile_versions (snapshots inmutables)      └──1:N── content_blocks
                        └──1:N── content_objects (biblioteca de la identidad)
```

| Entidad (concepto) | Tabla | Qué guarda |
|---|---|---|
| User | `auth.users` | Cuenta y autenticación (sin cambios) |
| Identity | `identities` **(nueva)** | Raíz privada: dueño y Space principal. No es una página. Las preferencias (idioma, zona horaria, moneda) siguen en `user_settings` |
| Space | `profiles` **(se mantiene, P3)** | Una presentación: username/URL (P1), datos visibles, tema, acción principal, tarjeta de contacto, estado y visibilidad |
| SpaceVersion | `profile_versions` **(nueva)** | Versión publicada inmutable: `snapshot` con la composición completa |
| SpaceModule | `profile_modules` (se mantiene) | Composición; ahora puede referenciar contenido (`content_object_id`) en lugar de copiarlo |
| ContentObject | `content_objects` **(nueva)** | Contenido reutilizable de la identidad. v1: `project`. Se publica por su cuenta (P2) |
| ContentBlock | `content_blocks` **(nueva)** | Bloques narrativos de un proyecto: heading, paragraph, image, gallery, video (embebido, P6), embed, quote, divider, credits |

## Cambios en `profiles` (Space)

| Columna | Cambio | Para qué |
|---|---|---|
| `identity_id` | nueva → `identities` | Raíz común. Un trigger la completa sola (también para los perfiles que crea el alta de un negocio) |
| `visibility` | nueva: `public · unlisted · private` (default `public`) | Privacidad por Space (Fase 3 la aplica en la RPC pública) |
| `status` | suma `archived` | Archivar sin borrar |
| `purpose` | suma `artist, brand, project, custom` | Tipos de Space. `business` se mantiene (equivale a `brand`, P5) para no romper Studio ni el trigger de negocios |
| `published_version_id` | nueva → `profile_versions` | Qué versión ve el visitante (Fase 3) |

Se mantienen `user_id` (lo usan las políticas RLS), `username` (P1: el username es del Space) y todo lo demás.

## Reglas del modelo

- **Una identidad por cuenta** (`identities.user_id` único). Se crea sola con el primer Space.
- **Sólo un Space principal por identidad** (el índice único `is_primary` por usuario ya existente). El principal conserva la URL raíz.
- **El snapshot** (`mycen_space_snapshot`) es exactamente la respuesta actual de `get_public_profile` menos lo que es en vivo
  (`status`, `is_owner`, bloque `business`) y con `contact_card`, para que la vCard también salga de lo publicado.
  La RPC pública la quita antes de responder.
- **Versiones inmutables:** el cliente no puede insertarlas, editarlas ni borrarlas. Sólo las RPC de publicar y restaurar (Fase 3).
- **Contenido:** `unique (identity_id, type, slug)` → URL del proyecto `/{username}/projects/{slug}` (Fase 5).
  `published_snapshot` guarda lo publicado del proyecto; los Spaces lo muestran por referencia (P2).
- **Privacidad:** `anon` no tiene acceso a ninguna tabla nueva. Todo lo público pasa por RPC.

## Qué NO cambia con este SQL

- La página pública sigue leyendo las tablas vivas: el visitante ve exactamente lo mismo.
- Studio sigue guardando como hoy (autosave directo). Guardar ≠ publicar llega en la Fase 3.
- URLs, QR, usernames, módulos, imágenes, eventos y analítica no se tocan.

## Lo que queda para fases siguientes

| Fase | Qué usa de este modelo |
|---|---|
| 3 | RPC `publish_space`, `restore_space_version`; `get_public_profile` lee `published_version_id`; `visibility`; HTML para buscadores desde el snapshot; Studio con "Publicar" y "cambios sin publicar" |
| 5 ✅ | CRUD de proyectos (`content_objects` + `content_blocks`), RPC pública de proyecto, módulos `project`/`portfolio` (`20261009000001_identity_projects.sql`) |
| 10 | Spaces secundarios (`/username/slug`) y Spaces de marca con username propio |
| — | Exportar y borrar la cuenta deben incluir `identities`, `profile_versions` y contenido (Fase 3, junto con el Switch) |
