// Life OS · avisos con la app cerrada (Web Push). La llama cada minuto el cron de Supabase (pg_cron + pg_net, ver
// docs/lanzamiento/web-push.md) con la cabecera x-cron-secret. Pide a life_claim_due_reminders() los recordatorios
// que tocan (ya quedan marcados: salen una sola vez) y los manda a cada dispositivo suscrito de la cuenta.
// Secretos: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, REMINDERS_CRON_SECRET (SUPABASE_URL y la service role los pone Supabase).
import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { pushPayload, sameSecret, shownEvents, type DueReminder } from './payload.ts'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

// Los secretos pegados a mano pueden traer espacios o comillas de más
const secret = (name: string) => Deno.env.get(name)?.trim().replace(/^["']|["']$/g, '') || undefined

// Cualquier error sale con su mensaje (en los registros de la función y en net._http_response), nunca con las claves
Deno.serve(async (req) => {
  try {
    return await run(req)
  } catch (e) {
    console.error('[life-reminders]', e)
    return json({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
})

async function run(req: Request): Promise<Response> {
  if (!sameSecret(req.headers.get('x-cron-secret'), secret('REMINDERS_CRON_SECRET'))) {
    return json({ error: 'unauthorized' }, 401)
  }
  const publicKey = secret('VAPID_PUBLIC_KEY')
  const privateKey = secret('VAPID_PRIVATE_KEY')
  if (!publicKey || !privateKey) return json({ skipped: true, reason: 'VAPID keys not set' })
  // Antes de marcar nada: con una clave mal cargada no se pierde ningún recordatorio
  try {
    webpush.setVapidDetails('mailto:team@mycen.id', publicKey, privateKey)
  } catch (e) {
    return json({
      error: 'invalid VAPID keys',
      detail: e instanceof Error ? e.message : String(e),
      hint: 'VAPID_PUBLIC_KEY ~87 caracteres (la de Vercel), VAPID_PRIVATE_KEY ~43, sin comillas ni espacios',
    }, 500)
  }

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
  const delivered = new Set<DueReminder>()
  await Promise.all(reminders.flatMap(r => (subs ?? []).filter(s => s.user_id === r.user_id).map(async s => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(pushPayload(r)),
        { TTL: 3600, urgency: 'high' },
      )
      sent++
      delivered.add(r)
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
  // Métricas (product_events): uno por recordatorio entregado, aunque llegue a varios dispositivos. Si falla, no importa.
  if (delivered.size) {
    const { error: evError } = await db.from('product_events').insert(shownEvents([...delivered]))
    if (evError) console.warn('[life-reminders] product_events', evError.message)
  }
  return json({ reminders: reminders.length, sent, removed: gone.size, failed: failed.size })
}
