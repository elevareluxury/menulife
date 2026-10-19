# Plan ante incidentes

Qué hacer si algo se rompe o se filtra durante el lanzamiento. Pensado para leerse con apuro: primero el resumen, después
cada paso con los clics exactos. Proyecto de Supabase: `fcuiolmzfnhxyukkyeht`. Contacto: **team@mycen.id**.

> **Regla de oro:** primero frenar el daño, después entender, después arreglar. Anotar todo con hora (ver
> "Registro del incidente") desde el primer minuto: sirve para decidir y es obligatorio si hay datos personales.

## Resumen de 1 minuto

| ¿Qué pasa? | Primer paso | Sección |
|---|---|---|
| La web o la app no cargan | Ver estado de Vercel y Supabase; volver al deploy anterior | [Caída](#caída-de-la-web-o-la-app) |
| Lluvia de cuentas falsas o spam | Pausar registros | [Pausar registros](#pausar-registros) |
| Se filtró una clave | Rotarla ya | [Rotar claves](#rotar-claves) |
| Avisos repetidos, de más o raros | Parar el cron | [Parar el cron](#parar-el-cron-de-avisos) |
| Alguien vio datos que no eran suyos | Tratar como fuga de datos | [Fuga de datos](#fuga-de-datos-plazos-de-aviso) |
| No llegan mails | Ver Resend y límites de Supabase | [Mails](#no-llegan-los-mails) |

## Quién decide

| Rol | Quién | Qué decide |
|---|---|---|
| **Responsable del incidente** | El dueño de Mycen (o quien nombre para ese turno) | Gravedad, pausar registros, avisar a usuarios y autoridades, cerrar el incidente |
| **Responsable técnico** | Quien tenga acceso a Supabase, Vercel y Resend | Diagnóstico, rotar claves, parar el cron, volver a un deploy anterior |
| **Moderación** | Quien atiende `/super-admin/denuncias` | Suspender perfiles, contestar denuncias urgentes |

- Si es la misma persona, igual separar los momentos: primero frenar (técnico), después avisar (responsable).
- Cualquiera del equipo **puede y debe** pausar registros, parar el cron o volver al deploy anterior sin pedir permiso
  si ve daño en curso. Avisar enseguida al responsable.
- Avisar a usuarios, a una autoridad o a la prensa lo decide **sólo** el responsable del incidente.

### Gravedad

| Nivel | Ejemplo | Respuesta |
|---|---|---|
| **S1 — crítico** | Fuga de datos, clave `service_role` expuesta, la app no carga para nadie, cuenta tomada | Todo el equipo, ya. Registro obligatorio. |
| **S2 — alto** | No se puede registrar o entrar, no salen mails, avisos que no llegan a nadie, error nuevo con muchas personas | En la hora. |
| **S3 — bajo** | Una pantalla falla para pocos, un error raro | En el día / próximo PR. |

## Cómo detectarlo

1. **Panel de errores** — `/super-admin/errores` (y "Para revisar" en `/super-admin`). Mirar errores nuevos y cuántas
   personas afectan. Un error que vuelve después de resuelto se reabre solo. La semana del lanzamiento, revisarlo al
   menos 2 veces por día.
2. **Monitor de caídas** — *a configurar antes del lanzamiento* (todavía no hay uno). Recomendado: UptimeRobot o Better
   Stack, plan gratis, chequeo cada 5 min, alerta por mail a team@mycen.id y al celular del responsable técnico:
   - `https://mycen.id/` (la landing).
   - `https://mycen.id/sitemap.xml` (pasa por `api/sitemap.ts` y la RPC `public_sitemap`: si Supabase cae, falla).
   - Un perfil público real, `https://mycen.id/<usuario>`, buscando una palabra del perfil en la respuesta.
3. **Mails** — lo que llega a team@mycen.id (varias personas con lo mismo = incidente, ver `soporte.md`) y las alertas
   de Vercel, Supabase (uso, pagos, seguridad), Resend (rebotes, quejas), Cloudflare y GitHub (secret scanning).
4. **Logs** — Supabase → Logs (API, Auth, Postgres) y Edge Functions → `life-reminders` → Logs; Vercel → Logs;
   Resend → Logs.
5. **Estado de proveedores** — status.supabase.com, vercel-status.com, resend-status.com, cloudflarestatus.com. Si el
   problema es de ellos: avisar a usuarios si dura más de 30 min, y esperar.

## Registro del incidente

Crear una nota (o un issue privado) al empezar y completarla durante:

```
Incidente: <título corto>                     Gravedad: S1 / S2 / S3
Detectado: <fecha y hora, zona>  por: <quién / cómo>
Responsable: <nombre>            Técnico: <nombre>
Línea de tiempo:
  hh:mm  qué se vio / qué se hizo / quién
¿Hay datos personales involucrados?  sí / no / no sabemos todavía
  Qué datos, de cuántas personas, de qué países:
Medidas tomadas:
Aviso a usuarios:  sí (cuándo, texto) / no (por qué)
Aviso a autoridades:  sí (cuál, cuándo) / no (por qué)
Causa:
Qué cambiamos para que no vuelva a pasar:
Cerrado: <fecha y hora>
```

---

## Caída de la web o la app

1. Ver el estado de los proveedores (arriba). Si es Supabase o Vercel, avisar y esperar.
2. Si empezó con un deploy: Vercel → Deployments → el último deploy que andaba → **⋯ → Promote to Production**
   (Instant Rollback). No hace falta tocar el código para volver atrás.
3. Si empezó con una migración: buscar la vuelta atrás en el encabezado de la migración o en `docs/lanzamiento/sql/`
   (`l2_rollback.sql`, `l5_rollback.sql`) y aplicarla en el SQL Editor.
4. La app de las tiendas lleva la web adentro: un rollback en Vercel no la cambia. Si el problema está en la app,
   hace falta un build nuevo (`docs/app/README.md`) y pasar por revisión.

## Pausar registros

Frena altas nuevas sin afectar a quien ya tiene cuenta.

1. Supabase → **Authentication → Sign In / Providers** → apagar **"Allow new users to sign up"** → Save.
   Vale para email, Google y Apple. Quien ya tiene cuenta puede seguir entrando.
2. Si son bots: prender o revisar el CAPTCHA (`docs/lanzamiento/captcha.md`) y bajar los límites en
   **Authentication → Rate Limits**.
3. Si el ataque pega en `/api`: Vercel → **Firewall** (reglas en `docs/lanzamiento/firewall-api.md`; en el mismo
   panel está **Attack Mode** para un ataque grande).
4. Quien intente registrarse va a ver "No pudimos crear tu cuenta. Intentá de nuevo." Si la pausa dura más de una hora,
   poner un aviso en redes ("Pausamos los registros un rato, ya volvemos").
5. Para volver: prender de nuevo "Allow new users to sign up".

Para limpiar cuentas de spam ya creadas: `/super-admin/personas` → suspender, o borrar desde Authentication → Users.

## Rotar claves

Siempre en este orden: **1) crear la nueva, 2) cargarla donde se usa, 3) probar, 4) revocar la vieja.** Si la clave
se está usando para hacer daño, revocar primero y aceptar el corte.

| Clave | Dónde está | Gravedad si se filtra |
|---|---|---|
| Supabase `anon` / publishable | Vercel (`VITE_SUPABASE_ANON_KEY`), adentro de la app de las tiendas | Baja: es pública por diseño, la protegen RLS y las RPC |
| Supabase `service_role` / secret | Supabase (la inyecta en las Edge Functions); en ningún otro lado | **Crítica**: saltea todo RLS |
| Resend API key | Supabase → Auth → SMTP (password) y secreto `RESEND_API_KEY` | Alta: pueden mandar mails como mycen.id |
| VAPID (privada) | Secreto `VAPID_PRIVATE_KEY` | Media: pueden mandar avisos a los dispositivos suscriptos |
| `REMINDERS_CRON_SECRET` | Secreto de Edge Functions + el job de pg_cron | Baja: pueden disparar `life-reminders` (sólo manda lo que ya toca) |
| Turnstile Secret Key | Supabase → Auth → Attack Protection | Baja: permite saltear el CAPTCHA |
| Otras: `JWT_SECRET` (`mozo-login`), `ANTHROPIC_API_KEY` (`import-menu-pdf`) | Secretos de Edge Functions (Business) | Media |

### Supabase: `anon` y `service_role`

- **Si se filtró `service_role`** (o una secret key): es S1.
  - Con las claves nuevas (Settings → **API Keys**, `sb_publishable_…` / `sb_secret_…`): crear una secret key nueva,
    cargarla donde se use y **borrar** la filtrada. No cierra sesiones.
  - Con las claves legadas (JWT `anon` / `service_role`): la salida es **Settings → JWT Keys → rotar el secreto** (o
    pasar a las claves nuevas y desactivar las legadas). Eso cambia **las dos** claves y **cierra la sesión de todos**.
- **Después de cambiar la `anon`** (o el secreto JWT):
  1. Vercel → Settings → Environment Variables → `VITE_SUPABASE_ANON_KEY` = la nueva (Production y Preview) → Redeploy.
  2. **La app de las tiendas lleva la clave vieja adentro y deja de funcionar** hasta que salga un build nuevo
     (revisión de Apple: de horas a días). Por eso, si sólo se filtró la `anon`, no se rota: es pública y no es un
     incidente. Si hay que cambiarla, preparar antes el build de la app y avisar a quienes usan la app.
  3. Las Edge Functions toman las claves solas; revisar igual sus logs.
- Revisar en Supabase → Logs → API qué se hizo con la clave filtrada (IPs, tablas, horarios) y anotarlo.

### Resend

1. Resend → **API Keys** → Create (Sending access, dominio mycen.id).
2. Supabase → Authentication → Emails → **SMTP Settings** → Password = la nueva → Save.
3. Supabase → Edge Functions → Secrets → `RESEND_API_KEY` = la nueva.
4. Probar: "¿Olvidaste tu contraseña?" con un mail propio.
5. Resend → API Keys → borrar la vieja. Revisar Resend → Emails por si salieron mails que no mandamos.

### VAPID

1. `npx web-push generate-vapid-keys`.
2. Supabase → Edge Functions → Secrets: `VAPID_PUBLIC_KEY` y `VAPID_PRIVATE_KEY` = las nuevas.
3. Vercel → `VITE_VAPID_PUBLIC_KEY` = la pública nueva → Redeploy.
4. Las suscripciones viejas dejan de servir. La web las renueva sola al abrir Life OS (`syncPushSubscription` compara
   la clave); hasta entonces, esas personas no reciben avisos con la app cerrada. Las que fallan se borran solas.
5. La app de las tiendas no usa VAPID (avisa desde el teléfono): no se afecta.

### `REMINDERS_CRON_SECRET`

1. Generar una clave larga al azar (40 caracteres o más).
2. Supabase → Edge Functions → Secrets → `REMINDERS_CRON_SECRET` = la nueva.
3. En el SQL Editor, volver a programar el cron con la clave nueva:

```sql
select cron.unschedule('life-reminders');
select cron.schedule(
  'life-reminders',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://fcuiolmzfnhxyukkyeht.supabase.co/functions/v1/life-reminders',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', '<REMINDERS_CRON_SECRET nuevo>'),
    body := '{}'::jsonb
  );
  $$
);
```

4. Ver en Edge Functions → `life-reminders` → Logs que las llamadas dejen de dar 401.

### Turnstile

1. Cloudflare → Turnstile → el widget de mycen.id → Settings → **Rotate Secret Key**.
2. Supabase → Authentication → Attack Protection → pegar la Secret Key nueva → Save.
3. Probar un registro en mycen.id. La Site Key (`VITE_TURNSTILE_SITE_KEY`) es pública: no hace falta cambiarla.

### Después de cualquier rotación

- Borrar la clave de donde se filtró (commit, chat, captura). Si estuvo en GitHub, borrarla del historial no alcanza:
  ya se considera comprometida, por eso se rota.
- Anotar en el registro qué clave, cuándo, quién, y qué se vio en los logs.

## Parar el cron de avisos

Frena los avisos con la app cerrada (Web Push) sin borrar nada. En el SQL Editor:

```sql
-- Pausar (se puede volver a prender)
select cron.alter_job(jobid, active := false) from cron.job where jobname = 'life-reminders';

-- Ver cómo quedó
select jobid, jobname, schedule, active from cron.job where jobname = 'life-reminders';

-- Volver a prender
select cron.alter_job(jobid, active := true) from cron.job where jobname = 'life-reminders';
```

Para cortarlo del todo: `select cron.unschedule('life-reminders');` (después hay que volver a programarlo con el paso
6 de `docs/lanzamiento/web-push.md`).

- **Ojo al volver a prender:** `life_claim_due_reminders` toma lo que venció en las **últimas 12 horas** y todavía no
  se avisó. Si estuvo parado un rato, en el primer minuto salen juntos los avisos atrasados. Si eso no se quiere (por
  ejemplo, el problema eran avisos de más), antes de prender marcar como avisadas las tareas atrasadas:

```sql
update public.life_brain_items set reminded_at = now()
where type = 'task' and reminded_at is null and remind_minutes is not null
  and due_date between current_date - 1 and current_date;
```

  Revisar los logs del primer minuto al prender.
- Con la app abierta los recordatorios siguen funcionando, y la app de las tiendas no depende del cron.
- Para cortar también la función: borrar el secreto `REMINDERS_CRON_SECRET` (responde 401 a todo).

## No llegan los mails

1. Resend → Emails / Logs: ¿salen? ¿rebotan? ¿hay un aviso de la cuenta (límite, dominio)?
2. Resend → Domains → mycen.id: SPF, DKIM y DMARC en verde.
3. Supabase → Authentication → Rate Limits → "Rate limit for sending emails": si se llegó al tope, subirlo.
4. Supabase → Logs → Auth: errores de SMTP.
5. Mientras tanto, quien no puede confirmar puede entrar con Google (`soporte.md`, caso 1).

## Avisar a los usuarios

Lo decide el responsable del incidente. Canales, en este orden:

1. **Mail** desde team@mycen.id a las cuentas afectadas (con fuga de datos: obligatorio si hay riesgo para ellas).
   Para muchas cuentas, usar Resend (Broadcasts) con la lista sacada de Supabase; nunca poner a todos en "Para".
2. **Redes de Mycen** para caídas y pausas que afectan a todos.
3. **Respuesta preparada** en team@mycen.id para los que escriban.

Un buen aviso dice: qué pasó, cuándo, qué datos (si los hay), qué hicimos, qué tiene que hacer la persona y cómo
contactarnos. Sin jerga ni minimizar. En el idioma de la cuenta (`user_settings.language`); como mínimo español e
inglés.

## Fuga de datos: plazos de aviso

Es fuga cualquier acceso, pérdida o divulgación de datos personales que no debía pasar (por ejemplo: una cuenta ve
datos de otra, una clave `service_role` expuesta, una tabla legible sin permiso, mails enviados a quien no
correspondía). Ante la duda, tratarlo como fuga y anotar.

| Dónde están las personas | Norma | A la autoridad | A las personas |
|---|---|---|---|
| Unión Europea / EEE | GDPR art. 33 y 34 | **72 h** desde que nos enteramos, salvo que sea improbable que haya riesgo. Si no está todo, se avisa igual y se completa después | Sin demora indebida, si hay **alto riesgo** para ellas |
| Argentina | Ley 25.326 y Res. AAIP 47/2018 | La ley hoy no fija un plazo; la AAIP recomienda documentar y notificar los incidentes. **Criterio de Mycen: avisar a la AAIP dentro de las 72 h**, igual que GDPR | Sin demora si las afecta (y siempre que tengan que hacer algo, como cambiar la contraseña) |
| Brasil | LGPD, Res. ANPD 15/2024 | 3 días hábiles, si hay riesgo o daño relevante | Mismo plazo |
| Otros países | — | Revisar con un abogado | — |

- El reloj empieza cuando el equipo tiene una certeza razonable de que hubo fuga, no cuando termina de investigar.
- Aunque no haya que avisar a nadie, **documentar** el incidente (qué pasó, efectos, medidas) en el registro.
- Antes de avisar a una autoridad, revisarlo con un abogado si se puede; si eso hace pasar el plazo, avisar igual con
  lo que se sabe.
- Autoridades: Argentina → AAIP (argentina.gob.ar/aaip). UE → la autoridad del país donde estén las personas
  afectadas (Mycen no tiene establecimiento en la UE).

Esto es una guía operativa, no asesoramiento legal: confirmar los plazos vigentes con un abogado.

### Plantilla de aviso a usuarios (fuga de datos)

**Asunto:** Un aviso de seguridad sobre tu cuenta de Mycen

> Hola, {nombre}:
>
> Te escribimos para contarte sobre un problema de seguridad que afectó a tu cuenta de Mycen.
>
> **Qué pasó.** El {fecha} detectamos que {descripción simple: por ejemplo, "por un error en una actualización, otras
> personas pudieron ver por un rato el email de algunas cuentas"}. Lo corregimos el {fecha y hora}.
>
> **Qué datos.** {Lista concreta: email, nombre, mensajes recibidos, datos de Life OS… Y qué NO se vio: por ejemplo,
> "tu contraseña no se vio: la guardamos cifrada".}
>
> **Qué hicimos.** {Por ejemplo: cerramos el acceso, cambiamos las claves, revisamos los registros y avisamos a la
> autoridad de protección de datos.}
>
> **Qué te recomendamos.** {Por ejemplo: cambiá tu contraseña desde "¿Olvidaste tu contraseña?"; desconfiá de mails
> que pidan tus datos en nombre de Mycen: nunca te vamos a pedir tu contraseña.}
>
> Sentimos mucho lo que pasó. Si tenés preguntas, contestá este mail o escribinos a team@mycen.id.
>
> El equipo de Mycen

**Subject:** A security notice about your Mycen account

> Hi {name},
>
> We're writing to let you know about a security issue that affected your Mycen account.
>
> **What happened.** On {date} we found that {plain description}. We fixed it on {date and time}.
>
> **What data was involved.** {Specific list, and what was NOT involved — for example, "your password was not exposed:
> we store it encrypted".}
>
> **What we did.** {For example: closed the access, rotated our keys, reviewed our logs and notified the data
> protection authority.}
>
> **What we recommend.** {For example: change your password using "Forgot your password?"; be careful with emails
> asking for your details on behalf of Mycen — we will never ask for your password.}
>
> We're very sorry this happened. If you have any questions, reply to this email or write to team@mycen.id.
>
> The Mycen team

### Plantilla de aviso a la autoridad (borrador)

> Responsable: {razón social}, {domicilio}, contacto: team@mycen.id.
> Fecha y hora del incidente: {…}. Fecha y hora en que lo detectamos: {…}.
> Naturaleza: {acceso no autorizado / divulgación / pérdida}. Causa: {…}.
> Datos afectados: {categorías}. Personas afectadas: {cantidad aproximada y países}.
> Consecuencias probables: {…}.
> Medidas tomadas y propuestas: {…}. Aviso a las personas: {sí, el {fecha} / no, porque…}.
> Si falta información: "Completaremos esta notificación a medida que avancemos con la investigación."

## Al cerrar el incidente

1. Confirmar que todo volvió a la normalidad (monitor en verde, sin errores nuevos en el panel, logs limpios).
2. Volver a prender lo que se apagó (registros, cron) y anotarlo.
3. Completar el registro: causa y qué cambiamos.
4. Si hubo un cambio de código, va en su propio PR con un test que lo cubra.
5. Revisar este documento: si algún paso no sirvió o faltó, corregirlo acá.
