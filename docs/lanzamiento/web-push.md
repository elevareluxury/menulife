# Avisos con la app cerrada (Web Push)

Life OS ya avisa con la app abierta. Para que los recordatorios de tareas y hábitos lleguen **con la app cerrada** en
la web instalada en el inicio (Android, computadora y iPhone desde iOS 16.4), hacen falta estos pasos una sola vez.
Mientras no estén, todo sigue funcionando como antes (sin push).

La app de las tiendas (iOS/Android) no necesita nada de esto: programa los avisos en el teléfono.

## Cómo funciona

1. Al permitir los avisos en Life OS, el dispositivo se suscribe (`life_push_subscribe`). Al cerrar sesión se borra.
2. Cada minuto, el cron de Supabase llama a la función `life-reminders`.
3. La función pide a `life_claim_due_reminders()` lo que toca (lo marca en el mismo paso: sale una sola vez, aunque la
   app también esté abierta) y lo manda a cada dispositivo de la cuenta. Las suscripciones vencidas se borran solas.

## Pasos

### 1. Claves VAPID

En una terminal (no hace falta estar en el proyecto):

```bash
npx web-push generate-vapid-keys
```

Da una **Public Key** y una **Private Key**. La privada no se comparte ni se sube al repo.

### 2. Vercel

Settings → Environment Variables → `VITE_VAPID_PUBLIC_KEY` = la Public Key (Production y Preview). Después, redeploy.

### 3. Base de datos

SQL Editor → pegar y correr `supabase/migrations/20261109000001_life_web_push.sql`.

### 4. Secretos de la función

Dashboard → Edge Functions → Secrets:

| Nombre | Valor |
|---|---|
| `VAPID_PUBLIC_KEY` | la Public Key |
| `VAPID_PRIVATE_KEY` | la Private Key |
| `REMINDERS_CRON_SECRET` | una clave larga al azar (por ejemplo, 40 caracteres de un generador de contraseñas) |

### 5. Publicar la función

```bash
npx supabase functions deploy life-reminders --no-verify-jwt --project-ref fcuiolmzfnhxyukkyeht
```

`--no-verify-jwt`: la llama el cron con `x-cron-secret`, no una cuenta. Sin esa clave responde 401.

### 6. Cron cada minuto

Dashboard → Database → Extensions: prender **pg_cron** y **pg_net**. Después, en el SQL Editor (cambiar
`<REMINDERS_CRON_SECRET>` por la clave del paso 4):

```sql
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

Para pararlo: `select cron.unschedule('life-reminders');`

### 7. Probar

1. En el celular, abrir mycen.id/life desde el ícono del inicio (en iPhone, "Agregar a inicio" primero).
2. Tareas → permitir avisos.
3. Crear una tarea para dentro de 2 minutos con aviso "a la hora". Cerrar la app.
4. Tiene que llegar el aviso; al tocarlo abre las tareas.

Si no llega: Dashboard → Edge Functions → life-reminders → Logs (cada llamada dice `reminders`, `sent`, `removed`,
`failed`), y en el SQL Editor `select count(*) from life_push_subscriptions;` (tiene que haber al menos una).
