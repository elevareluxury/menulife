# 01 — Arquitectura actual (auditoría Fase 0)

Estado del repositorio al 3/10/2026 (`main` en `a87ffaa`). Sólo lectura: no se modificó código ni base.

## Stack

| Área | Tecnología |
|---|---|
| Frontend | React 19.2, TypeScript, Vite (SPA), Tailwind 4 + CSS propio (`studio.css`, `profile.css`) |
| Ruteo | react-router-dom 7 (`src/app/App.tsx`) |
| Estado | Zustand 5 (auth, locale, Life OS) + estado local / contexto (`StudioContext`) |
| Backend | Supabase: Postgres con RLS, Auth, Storage, RPC (`security definer`) |
| Hosting | Vercel: estáticos + una función Edge (`api/og.ts`) |
| Formularios / validación | Sin librería: validación manual en cada editor; límites duros en la base (checks de tamaño) |
| UI | framer-motion, lucide-react, react-hot-toast, qrcode.react, recharts; `@dnd-kit` instalado pero usado sólo en el editor legado del Hub |
| i18n | Diccionarios tipados propios (Studio, Life OS, Profile) en `src/i18n/app/`; Mycen Business con i18next |
| PWA | vite-plugin-pwa (service worker) |
| Tests | **No hay.** Ni Vitest ni Playwright en el repo, ni script `test`, ni CI (`.github/workflows` no existe). Validación actual: `tsc -b`, `eslint`, `vite build` y pruebas manuales con Playwright fuera del repo |
| Tipos de la base | `src/types/database.types.ts` **no incluye** `profiles`, `profile_modules` ni las tablas de Life OS; el código usa casts (`as unknown as SupabaseClient` / `as any`) |

## Rutas relevantes

| Ruta | Qué es |
|---|---|
| `/` | Landing |
| `/:slug` | Página pública (`PublicSlugRoute`): `?v=1` muestra el Hub legado; si no, `ProfilePublicPage` |
| `/studio/*` | Studio: inicio, `identity`, `modules`, `appearance`, `exchange` (compartir), `analytics`, `settings`, `preview` |
| `/life/*` | Life OS |
| `/dashboard/*` | Mycen Business (`/dashboard/hub` redirige a `/studio`) |
| `/terminos`, `/privacidad` | Páginas legales |

`vercel.json` reescribe `/:slug` hacia `api/og` **sólo** para user-agents de previsualizadores y buscadores
(WhatsApp, Facebook, X, Telegram, LinkedIn, Discord, **Googlebot, bingbot, Applebot**…). El resto va a `index.html`.

## Página pública

1. `ProfilePublicPage` llama a la RPC `get_public_profile(username)`.
2. La RPC devuelve el perfil + módulos activos, o `{redirect}` si es un username anterior, o `{status:'unavailable'}` si no está publicado (salvo para el dueño).
3. Se renderiza `ProfileView` + `ProfileModules` (un `switch` por tipo con 11 tipos más la fila de redes y la tarjeta de contacto).
4. El tema sale de `profileTheme.ts` (`themeVars`: modo claro/oscuro, acento con contraste mínimo 3:1, tipografía de títulos de un catálogo).
5. Las visitas y clics se registran con `track_profile_event` (incluye `?src=` y el host del referrer).
6. Idioma: textos del sistema en `profileI18n.ts` (12 idiomas); el contenido del dueño en su idioma o en `translations`.

**SEO:** el título y la descripción se ponen del lado del cliente. A los buscadores se les sirve `api/og.ts`,
que devuelve **sólo título, descripción, Open Graph, canonical y un link**: el contenido de la página no se indexa.

## Studio

- `StudioShell` carga **el perfil principal** del usuario (`loadMyProfile`: ordena por `is_primary` y toma el primero). Sin perfil → `OnboardingWizard` (5 pasos: propósito, nombre, username, campos rápidos, publicar o dejar en borrador).
- **Guardado del perfil:** `patchProfile` acumula cambios y a los 700 ms hace `update` directo sobre la fila de `profiles`. Si el perfil está publicado, **el cambio se ve en público al instante**. Estados visibles: Guardando / Guardado / Error. Aviso al cerrar la pestaña con cambios pendientes.
- **Módulos:** se crean o editan en un panel (`ModuleEditor`) y se escriben **directo** en `profile_modules` al confirmar (también en vivo). Reordenar con flechas (`saveOrder`), ocultar o mostrar, y borrado lógico con confirmación.
- **Vista previa:** `PreviewPane` arma el perfil desde el estado local (`toPublicProfile`) con selector celular/escritorio. Usa el mismo `ProfileView`.
- **Sin** deshacer/rehacer, versiones, duplicar módulo, arrastrar para reordenar ni control de concurrencia (gana la última escritura).
- **Compartir (`exchange`):** QR SVG→PNG con `?src=qr`, compartir nativo, copiar enlace, configuración de la tarjeta de contacto (vCard vía RPC `get_profile_contact_card`).
- **Analítica:** vista `profile_stats_daily` → visitas, visitantes únicos (hash diario), clics por módulo, acción principal, compartidos, vCards y serie diaria. La **fuente** (`source`, `referrer_host`) se guarda pero no se muestra.
- **Apariencia:** modo oscuro/claro, acento (paleta + color libre con aviso de contraste), tipografía de títulos. Sin modo automático, radios, fondos ni estilos de tarjeta.
- **Ajustes:** publicar/pausar, cambio de username (con historial y redirección), idioma, exportar datos y borrar la cuenta (RPC `delete_my_account`; si hay negocio, se bloquea).

## Vínculo con Mycen Business

- Un trigger en `restaurants` (`mycen_profile_for_restaurant`) crea un perfil `purpose='business'` con el slug del negocio.
- `get_public_profile` agrega un bloque `business` (slug, tipo, plan, reservas, zona horaria).
- Legado: tablas `hub_*` y columnas `restaurants.hub_*`, importadas con `mycen_import_hub()`; el Hub viejo se ve con `?v=1`.

## Usernames reservados (3 copias)

La lista vive en **tres** lugares que hay que mantener sincronizados a mano: la tabla `reserved_usernames`,
`src/lib/reservedUsernames.ts` y la constante `RESERVED` de `api/og.ts`.

## Documentación

Sólo `CLAUDE.md`. Este directorio (`docs/identity/`) es la primera documentación técnica de Identity.
