// Analítica → "Lo que más tocan": arma el ranking de botones con lo que devuelve profile_click_stats y el contenido
// actual de cada módulo (las claves salen de profile/lib/clickKeys, igual que en la página pública). Sin DOM.
import { RESERVE_KEY, supportKey, urlKey } from '@/modules/profile/lib/clickKeys'
import { isListenPlatform, LISTEN_PLATFORM_NAME, readListenLinks } from '@/modules/profile/lib/listenOn'
import { readSupportMethods, SUPPORT_BRAND } from '@/modules/profile/lib/support'

export interface ClickStatRow {
  event_type: string
  module_id: string | null
  item_key: string | null
  taps: number
  visitors: number
}

export interface ClickStats {
  visits: number
  items: ClickStatRow[]
}

export interface ClickModule {
  id: string
  type: string
  title: string | null
  content: Record<string, unknown>
}

/** Nombres que pone la interfaz (ya traducidos) */
export interface ClickLabels {
  primary: string
  reserve: string
  vcard: string
  itemGone: string
  moduleGone: string
  supportAlias: string
  supportPix: string
}

export interface RankedClick {
  key: string
  label: string
  /** Módulo al que pertenece el botón, cuando el módulo tiene varios */
  module: string | null
  taps: number
  /** toques / visitas del período; null si no hubo visitas */
  ctr: number | null
}

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')
const items = (v: unknown): Record<string, unknown>[] =>
  (Array.isArray(v) ? v : []).filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')

/** Nombre del botón `key` dentro de `m` con su contenido actual; null = ya no está. */
export function clickItemLabel(m: ClickModule, key: string, labels: ClickLabels, projectTitles?: ReadonlyMap<string, string>): string | null {
  const c = m.content ?? {}
  switch (m.type) {
    case 'link_group':
    case 'cards': {
      const hit = items(c.items).find(i => urlKey(i.url) === key)
      return hit ? str(hit.title) || str(hit.url) : null
    }
    case 'support': {
      const hit = readSupportMethods(c.methods).find(x => supportKey(x) === key)
      if (!hit) return null
      if (hit.label) return hit.label
      if (hit.kind === 'alias') return labels.supportAlias
      if (hit.kind === 'pix') return labels.supportPix
      try { return SUPPORT_BRAND[hit.kind] ?? new URL(hit.value).hostname.replace(/^www\./, '') } catch { return hit.value }
    }
    case 'listen_on':
      return isListenPlatform(key) && readListenLinks(c.links).some(l => l.platform === key) ? LISTEN_PLATFORM_NAME[key] : null
    case 'contact':
      if (key === 'whatsapp') return str(c.whatsapp) ? 'WhatsApp' : null
      if (key === 'phone' || key === 'email') return str(c[key]) || null
      return null
    case 'portfolio':
      if (!key.startsWith('p:')) return null
      return projectTitles?.get(key.slice(2)) ?? null
    default:
      return null
  }
}

/**
 * Ranking de botones (más tocados primero) y totales por módulo. Los módulos que ya no existen se juntan en una fila;
 * un botón que ya no está en su módulo se muestra como `itemGone` (uno por módulo).
 */
export function rankClicks(stats: ClickStats, modules: ClickModule[], opts: {
  labels: ClickLabels
  moduleTitle: (m: ClickModule) => string
  projectTitles?: ReadonlyMap<string, string>
}): { items: RankedClick[]; modules: RankedClick[] } {
  const { labels, moduleTitle, projectTitles } = opts
  const ctr = (n: number) => (stats.visits > 0 ? n / stats.visits : null)
  const byItem = new Map<string, Omit<RankedClick, 'ctr'>>()
  const byModule = new Map<string, Omit<RankedClick, 'ctr'>>()
  const add = (map: Map<string, Omit<RankedClick, 'ctr'>>, key: string, label: string, module: string | null, taps: number) => {
    const row = map.get(key)
    if (row) row.taps += taps
    else map.set(key, { key, label, module, taps })
  }

  for (const r of stats.items) {
    const taps = Number(r.taps) || 0
    if (taps <= 0) continue
    if (r.event_type === 'primary_action_click') {
      const reserve = r.item_key === RESERVE_KEY
      add(byItem, reserve ? 'reserve' : 'primary', reserve ? labels.reserve : labels.primary, null, taps)
      continue
    }
    if (r.event_type === 'vcard_download') {
      add(byItem, 'vcard', labels.vcard, null, taps)
      continue
    }
    if (r.event_type !== 'module_click') continue
    const m = r.module_id ? modules.find(x => x.id === r.module_id) : undefined
    if (!m) {
      add(byItem, 'gone', labels.moduleGone, null, taps)
      add(byModule, 'gone', labels.moduleGone, null, taps)
      continue
    }
    const title = moduleTitle(m)
    add(byModule, m.id, title, null, taps)
    if (!r.item_key) {
      add(byItem, m.id, title, null, taps)
      continue
    }
    const label = clickItemLabel(m, r.item_key, labels, projectTitles)
    if (label) add(byItem, `${m.id}:${r.item_key}`, label, title, taps)
    else add(byItem, `${m.id}:gone`, labels.itemGone, title, taps)
  }

  const sorted = (map: Map<string, Omit<RankedClick, 'ctr'>>) =>
    [...map.values()].sort((a, b) => b.taps - a.taps || a.label.localeCompare(b.label)).map(r => ({ ...r, ctr: ctr(r.taps) }))
  return { items: sorted(byItem), modules: sorted(byModule) }
}

/** Ids de proyectos que aparecen en el ranking (para pedir sus nombres sólo si hace falta) */
export function portfolioProjectIds(stats: ClickStats): string[] {
  return stats.items.map(r => r.item_key ?? '').filter(k => k.startsWith('p:')).map(k => k.slice(2))
}
