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
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  })
  // web-push quiere base64url sin relleno: un "=" final (de otros generadores) se saca
  const publicKey = secret('VAPID_PUBLIC_KEY')?.replace(/=+$/, '') || undefined
  const privateKey = secret('VAPID_PRIVATE_KEY')?.replace(/=+$/, '') || undefined
  // Cada corrida queda anotada para el panel (Super-admin → Estado → Avisos push): sin esto, una función sin claves
  // respondía 200 y el panel no se enteraba. La clave pública no es secreta; la privada nunca se anota.
  const note = (result: RunResult, stats?: Record<string, number>, error?: string) =>
    recordRun(db, result, publicKey, stats, error)
  if (!publicKey || !privateKey) {
    await note('no_keys')
    return json({ skipped: true, reason: 'VAPID keys not set' })
  }
  // Antes de marcar nada: con una clave mal cargada no se pierde ningún recordatorio
  try {
    webpush.setVapidDetails('mailto:team@mycen.id', publicKey, privateKey)
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e)
    await note('bad_keys', undefined, detail)
    return json({
      error: 'invalid VAPID keys',
      detail,
      hint: 'VAPID_PUBLIC_KEY ~87 caracteres (la de Vercel), VAPID_PRIVATE_KEY ~43, sin comillas ni espacios',
    }, 500)
  }
  // De a tandas (la base entrega hasta 300 tareas y 300 hábitos por llamada, 20 por cuenta): se piden hasta vaciar o
  // hasta 40 s, para no pasar el "Max rows" de la API ni el tiempo de la función. Lo que quede sale en el minuto siguiente.
  const started = Date.now()
  const total = { reminders: 0, sent: 0, removed: 0, failed: 0, batches: 0 }
  for (let batch = 0; batch < 10 && Date.now() - started < 40_000; batch++) {
    const { data: due, error } = await db.rpc('life_claim_due_reminders')
    if (error) { await note('error', total, error.message); return json({ error: error.message, ...total }, 500) }
    const reminders = (due ?? []) as DueReminder[]
    if (!reminders.length) break
    const r = await deliver(db, reminders)
    if ('error' in r) { await note('error', total, r.error); return json({ error: r.error, ...total }, 500) }
    total.batches++
    total.reminders += reminders.length
    total.sent += r.sent; total.removed += r.removed; total.failed += r.failed
  }
  await note('ok', total)
  return json(total)
}

type RunResult = 'ok' | 'no_keys' | 'bad_keys' | 'error'

/** life_push_record_run (20261209000001). Si la migración no está aplicada o falla, los avisos salen igual. */
async function recordRun(db: Db, result: RunResult, publicKey: string | undefined, stats?: Record<string, number>, error?: string) {
  try {
    const { error: e } = await db.rpc('life_push_record_run', {
      p_result: result, p_public_key: publicKey ?? null, p_stats: stats ?? null, p_error: error?.slice(0, 300) ?? null,
    })
    if (e) console.warn('[life-reminders] record_run', e.message)
  } catch (e) {
    console.warn('[life-reminders] record_run', e instanceof Error ? e.message : String(e))
  }
}

type Db = ReturnType<typeof createClient>
type Sub = { id: string; user_id: string; endpoint: string; p256dh: string; auth: string }

/** Los dispositivos de esas cuentas, de a 1000 (el "Max rows" de la API) */
async function subscriptionsOf(db: Db, users: string[]): Promise<Sub[] | { error: string }> {
  const out: Sub[] = []
  for (let i = 0; i < users.length; i += 200) {
    const chunk = users.slice(i, i + 200)
    for (let from = 0; ; from += 1000) {
      const { data, error } = await db.from('life_push_subscriptions')
        .select('id, user_id, endpoint, p256dh, auth').in('user_id', chunk).order('id').range(from, from + 999)
      if (error) return { error: error.message }
      out.push(...((data ?? []) as Sub[]))
      if (!data || data.length < 1000) break
    }
  }
  return out
}

async function deliver(db: Db, reminders: DueReminder[]): Promise<{ sent: number; removed: number; failed: number } | { error: string }> {
  const users = [...new Set(reminders.map(r => r.user_id))]
  const subsOrError = await subscriptionsOf(db, users)
  if ('error' in subsOrError) return subsOrError
  const subs = subsOrError
  let sent = 0
  const gone = new Set<string>()
  const failed = new Set<string>()
  const delivered = new Set<DueReminder>()
  const byUser = new Map<string, Sub[]>()
  for (const s of subs) byUser.set(s.user_id, [...(byUser.get(s.user_id) ?? []), s])
  const jobs = reminders.flatMap(r => (byUser.get(r.user_id) ?? []).map(s => async () => {
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
  }))
  // De a 50 envíos a la vez (miles juntos saturaban la función)
  for (let i = 0; i < jobs.length; i += 50) await Promise.all(jobs.slice(i, i + 50).map(j => j()))

  // De a 200 ids por pedido (la dirección del pedido tiene un largo máximo)
  const goneIds = [...gone]
  for (let i = 0; i < goneIds.length; i += 200) await db.from('life_push_subscriptions').delete().in('id', goneIds.slice(i, i + 200))
  // Otros errores (403 de otra clave VAPID, 400…): un fallo más; al 10.º seguido el dispositivo se borra.
  // Antes se reintentaban para siempre. Si la migración no está aplicada, no pasa nada.
  let dropped = 0
  const failedIds = [...failed]
  for (let i = 0; i < failedIds.length; i += 200) {
    const { data, error } = await db.rpc('life_push_note_failures', { p_ids: failedIds.slice(i, i + 200) })
    if (error) { console.warn('[life-reminders] note_failures', error.message); break }
    dropped += Number(data) || 0
  }
  const ok = subs.filter(s => !gone.has(s.id) && !failed.has(s.id)).map(s => s.id)
  for (let i = 0; i < ok.length; i += 200) {
    await db.from('life_push_subscriptions').update({ last_sent_at: new Date().toISOString(), failures: 0 }).in('id', ok.slice(i, i + 200))
  }
  // Métricas (product_events): uno por recordatorio entregado, aunque llegue a varios dispositivos. Si falla, no importa.
  if (delivered.size) {
    const { error: evError } = await db.from('product_events').insert(shownEvents([...delivered]))
    if (evError) console.warn('[life-reminders] product_events', evError.message)
  }
  return { sent, removed: gone.size + dropped, failed: failed.size }
}
