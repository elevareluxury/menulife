// Links peligrosos (cada hora, .github/workflows/link-scan.yml): toma los links de lo publicado desde la pasada anterior
// (cron_recent_links), los consulta en Google Web Risk y los que tienen amenaza quedan como denuncia para el equipo
// (cron_flag_link). Nada se suspende solo. Pasos en docs/lanzamiento/alertas.md.
import { checkableUrl, sinceFor, threatOf, webRiskUrl } from './rules.mjs'
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
const rows = (await res.json()).filter(r => checkableUrl(r.url))
// Un mismo link en varios perfiles se consulta una vez
const byUrl = new Map()
for (const r of rows) byUrl.set(r.url, [...(byUrl.get(r.url) ?? []), r])
const urls = [...byUrl.keys()].slice(0, MAX)

let flagged = 0
let failed = 0
for (let i = 0; i < urls.length; i += 10) {
  await Promise.all(urls.slice(i, i + 10).map(async url => {
    try {
      const check = await fetch(webRiskUrl(url, env.WEB_RISK_API_KEY), { signal: AbortSignal.timeout(10_000) })
      if (!check.ok) { failed++; return }
      const threat = threatOf(await check.json())
      if (!threat) return
      for (const r of byUrl.get(url)) {
        const f = await rpc('cron_flag_link', { p_profile_id: r.profile_id, p_url: url, p_threat: threat })
        if (f.ok && (await f.json()) === 'flagged') { flagged++; console.log(`Marcado: ${r.handle} → ${url} (${threat})`) }
      }
    } catch {
      failed++
    }
  }))
}
console.log(`Links revisados: ${urls.length} · marcados: ${flagged} · sin respuesta: ${failed}`)
if (urls.length && failed === urls.length) {
  console.log('::error::Web Risk no respondió a ningún link (¿la llave WEB_RISK_API_KEY y la API están activas?)')
  process.exit(1)
}
