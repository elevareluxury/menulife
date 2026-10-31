# Auditoría de lanzamiento: seguridad y velocidad (31/10/2026)

Cuatro partes: base de datos, web, velocidad y carga. Lo que se arregló va en este PR; lo que queda, al final.

## 1. Base de datos (Supabase → Advisors)

Migración `20261114000001_advisor_hardening.sql` (idempotente; tests en `tests/db/advisor_hardening.test.sql`).

| Aviso del Advisor | Qué pasaba | Arreglo |
|---|---|---|
| 20 vistas `view_*` de Business con SECURITY DEFINER (ERROR) | Leían con los permisos de quien las creó, salteando la RLS: con la clave pública se podían leer finanzas, ventas y reservas de todos los negocios | `security_invoker = true` (cada dueño ve lo suyo) y sin lectura anónima |
| Funciones sin `search_path` (unas 40) | Un `search_path` cambiado podía hacer que usaran otra función o tabla | `search_path = public, extensions, pg_temp` en todas las propias |
| Triggers y funciones del panel llamables sin sesión | Los triggers fallaban al llamarlos, pero aparecían en la API; las `admin_*` exigían super-admin adentro | Triggers sin EXECUTE; `admin_*` sólo con sesión |
| 6 buckets públicos de Business con listado | Cualquiera podía listar todos los archivos (menús, logos, recursos) | Los links públicos siguen; listar, sólo quien subió el archivo |
| Políticas con `auth.uid()` por fila (rendimiento, más de 100) | Se recalculaba en cada fila | `(select auth.uid())`: una vez por consulta, mismo resultado |
| 7 índices duplicados (rendimiento) | Espacio y escrituras de más | Se borra el repetido |
| Claves foráneas de Mycen sin índice | Borrar un perfil o módulo recorría tablas enteras | Índices en 18 columnas |

Se dejó igual, a propósito:
- `get_public_profile`, `check_username` y las demás RPC públicas son SECURITY DEFINER y anónimas por diseño (el
  visitante nunca lee tablas); cada una valida y limita lo que devuelve.
- "RLS enabled, no policy" (13 tablas): tablas que nadie lee directo (sólo por RPC). Es lo buscado.
- `is_super_admin` / `is_restaurant_owner` siguen llamables sin sesión: las usan políticas que se evalúan para el
  visitante (quitárselas rompería el menú público).
- `verify_staff_pin` (login de mozos y delivery de Business) está en producción con otra firma que la del repo:
  revisar que tenga un límite de intentos antes de prender Business.
- "Multiple permissive policies" y "Unused index" (Business): sin impacto con el tráfico actual.

## 2. Web

- Dependencias (`npm audit --omit=dev`): `zod` 4.4.3 → 4.6.7 (consumo de memoria) y `pdfjs-dist` 5.7 → 6.4.299
  (un PDF armado podía ejecutar código al importar el menú de Business). Quedan 3 avisos moderados de `@vercel/og`
  (la imagen al compartir): la versión 1.0.3 no anda en las pruebas ("Dynamic require of fs"); en Vercel corre en Edge,
  que no usa `sharp`. Pasar de versión cuando se pueda probar en un preview.
- Claves: ninguna secreta en el repo ni en el historial (sólo la clave pública `anon`, que es pública por diseño).
- Encabezados en `vercel.json`: HSTS, CSP sin `unsafe-inline` en scripts, `nosniff`, `X-Frame-Options`, `Referrer-Policy`
  y `Permissions-Policy`.
- El HTML del perfil tenía el bloque de datos de la precarga antes del `<meta charset>` (tiene que estar en los primeros
  1024 bytes): ahora va justo después (`scripts/profilePrefetch.ts`).

## 3. Velocidad (Lighthouse 12, celular simulado: 4G lento y procesador 4× más lento)

Medido sobre el build de producción servido local, con Supabase imitado (mycen.id no se puede abrir desde la sesión).

| Página | Rendimiento | Accesibilidad | SEO | LCP real en conexión rápida |
|---|---|---|---|---|
| Perfil (5 estructuras) | 74–77 | 100 | 100 | 2,3 s → **0,6 s** |
| Landing | 93–95 | 100 | 100 | 0,1 s |

- Causa principal del perfil: la animación de entrada arrancaba en opacidad 0 y Chrome no toma como visible (LCP) un
  elemento en 0 hasta que termina; ahora arranca en 0,01 (se ve igual).
- El perfil precarga también Geist 400 y 500 (las de su texto; se pedían recién al dibujar).
- El LCP simulado (≈ 4,7 s) lo marca la red lenta simulada con ~70 pedidos chicos; en Vercel, con HTTP/2 y CDN, pesa
  menos. Siguiente paso posible: menos chunks chicos (cada ícono es uno) o pre-render del perfil (V1.1).

## 4. Carga

- Base de datos: `get_public_profile` con 2000 perfiles publicados de 12 módulos tarda ≈ 0,5 ms por perfil
  (500 perfiles al azar en 0,23 s). La base no es el cuello de botella.
- Falta medir en producción (Vercel + Supabase) cuántas visitas por segundo aguanta un perfil: hace falta permitir
  `mycen.id` en la red de la sesión y acordar un horario (es tráfico real contra producción).

## Lo que queda para el dueño

1. Aplicar `20261114000001_advisor_hardening.sql` en Supabase → SQL Editor y volver a correr Advisors.
2. Supabase → Authentication → Providers → Email (o Attack Protection): prender **Leaked password protection**
   (rechaza contraseñas filtradas; disponible en el plan Pro).
3. Para la prueba de carga y Lighthouse en producción: permitir `mycen.id` en la red de la sesión.
