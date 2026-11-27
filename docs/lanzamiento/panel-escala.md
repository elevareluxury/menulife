# Panel del equipo con millones de cuentas — plan

Estado: PR 1 listo (26/11/2026); PR 2 (Personas) pendiente. Etapa 4 del plan de escala ("millones de usuarios").

## 1. Diagnóstico

Las pantallas del panel calculan todo en vivo, en cada visita, sobre todas las cuentas. Con el uso de hoy responden
rápido; con millones de cuentas pasan el límite de la base para una sesión (8 s en Supabase para `authenticated`) y la
pantalla queda en "No pudimos cargar".

| Pantalla | Función (rangos que pide la app) | Qué recorre | Con millones |
| --- | --- | --- | --- |
| Resumen | `admin_overview(30)` | todas las cuentas, perfiles y Life OS | lento |
| Crecimiento | `admin_growth_overview(30/90/365)`, `admin_growth_retention()`, `admin_growth_funnel(30/90)`, `admin_growth_adoption(30/90)` | `user_activity_days` (cuentas × días), eventos, perfiles | no carga |
| Producto | `admin_product_metrics(30/90/365)`, `admin_signup_sources(30/90/365)` | `product_events` entero del período | no carga |
| Estado | `admin_system_status()` | **todos** los archivos (`storage.objects`) y el sitemap entero | no carga, justo cuando hace falta |
| Personas | `admin_search_accounts(q)` | `like '%…%'` sin índice sobre todas las cuentas y, por cada una, sus Spaces | lento → no carga |

El resto (denuncias, errores, verificaciones, actividad, pendientes) ya pagina y usa índices: no cambia.

## 2. Decisiones

1. **Fotos calculadas en segundo plano, no tablas de resumen incrementales.** Cada número pesado se calcula una vez por
   hora con `pg_cron` (sin el límite de 8 s) y se guarda como "foto" (`mycen_admin_snapshots`). La pantalla lee la
   foto: responde en milisegundos con 1.000 o con 10 millones de cuentas. Las tablas incrementales (sumar cada día a
   medida que pasa) dan números al minuto, pero obligan a reescribir ~400 líneas de SQL y cada métrica nueva cuesta el
   doble; para un panel interno, una hora de demora es lo que usan las apps grandes. Si un día el cálculo de la hora
   tarda más de lo razonable (decenas de millones), el siguiente paso es incremental sólo para lo que tarde.
2. **El cálculo no cambia.** Las funciones de hoy pasan a llamarse `mycen_compute_*` tal cual (mismo SQL, mismos
   números) y las `admin_*` de siempre devuelven la foto con la misma forma. La app no cambia de contrato.
3. **Siempre hay algo para mostrar.** Si no hay foto todavía (base nueva, o `pg_cron` apagado), la `admin_*` calcula en
   vivo y guarda la foto. Si hay una foto vieja, se muestra con su hora; nunca un número inventado.
4. **Se ve de cuándo es.** `admin_snapshot_info()` dice cuándo se calculó cada foto y cuánto tardó; el panel muestra
   "Actualizado hace N min" y "Actualizar ahora" (calcula en vivo; con millones puede no llegar a tiempo y entonces lo
   dice y deja la foto anterior).
5. **El permiso no se afloja.** El trabajo de fondo no tiene sesión de super-admin. `mycen_assert_admin()` lo deja pasar
   sólo si las dos cosas se cumplen: la marca de la transacción `mycen.snapshot_job` (la pone únicamente
   `mycen_refresh_admin_snapshots()`, que nadie de la app puede ejecutar) y una conexión que no es de la API
   (`session_user` distinto de `authenticator`, `anon`, `authenticated` y `service_role`). Desde la API es imposible.
6. **Estado sigue en vivo** en todo lo que es barato y urgente (conexiones, errores nuevos, registros de la última hora,
   tareas programadas). Sólo lo que recorre todo (tamaño de cada bucket, direcciones del sitemap) pasa a la foto.
7. **Personas busca con índices.** Índices de trigramas (`pg_trgm`) para "contiene…" en usuario, nombre y dirección de
   los Spaces, y una copia interna del email en minúsculas (`mycen_private.account_emails`, fuera de la API, la mantiene
   un trigger en `auth.users`) con su índice: la tabla `auth.users` es de Supabase y no admite índices propios.

## 3. Entregas

- **PR 1 — Fotos del panel:** tabla, `mycen_compute_*`, `admin_*` que leen la foto, `mycen_refresh_admin_snapshots()`
  (14 cálculos: 7 funciones × sus rangos, cada uno aislado: si uno falla, los demás siguen y queda anotado el error),
  `pg_cron` cada hora (minuto 7), `admin_snapshot_info()` y `admin_refresh_snapshot(name)`, Estado con su parte pesada
  en la foto, "Actualizado hace…" / "Actualizar ahora" en Resumen, Crecimiento, Producto y Estado (12 idiomas).
- **PR 2 — Personas:** índices de trigramas, copia del email con trigger y búsqueda por candidatos con índice.
- **Medición:** una base local de prueba con cientos de miles de cuentas y millones de filas
  (`scripts/load/admin-bench.sql`, no corre en CI ni contra producción) para medir antes y después cada pantalla.

## 4. Qué tiene que hacer el dueño

- Aplicar cada migración en Supabase → SQL Editor antes del merge (como siempre).
- Confirmar que `pg_cron` está prendido (Database → Extensions → pg_cron). Si no, el panel igual anda: calcula en vivo
  como hoy hasta que se prenda.

## 5. Mediciones (PR 1)

Base local con 200.000 cuentas, 6,1 millones de días de actividad, 2 millones de eventos de producto, 1,8 millones de
visitas y 1 millón de archivos (`scripts/load/admin-bench.sh 200000`). Hoy en producción hay muchas menos cuentas.
Límite de una sesión en Supabase: 8 s.

| Pantalla | Antes (en vivo) | Después (foto) |
| --- | ---: | ---: |
| Resumen | 0,4 s | 2 ms |
| Crecimiento 30 / 90 / 365 días | 44 s / 120 s / 120 s | 2 ms |
| Retención · embudo · adopción | 6,7 s · 2,1 s · 3,1 s | 2–3 ms |
| Producto 90 / 365 días | 2,5 s / 3,2 s | 2 ms |
| Estado | 3,4 s | 19 ms |

Con sólo 20.000 cuentas Crecimiento ya tardaba 5–10 s: el problema llegaba mucho antes de los millones.

El trabajo de cada hora (16 fotos) pasó de 116 s a **46 s** con tres cambios que no tocan ningún número:
activos de 7 y 30 días con tramos por persona en una pasada (antes, un conteo por día del período), cada persona de
los últimos 30 días resumida una vez para plataforma, idioma, región, zona y partes de la app, y Crecimiento de 30 y 90
días recortado del de 365. Verificado: el resultado completo es idéntico al de antes en la base de 200.000 cuentas
(misma hora) y el test de la base compara cada día con el conteo directo y los recortes con el cálculo directo.

Proyección lineal del trabajo: ~8 min con 2 millones de cuentas, ~40 min con 10 millones (tope: 50 min). Si se
acerca al tope, el siguiente paso es incremental sólo para Crecimiento de 365 días (el 50 % del tiempo).
