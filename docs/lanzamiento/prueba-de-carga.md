# Prueba de carga antes de abrir

Objetivo: confirmar que un perfil viral (cientos de visitas por segundo) no satura la base. Desde la salida web, el
perfil público se sirve desde la CDN de Vercel (`api/profile.ts`, 30 s de caché + 10 min sirviendo la copia mientras
se actualiza): la base recibe un pedido cada ~30 s por perfil, no uno por visita.

## Cómo correrla (el dueño, a propósito)
1. Instalar k6: https://grafana.com/docs/k6/latest/set-up/install-k6/
2. Elegir un perfil publicado de prueba (por ejemplo, el del equipo).
3. Correr: `k6 run -e BASE=https://mycen.id -e HANDLE=<usuario> scripts/load/profile-load.js`
4. Mirar al mismo tiempo **Supabase → Reports** (CPU y conexiones) y **Vercel → Observability**.

## Qué tiene que dar
- `http_req_failed` < 1 % y `p(95)` < 800 ms (el script falla si no).
- La CPU de Supabase casi no sube: la CDN contesta casi todo.
- Si algo falla: subir el tamaño de la base (Supabase → Settings → Compute) y revisar los límites del plan de Vercel.

Las visitas (`track_profile_event`) sí llegan a la base, una por visita, con el tope diario por IP de
`mycen_pre_request` (20261123000001). Para probar ese camino, hacerlo con un perfil de prueba y poca carga.
