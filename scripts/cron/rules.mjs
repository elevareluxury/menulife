// Reglas puras de las tareas programadas (sin red): las usan team-alerts.mjs y link-scan.mjs, y las prueban
// tests/unit/cronRules.test.ts.

/**
 * Texto que viene de afuera (el mensaje de un error lo escribe cualquier visitante) en una sola línea segura: sin
 * saltos ni caracteres de control (no inventa líneas en el mail) y sin "::" (GitHub Actions no lo toma como comando).
 * @param {unknown} value
 * @param {number} [max]
 */
export function oneLine(value, max = 200) {
  const s = String(value ?? '')
    .replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]+/g, ' ')
    .replace(/:{2,}/g, ':')
    .replace(/\s+/g, ' ')
    .trim()
  return s.length > max ? `${s.slice(0, max - 1)}…` : s
}

/**
 * Qué avisar al equipo a partir del resumen de la base (cron_alert_digest) y de /api/health.
 * Devuelve una línea por problema (vacío = no se manda nada).
 * @param {Record<string, any> | null} digest
 * @param {{ ok: boolean, status: number | null }} health
 */
export function alertLines(digest, health) {
  const lines = []
  if (!health.ok) lines.push(`🔴 mycen.id/api/health respondió ${health.status ?? 'sin respuesta'}: la base o la web no contestan.`)
  if (!digest) {
    lines.push('🔴 No se pudo leer el resumen de la base (¿la llave MYCEN_CRON_KEY es la de ahora?).')
    return lines
  }
  const errors = Array.isArray(digest.new_errors) ? digest.new_errors : []
  if (errors.length) {
    lines.push(`🟠 ${errors.length === 1 ? '1 error nuevo' : `${errors.length} errores nuevos`} en la app:`)
    for (const e of errors.slice(0, 5)) lines.push(`   · [${oneLine(e.area, 40)}] ${oneLine(e.message)} (${Number(e.count) || 0})`)
  }
  if (Number(digest.reopened_errors) > 0) lines.push(`🟠 ${digest.reopened_errors} error(es) viejos volvieron a pasar muchas veces.`)
  const hour = Number(digest.signups_hour) || 0
  const avg = Number(digest.signups_week_hourly) || 0
  // Pico de registros: más de 3 veces lo normal y al menos 50 en la hora (puede ser un ataque de cuentas falsas)
  if (hour >= 50 && hour > avg * 3) lines.push(`🟠 Pico de registros: ${hour} en la última hora (lo normal: ${avg}). Si son cuentas falsas, pausá los registros en Estado.`)
  if (Number(digest.reports) >= 5) lines.push(`🟠 ${digest.reports} denuncias nuevas. Revisalas en Denuncias.`)
  if (Number(digest.message_reports) >= 5) lines.push(`🟠 ${digest.message_reports} mensajes denunciados nuevos.`)
  if (Number(digest.link_flags) > 0) lines.push(`🟠 ${digest.link_flags} link(s) marcados como peligrosos: están en Denuncias.`)
  const flags = digest.flags ?? {}
  const paused = ['signups', 'messages', 'subscriptions', 'polls'].filter(k => flags[k] === false)
  if (paused.length && lines.length) lines.push(`ℹ️ En pausa ahora: ${paused.join(', ')}.`)
  return lines
}

/** Asunto del mail: el problema más grave primero */
export function alertSubject(lines) {
  const red = lines.some(l => l.startsWith('🔴'))
  return `${red ? '🔴' : '🟠'} Mycen: ${lines.filter(l => !l.startsWith('   ')).length} aviso(s)`
}

