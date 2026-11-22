# Avisos al equipo y revisión de links

Dos tareas programadas en GitHub Actions. Sin sus secretos no hacen nada (avisan y terminan bien). Ninguna usa la
service role de Supabase: entran con la clave pública y una **llave propia** que sólo sirve para estas tareas.

| Tarea | Cada cuánto | Qué hace |
|---|---|---|
| **Avisos al equipo** (`.github/workflows/team-alerts.yml`) | 15 min (pedido) | Mira `mycen.id/api/health` y un resumen de la base: errores nuevos, denuncias, mensajes denunciados, pico de registros (más de 3 veces lo normal y 50 o más en la hora) y links peligrosos. Si hay algo, manda **un** mail. |
| **Revisión de links** (`.github/workflows/link-scan.yml`) | 1 hora (pedido) | Toma los links de lo que se publicó desde la pasada anterior (Spaces y proyectos) y los consulta en **Google Web Risk**. Los peligrosos quedan como denuncia "Estafa" en Super-admin → Denuncias (nada se suspende solo). |

> **GitHub no corre las tareas a horario**: con poco movimiento en el repo, una "cada 15 minutos" llega a pasar cada
> varias horas. Por eso cada pasada mira desde que empezó la anterior que terminó bien (`sinceFor` en
> `scripts/cron/rules.mjs`; la base pone el tope: 1 día los avisos, 8 días los links): nada queda sin revisar, pero un
> aviso puede llegar horas después. Para enterarte **ya** si la web se cae está el monitor externo
> (`salida-web.md`, bloque 7), que no depende de GitHub.

## 1. La llave de las tareas (Supabase)
Con la migración `20261125000001` aplicada, en Supabase → SQL Editor:
```sql
select public.mycen_set_cron_key();
```
Devuelve una llave de 64 caracteres **una sola vez** (la base guarda sólo su huella). Copiala directo al secreto
`MYCEN_CRON_KEY` de GitHub (paso 4). Para cambiarla, volvé a correr la misma línea y actualizá el secreto.

## 2. Mails de aviso (Resend)
Usa la misma cuenta de Resend de los mails de la cuenta. Resend → API Keys → Create → permiso **Sending access**,
dominio `mycen.id`. Llega desde `alertas@mycen.id` (el dominio ya está verificado). El destino es `team@mycen.id`
salvo que cargues `ALERT_EMAIL`.

## 3. Google Web Risk (links peligrosos)
1. Google Cloud → elegí o creá un proyecto → **APIs y servicios** → **Biblioteca** → "Web Risk API" → **Habilitar**
   (pide una cuenta de facturación: los primeros 100.000 links por mes son gratis).
2. **Credenciales** → **Crear credencial** → **Clave de API** → **Restringir clave** → sólo "Web Risk API".
3. Copiala al secreto `WEB_RISK_API_KEY`.

> Es Web Risk y no "Safe Browsing" porque Safe Browsing gratis es sólo para uso no comercial.

## 4. Secretos en GitHub
GitHub → el repo → Settings → Secrets and variables → Actions → pestaña **Secrets** → **New repository secret**.
Pegá cada valor directo ahí (nunca por chat ni en el repo). Tienen que ser *Repository secrets*: los de la pestaña
**Variables**, los de un *Environment* o los de Codespaces/Dependabot las tareas no los ven.

| Secreto | De dónde |
|---|---|
| `SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon / public |
| `MYCEN_CRON_KEY` | Paso 1 |
| `RESEND_API_KEY` | Paso 2 |
| `WEB_RISK_API_KEY` | Paso 3 |
| `ALERT_EMAIL` | (opcional) adónde llegan los avisos |

## 5. Probar
GitHub → Actions → "Avisos al equipo" → **Run workflow**. Si todo está bien dice "Todo en orden." (sin mail); si
dice "sin configurar (faltan …)", ese secreto no está donde las tareas lo leen (ver arriba). Para
ver un mail de prueba, apagá un momento el secreto `SUPABASE_ANON_KEY` → llega "No se pudo leer el resumen de la
base" → volvé a cargarlo.
