// Links peligrosos (cada hora, .github/workflows/link-scan.yml): toma los links de lo publicado desde la pasada anterior
// (cron_recent_links), los consulta en Google Web Risk y los que tienen amenaza quedan como denuncia para el equipo
// (cron_flag_link). Nada se suspende solo. Pasos en docs/lanzamiento/alertas.md.
import { checkableUrl, oneLine, sinceFor, threatOf, webLinkOf, webRiskUrl } from './rules.mjs'
import { previousRunStart } from './previousRun.mjs'

const env = process.env
const need = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'MYCEN_CRON_KEY', 'WEB_RISK_API_KEY']
const missing = need.filter(k => !env[k])
if (missing.length) {
  console.log(`::notice::Revisión de links sin configurar (faltan ${missing.join(', ')}). Ver docs/lanzamiento/alertas.md`)
  process.exit(0)
}
const WINDOW_MIN = Number(env.WINDOW_MINUTES || 70)
const MAX = Number(env.MAX_LINKS || 3000)   // tope por pasada (Web Risk: 100.000 gratis por mes)

const rpc = (fn, args) => fetch(`${env.SUPABASE_URL}/rest/v1/rpc/${fn}`, {
  method: 'POST',
  headers: { apikey: env.SUPABASE_ANON_KEY, authorization: `Bearer ${env.SUPABASE_ANON_KEY}`, 'content-type': 'application/json' },
  body: JSON.stringify({ p_key: env.MYCEN_CRON_KEY, ...args }),
  signal: AbortSignal.timeout(20_000),
})

const res = await rpc('cron_recent_links', { p_since: sinceFor(await previousRunStart(), WINDOW_MIN) })
if (!res.ok) {
  console.log(`::error::cron_recent_links respondió ${res.status}`)
  process.exit(1)
}
/** @type {{ profile_id: string, handle: string, url: string }[]} */
const raw = await res.json()
// Cada texto se lleva al link que arma la página ('"tienda.com"' → https://tienda.com) y un mismo link en varios
// perfiles se consulta una vez. Lo que no es un link web se anota igual como revisado (no vuelve a aparecer).
const byUrl = new Map()
const notLinks = []
for (const r of raw) {
  const url = webLinkOf(r.url)
  if (!url || !checkableUrl(url)) { notLinks.push(r.url); continue }
  const entry = byUrl.get(url) ?? { rows: [], texts: new Set() }
  entry.rows.push(r); entry.texts.add(r.url)
  byUrl.set(url, entry)
}
const all = [...byUrl.keys()]
const urls = all.slice(0, MAX)
if (all.length > MAX) {
  console.log(`::warning::Quedan ${all.length - MAX} links para la próxima pasada (tope ${MAX} por pasada)`)
}
const scannedTexts = [...notLinks]

let flagged = 0
let failed = 0
for (let i = 0; i < urls.length; i += 10) {
  await Promise.all(urls.slice(i, i + 10).map(async url => {
    try {
      const check = await fetch(webRiskUrl(url, env.WEB_RISK_API_KEY), { signal: AbortSignal.timeout(10_000) })
      if (!check.ok) { failed++; return }
      const threat = threatOf(await check.json())
      scannedTexts.push(...byUrl.get(url).texts)
      if (!threat) return
      for (const r of byUrl.get(url).rows) {
        const f = await rpc('cron_flag_link', { p_profile_id: r.profile_id, p_url: url, p_threat: threat })
        if (f.ok && (await f.json()) === 'flagged') { flagged++; console.log(`Marcado: ${oneLine(r.handle, 80)} → ${oneLine(url, 300)} (${oneLine(threat, 64)})`) }
      }
    } catch {
      failed++
    }
  }))
}
// Se anota lo revisado: la próxima pasada sigue con lo que falta (de a 5000 por pedido)
for (let i = 0; i < scannedTexts.length; i += 5000) {
  await rpc('cron_mark_links_scanned', { p_urls: scannedTexts.slice(i, i + 5000) }).catch(() => undefined)
}
console.log(`Links revisados: ${urls.length} · marcados: ${flagged} · sin respuesta: ${failed}`)
if (urls.length && failed === urls.length) {
  console.log('::error::Web Risk no respondió a ningún link (¿la llave WEB_RISK_API_KEY y la API están activas?)')
  process.exit(1)
}
