// Life OS · avisos con la app cerrada (Web Push). La llama cada minuto el cron de Supabase (pg_cron + pg_net, ver
// docs/lanzamiento/web-push.md) con la cabecera x-cron-secret. Pide a life_claim_due_reminders() los recordatorios
// que tocan (ya quedan marcados: salen una sola vez) y los manda a cada dispositivo suscrito de la cuenta.
// Secretos: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, REMINDERS_CRON_SECRET (SUPABASE_URL y la service role los pone Supabase).
import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { pushPayload, sameSecret, type DueReminder } from './payload.ts'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (!sameSecret(req.headers.get('x-cron-secret'), Deno.env.get('REMINDERS_CRON_SECRET'))) {
    return json({ error: 'unauthorized' }, 401)
  }
  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY')
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY')
  if (!publicKey || !privateKey) return json({ skipped: true, reason: 'VAPID keys not set' })
  webpush.setVapidDetails('mailto:team@mycen.id', publicKey, privateKey)

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  })
  const { data: due, error } = await db.rpc('life_claim_due_reminders')
  if (error) return json({ error: error.message }, 500)
  const reminders = (due ?? []) as DueReminder[]
  if (!reminders.length) return json({ sent: 0 })

  const users = [...new Set(reminders.map(r => r.user_id))]
  const { data: subs, error: subsError } = await db.from('life_push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth').in('user_id', users)
  if (subsError) return json({ error: subsError.message }, 500)

  let sent = 0
  const gone = new Set<string>()
  const failed = new Set<string>()
  await Promise.all(reminders.flatMap(r => (subs ?? []).filter(s => s.user_id === r.user_id).map(async s => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(pushPayload(r)),
        { TTL: 3600, urgency: 'high' },
      )
      sent++
    } catch (e) {
      // 404/410: el navegador dio de baja la suscripción (se desinstaló, se quitó el permiso…)
      const status = (e as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) gone.add(s.id)
      else failed.add(s.id)
    }
  })))

  if (gone.size) await db.from('life_push_subscriptions').delete().in('id', [...gone])
  const ok = (subs ?? []).filter(s => !gone.has(s.id) && !failed.has(s.id)).map(s => s.id)
  if (ok.length) await db.from('life_push_subscriptions').update({ last_sent_at: new Date().toISOString(), failures: 0 }).in('id', ok)
  return json({ reminders: reminders.length, sent, removed: gone.size, failed: failed.size })
})
