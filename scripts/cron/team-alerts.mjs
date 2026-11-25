// Avisos al equipo (cada 15 min, .github/workflows/team-alerts.yml): mira /api/health y el resumen de la base
// (cron_alert_digest) y, si hay algo, manda UN mail por Resend. Pasos en docs/lanzamiento/alertas.md.
import { alertLines, alertSubject, oneLine, sinceFor } from './rules.mjs'
import { previousRunStart } from './previousRun.mjs'

const env = process.env
const need = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'MYCEN_CRON_KEY', 'RESEND_API_KEY']
const missing = need.filter(k => !env[k])
if (missing.length) {
  console.log(`::notice::Avisos al equipo sin configurar (faltan ${missing.join(', ')}). Ver docs/lanzamiento/alertas.md`)
  process.exit(0)
}
const SITE = env.SITE_URL || 'https://mycen.id'
const TO = env.ALERT_EMAIL || 'team@mycen.id'
const WINDOW_MIN = Number(env.WINDOW_MINUTES || 16)
// Desde la pasada anterior: GitHub no respeta los 15 minutos (a veces pasan horas)
const SINCE = sinceFor(await previousRunStart(), WINDOW_MIN)

async function health() {
  try {
    const res = await fetch(`${SITE}/api/health`, { signal: AbortSignal.timeout(10_000) })
    return { ok: res.ok, status: res.status }
  } catch {
    return { ok: false, status: null }
  }
}

async function digest() {
  try {
    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/cron_alert_digest`, {
      method: 'POST',
      headers: { apikey: env.SUPABASE_ANON_KEY, authorization: `Bearer ${env.SUPABASE_ANON_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ p_key: env.MYCEN_CRON_KEY, p_since: SINCE }),
      signal: AbortSignal.timeout(15_000),
    })
    return res.ok ? await res.json() : null
  } catch {
    return null
  }
}

const lines = alertLines(await digest(), await health())
if (!lines.length) {
  console.log('Todo en orden.')
  process.exit(0)
}
const text = [...lines, '', `Panel: ${SITE}/super-admin/estado`, 'Interruptores de emergencia: Super-admin → Estado.'].join('\n')
const res = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
  body: JSON.stringify({ from: env.ALERT_FROM || 'Mycen <alertas@mycen.id>', to: [TO], subject: alertSubject(lines), text }),
})
// En la salida de GitHub sólo cuántos avisos: el texto ya está saneado, pero no hace falta repetirlo ahí
console.log(`Avisos enviados: ${lines.filter(l => !l.startsWith('   ')).length}`)
if (!res.ok) {
  console.log(`::error::Resend respondió ${res.status}: ${oneLine(await res.text())}`)
  process.exit(1)
}
