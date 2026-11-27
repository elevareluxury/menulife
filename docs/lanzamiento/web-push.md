# Avisos con la app cerrada (Web Push)

Life OS ya avisa con la app abierta. Para que los recordatorios de tareas y hábitos lleguen **con la app cerrada** en
la web instalada en el inicio (Android, computadora y iPhone desde iOS 16.4), hay que hacer estos pasos **una sola
vez**. No hace falta terminal: todo se hace en paneles (Mycen, Vercel, Supabase y GitHub). Mientras no estén, todo
sigue funcionando como antes (avisa la app abierta).

La app de las tiendas (iOS/Android) no necesita nada de esto: programa los avisos en el teléfono.

**Regla de oro:** las claves secretas se pegan **directo en el panel que las pide**. Nunca por chat, por mail ni en el
repo. En esta guía no hay ninguna clave real, sólo sus nombres.

## Cómo funciona (para entender, no hay que hacer nada)

1. Al permitir los avisos en Life OS, el celular se anota en la base (`life_push_subscribe`). Al cerrar sesión se borra.
2. Cada minuto, una tarea de la base (pg_cron) llama a la función `life-reminders` con una clave (la "clave del cron").
3. La función busca los recordatorios que tocan y los manda a cada celular anotado, firmados con las claves VAPID.
   Los celulares que ya no existen se borran solos. Cada pasada queda anotada para el panel.

Vas a usar **3 claves**, que generás en el panel de Mycen:

| Nombre | ¿Secreta? | Dónde va |
|---|---|---|
| Clave pública (VAPID public key) | No | Vercel (`VITE_VAPID_PUBLIC_KEY`) y Supabase (`VAPID_PUBLIC_KEY`) |
| Clave privada (VAPID private key) | **Sí** | Sólo Supabase (`VAPID_PRIVATE_KEY`) |
| Clave del cron (`REMINDERS_CRON_SECRET`) | **Sí** | Supabase (`REMINDERS_CRON_SECRET`) y el SQL del paso 4 |

## Pasos

### 0. Antes de empezar

- Aplicá la migración `supabase/migrations/20261209000001_web_push_status.sql`: Supabase → **SQL Editor** → **New
  query** → pegá el archivo entero → **Run**. (Si no aplicaste antes `20261109000001_life_web_push.sql` y
  `20261203000001_scale_reminders.sql`, pegalas primero, en ese orden. El chequeo
  `docs/lanzamiento/sql/check_migraciones.sql` te dice cuáles faltan.)
- Supabase → **Database** → **Extensions**: buscá **pg_cron** y **pg_net** y prendé las dos (si ya están, seguí).
- Tené abiertas en pestañas: el panel de Mycen (`https://mycen.id/super-admin/estado`), Vercel, Supabase y GitHub.

### 1. Generar las claves (panel de Mycen)

1. Entrá a `https://mycen.id/super-admin/estado` y bajá hasta la tarjeta **Avisos push**.
2. Tocá **Generar claves**. Aparecen las 3 claves, cada una con su botón **Copiar**.
3. Las claves se crean en tu navegador: **no se mandan a ningún lado ni se guardan**. Si cerrás o recargás la página,
   desaparecen. Por eso: dejá esta pestaña abierta hasta terminar el paso 4. (Si se te cierra, tocá **Generar claves**
   otra vez y empezá de nuevo desde el paso 2 con las nuevas: las tres claves tienen que ser de la misma vez.)

### 2. Vercel: la clave pública

1. vercel.com → proyecto **menulife** → **Settings** → **Environment Variables**.
2. **Add New**: Key `VITE_VAPID_PUBLIC_KEY`, Value = en el panel de Mycen, **Copiar** al lado de "Clave pública" y
   pegar. Environments: **Production** y **Preview** → **Save**.
3. **Deployments** → el último de Production → **⋯** → **Redeploy** → **Redeploy**. Esperá a que diga "Ready".

### 3. Supabase: los secretos de la función

1. supabase.com → tu proyecto → **Edge Functions** → **Secrets** (en algunos paneles: Project Settings → Edge
   Functions → Secrets).
2. Agregá estos tres (**Add new secret**, nombre y valor, **Save**), copiando cada valor del panel de Mycen:

   | Name | Value |
   |---|---|
   | `VAPID_PUBLIC_KEY` | la clave pública (la misma que en Vercel) |
   | `VAPID_PRIVATE_KEY` | la clave privada |
   | `REMINDERS_CRON_SECRET` | la clave del cron |

   Sin espacios ni comillas de más.

### 4. El SQL de la tarea cada minuto (Supabase)

1. Supabase → **SQL Editor** → **New query**. Pegá esto:

   ```sql
   select cron.unschedule('life-reminders') where exists (select 1 from cron.job where jobname = 'life-reminders');
   select cron.schedule(
     'life-reminders',
     '* * * * *',
     $$
     select net.http_post(
       url := 'https://fcuiolmzfnhxyukkyeht.supabase.co/functions/v1/life-reminders',
       headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', '<REMINDERS_CRON_SECRET>'),
       body := '{}'::jsonb
     );
     $$
   );
   ```

