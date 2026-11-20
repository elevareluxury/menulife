// Reglas puras de las tareas programadas (sin red): las usan team-alerts.mjs y link-scan.mjs, y las prueban
// tests/unit/cronRules.test.ts.

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
    for (const e of errors.slice(0, 5)) lines.push(`   · [${e.area}] ${e.message} (${e.count})`)
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
