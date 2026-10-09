// Resultados de la semana (V1 · etapa 08): sólo datos reales de la analítica existente (profile_stats_daily,
// profile_traffic_sources y los mensajes). Sin datos no hay frase: nunca se inventa un número.
import type { DailyStat } from './studioTypes'
import { groupSources, type SourceGroup, type SourceKey, type SourceRow } from './trafficSources'

export interface WeeklySummary {
  visits: number
  primary: number
  contacts: number
  messages: number
  /** Canales con visitas, de mayor a menor (hasta 5) */
  sources: SourceGroup[]
  /** La frase destacada: el canal que más trajo (sin contar "directo"), el QR, o el total */
  highlight: { kind: 'source'; key: SourceKey; visits: number } | { kind: 'scan'; visits: number } | { kind: 'total'; visits: number } | null
}

const sum = (stats: DailyStat[], type: string) => stats.filter(s => s.event_type === type).reduce((a, s) => a + s.events, 0)

export function weeklySummary(stats: DailyStat[], sourceRows: SourceRow[], messages: number): WeeklySummary {
  const visits = sum(stats, 'view')
  const sources = groupSources(sourceRows)
  const top = sources.find(s => s.key !== 'direct' && s.key !== 'other')
  const highlight: WeeklySummary['highlight'] = top
    ? (top.key === 'qr' || top.key === 'card' ? { kind: 'scan', visits: top.visits } : { kind: 'source', key: top.key, visits: top.visits })
    : visits > 0 ? { kind: 'total', visits } : null
  return {
    visits,
    primary: sum(stats, 'primary_action_click'),
    contacts: sum(stats, 'vcard_download'),
    messages,
    sources: sources.slice(0, 5),
    highlight,
  }
}
