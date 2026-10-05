// Fuentes de tráfico (Identity Fase 7): agrupa lo que devuelve profile_traffic_sources en canales
// legibles. Prioridad: el parámetro ?src= (lo pone Mycen en el QR, la tarjeta, etc.), después el sitio
// de origen. Sin ninguno = directo (link pegado, app que no informa el origen, favoritos).

export type SourceKey =
  | 'qr' | 'card' | 'instagram' | 'whatsapp' | 'facebook' | 'x' | 'linkedin' | 'tiktok' | 'youtube'
  | 'google' | 'search' | 'email' | 'mycen' | 'direct' | 'other'

export interface SourceRow { source: string | null; referrer_host: string | null; visits: number; visitors: number }
export interface SourceGroup { key: SourceKey; visits: number; /** sitio o valor de ?src= cuando key = 'other' */ detail?: string }

const SRC_PARAM: Record<string, SourceKey> = {
  qr: 'qr', card: 'card', tarjeta: 'card', ig: 'instagram', instagram: 'instagram', wa: 'whatsapp', whatsapp: 'whatsapp',
  fb: 'facebook', facebook: 'facebook', x: 'x', tw: 'x', twitter: 'x', li: 'linkedin', linkedin: 'linkedin',
  tt: 'tiktok', tiktok: 'tiktok', yt: 'youtube', youtube: 'youtube', email: 'email', mail: 'email',
}

const HOSTS: [RegExp, SourceKey][] = [
  [/(^|\.)instagram\.com$/, 'instagram'],
  [/(^|\.)(whatsapp\.com|wa\.me)$/, 'whatsapp'],
  [/(^|\.)(facebook\.com|fb\.com|fb\.me|messenger\.com)$/, 'facebook'],
  [/(^|\.)(t\.co|twitter\.com|x\.com)$/, 'x'],
  [/(^|\.)(linkedin\.com|lnkd\.in)$/, 'linkedin'],
  [/(^|\.)tiktok\.com$/, 'tiktok'],
  [/(^|\.)(youtube\.com|youtu\.be)$/, 'youtube'],
  [/(^|\.)google\.[a-z.]+$/, 'google'],
  [/(^|\.)(bing\.com|duckduckgo\.com|search\.yahoo\.com|yandex\.[a-z]+|ecosia\.org)$/, 'search'],
  [/(^|\.)(mail\.google\.com|outlook\.(live|office)\.com|mail\.yahoo\.com)$/, 'email'],
  [/(^|\.)mycen\.id$/, 'mycen'],
]

export function classifySource(source: string | null, referrerHost: string | null): { key: SourceKey; detail?: string } {
  const src = source?.trim().toLowerCase()
  if (src) return SRC_PARAM[src] ? { key: SRC_PARAM[src] } : { key: 'other', detail: `?src=${src}` }
  const host = referrerHost?.trim().toLowerCase().replace(/^www\./, '')
  if (!host) return { key: 'direct' }
  // Gmail y Outlook web antes que "google" genérico
  const email = HOSTS.find(([re, k]) => k === 'email' && re.test(host))
  if (email) return { key: 'email' }
  const hit = HOSTS.find(([re]) => re.test(host))
  return hit ? { key: hit[1] } : { key: 'other', detail: host }
}

/** Suma por canal (los "otros" quedan separados por sitio), de mayor a menor. */
export function groupSources(rows: SourceRow[]): SourceGroup[] {
  const map = new Map<string, SourceGroup>()
  for (const r of rows) {
    const { key, detail } = classifySource(r.source, r.referrer_host)
    const id = key === 'other' ? `other:${detail}` : key
    const g = map.get(id) ?? { key, visits: 0, ...(detail ? { detail } : {}) }
    g.visits += Number(r.visits) || 0
    map.set(id, g)
  }
  return [...map.values()].filter(g => g.visits > 0).sort((a, b) => b.visits - a.visits)
}