2. Reemplazá `<REMINDERS_CRON_SECRET>` (con los signos `<` y `>`) por la clave del cron: en el panel de Mycen, **Copiar**
   al lado de "Clave del cron", y pegá **entre las comillas simples**. Tiene que quedar `'x-cron-secret', 'AbC…'`.
3. **Run**. Abajo tiene que aparecer un número (el de la tarea). La primera línea puede no devolver nada: está bien.
4. **No guardes** esta consulta en "Saved queries" (tiene la clave). Cerrá la pestaña sin guardar.

Ya podés cerrar la pestaña del panel de Mycen con las claves: no las vas a necesitar más.

### 5. Publicar la función (GitHub, sin terminal)

La primera vez hay que darle a GitHub un permiso para publicar en Supabase:

1. supabase.com → arriba a la derecha tu foto → **Account preferences** → **Access Tokens** → **Generate new token**.
   Nombre: `github-functions`. Copiá el token (empieza con `sbp_`; se ve una sola vez).
2. github.com → repo **elevareluxury/menulife** → **Settings** → **Secrets and variables** → **Actions** → **New
   repository secret**: Name `SUPABASE_ACCESS_TOKEN`, Secret = el token → **Add secret**.

Ahora publicá:

3. GitHub → repo → **Actions** → a la izquierda **Publicar funciones de Supabase** → **Run workflow** → "Qué función
   publicar": `todas` → **Run workflow**.
4. En 1 o 2 minutos la corrida queda con tilde verde. Si dice "Sin publicar", falta el secreto del punto 2.

Después de esto, cada vez que se mergea un cambio en las funciones, GitHub las vuelve a publicar solo.
(`life-reminders` se publica sin verificación de cuenta porque la llama la base con la clave del cron; sin esa clave
responde 401. `quarantine-held-files` se publica con la verificación de siempre.)

### 6. Revisar en el panel

1. Esperá 2 o 3 minutos y entrá a `https://mycen.id/super-admin/estado` → tarjeta **Avisos push** (se revisa sola cada
   minuto; o tocá **Revisar ahora**).
2. Tiene que decir **Todo conectado** y, en verde:
   - **Clave pública en la web (Vercel)** — si dice que falta, revisá el paso 2 (y el Redeploy).
   - **Función life-reminders** — "Respondió hace N min". Si dice que nunca respondió: paso 4 o 5.
   - **Claves en Supabase** — si dice "faltan", "mal copiadas" o "no es la misma que la de Vercel": paso 3 (las tres
     claves tienen que ser de la misma vez que generaste).
   - **Tarea cada minuto (pg_cron)** — si dice que falta: paso 4.
   - **Clave del cron** — si dice "llamadas rechazadas": la clave del SQL (paso 4) no es igual a
     `REMINDERS_CRON_SECRET` (paso 3). Volvé a correr el SQL con la misma clave.
3. **Dispositivos suscritos** y **Avisos entregados** sólo informan: se llenan cuando alguien permite los avisos.

### 7. Probar en el celular

1. En el celular abrí `https://mycen.id/life`. En iPhone: Safari → botón Compartir → **Agregar a inicio**, y abrí Mycen
   **desde el ícono del inicio** (en iPhone los avisos sólo andan así, iOS 16.4 o más nuevo). En Android, Chrome alcanza
   (o "Agregar a inicio").
2. Life OS → **Tareas** → permitir avisos → **Permitir**.
3. Creá una tarea para dentro de 2 o 3 minutos con aviso "a la hora". Cerrá la app del todo (deslizala fuera de las
   apps abiertas).
4. Tiene que llegar el aviso; al tocarlo abre las tareas.
5. En el panel, **Dispositivos suscritos** suma uno y **Avisos entregados** muestra el aviso (y "tocados" si lo abriste).

Si no llega: mirá primero la tarjeta **Avisos push** (dice qué falta). En el celular, revisá que Mycen tenga permiso de
notificaciones en los ajustes del teléfono y que no esté en "No molestar". Más detalle: Supabase → **Edge Functions** →
`life-reminders` → **Logs** (cada pasada dice `reminders`, `sent`, `removed`, `failed`).

## Si algún día hay que cambiar las claves

Generá unas nuevas en el panel y cargalas en **todos** los lugares a la vez (pasos 2, 3 y 4, con Redeploy). Los
celulares anotados se vuelven a anotar solos la próxima vez que abran Life OS; los que no lo abran dejan de recibir
avisos hasta que lo hagan.

## Para pararlo

SQL Editor → `select cron.unschedule('life-reminders');` → Run. Los avisos con la app abierta siguen andando.