// ── Misma regla que la página pública (src/modules/profile/lib/safeUrl.ts: cleanLinkInput + safeHref para web) ──
// El scanner es JavaScript puro y no puede importar el .ts; tests/unit/cronRules.test.ts compara las dos.
const BARE_DOMAIN = /^(?:[\p{L}\p{N}](?:[\p{L}\p{N}-]*[\p{L}\p{N}])?\.)+(?:\p{L}{2,}|xn--[a-z0-9-]+)(?::\d{1,5})?(?=[/?#]|$)/iu

function cleanLink(raw) {
  let v = raw.trim()
  for (let prev = ''; prev !== v;) {
    prev = v
    v = v.replace(/^https?:\/\/(?=[<"'“”‘’«])/i, '')
    v = v.replace(/^[<"'“”‘’«]+|[>"'“”‘’»]+$/g, '').replace(/[.,;]+$/, '').trim()
  }
  if (!/^https?:\/\/[^/]/i.test(v)) v = v.replace(/^(https?)(?::\/{0,3}|\/\/)(?=[^/])/i, '$1://')
  return v
}

function validWeb(url) {
  const authority = /^https?:\/\/([^/?#]*)/i.exec(url)?.[1] ?? ''
  if (authority.includes('@') || /\s/.test(authority)) return false
  let u
  try { u = new URL(url) } catch { return false }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return false
  const labels = u.hostname.replace(/\.$/, '').split('.')
  return labels.length >= 2 && labels.every(Boolean) && /^([a-z]{2,}|xn--[a-z0-9-]+)$/i.test(labels[labels.length - 1])
}

/**
 * El link web al que lleva un texto de un perfil, igual que lo arma la página ('"tienda.com/x"' → https://tienda.com/x),
 * o null si la página no lo mostraría como link web.
 * @param {unknown} raw
 */
export function webLinkOf(raw) {
  if (typeof raw !== 'string') return null
  const url = cleanLink(raw)
  if (!url) return null
  if (/^https?:\/\//i.test(url)) return validWeb(url) ? url : null
  if (BARE_DOMAIN.test(url) && validWeb(`https://${url}`)) return `https://${url}`
  return null
}

/** Link que vale la pena revisar: http(s), sin espacios, ≤ 2048 y que no sea de Mycen */
export function checkableUrl(url) {
  if (typeof url !== 'string' || url.length > 2048 || /\s/.test(url)) return false
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false
    return !/(^|\.)mycen\.id$/i.test(u.hostname)
  } catch {
    return false
  }
}

export const WEB_RISK_THREATS = ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE']

/** Pedido a Google Web Risk (uris:search, un link por pedido) */
export function webRiskUrl(url, key) {
  const q = new URLSearchParams()
  for (const t of WEB_RISK_THREATS) q.append('threatTypes', t)
  q.set('uri', url)
  q.set('key', key)
  return `https://webrisk.googleapis.com/v1/uris:search?${q}`
}

/** La amenaza que encontró Web Risk, o null si el link está limpio */
export function threatOf(body) {
  const types = body?.threat?.threatTypes
  return Array.isArray(types) && types.length ? String(types[0]).slice(0, 64) : null
}

/**
 * Desde cuándo mirar en esta pasada. GitHub no corre las tareas programadas a horario (una "cada 15 minutos" llega a
 * pasar cada varias horas), así que una ventana fija dejaba sin revisar casi todo lo que pasaba entre una y otra.
 * Se mira desde que empezó la pasada anterior que terminó bien (con 2 minutos de margen), y nunca menos que la
 * ventana de siempre. Sin dato de la anterior, la ventana de siempre. Los topes máximos los pone la base.
 * @param {string | null | undefined} previousStart  run_started_at de la pasada anterior exitosa (ISO)
 * @param {number} windowMin  ventana mínima en minutos
 * @param {number} [now]
 */
export function sinceFor(previousStart, windowMin, now = Date.now()) {
  const fallback = now - windowMin * 60_000
  const prev = previousStart ? Date.parse(previousStart) : NaN
  if (!Number.isFinite(prev) || prev > now) return new Date(fallback).toISOString()
  return new Date(Math.min(fallback, prev - 2 * 60_000)).toISOString()
}
