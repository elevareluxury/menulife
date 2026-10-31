// Crecimiento (panel del equipo): cuentas puras sobre lo que devuelven las RPC admin_growth_* — cambio contra el
// período anterior, embudo y CSV. Nada se inventa: sin base para comparar, null (la pantalla dice "sin datos").
import { csvCell } from '@/modules/studio/lib/subscribersCsv'

export interface Keyed { key: string; users?: number; visits?: number; profiles?: number; pct?: number | null }

export interface GrowthOverview {
  today: string; days: number; accounts: number
  dau: number; wau: number; mau: number; stickiness: number | null
  growth: {
    signups_7d: number; signups_prev_7d: number; signups_30d: number; signups_prev_30d: number
    wau_prev: number; mau_prev: number; published_7d: number; published_prev_7d: number; published_total: number
  }
  daily: { day: string; dau: number; wau: number; mau: number; signups: number; published: number }[]
  monthly: { month: string; signups: number; active: number; published: number; accounts: number }[]
  lifecycle: { new: number; retained: number; resurrected: number; churned: number }
  platforms: Keyed[]; languages: Keyed[]; regions: Keyed[]; timezones: Keyed[]
  areas: { life: number; studio: number }
  visits: { day: string; views: number; visitors: number }[]
}

export interface Cohort { week: string; size: number; weeks: (number | null)[] }

export interface GrowthFunnel {
  days: number
  steps: { key: FunnelStep; users: number }[]
  referrals: { signups: number; referrers: number; publishers_at_start: number; k: number | null; share_of_signups: number | null }
  sources: Keyed[]
  signup_channels: Keyed[]
}

export type FunnelStep = 'signup_started' | 'signed_up' | 'onboarding' | 'published' | 'shared' | 'first_visit' | 'first_message' | 'came_back'

export interface GrowthAdoption {
  days: number; published_profiles: number; active_users: number
  modules: Keyed[]; layouts: Keyed[]; modes: Keyed[]
  life: { key: LifePart; users: number | null }[]
  top_profiles: { handle: string; views: number; visitors: number }[]
}

export type LifePart = 'tasks' | 'captures' | 'habits' | 'money' | 'goals' | 'journal' | 'reviews'

/** % de cambio contra el período anterior; sin nada antes, null (no "+∞ %") */
export function change(current: number, previous: number): number | null {
  if (!previous) return null
  return Math.round(((current - previous) / previous) * 1000) / 10
}

/** % de a con respecto a b (un decimal); sin base, null */
export function pct(part: number, total: number): number | null {
  if (!total) return null
  return Math.round((part / total) * 1000) / 10
}

/**
 * Embudo: el "volvió" no es un paso en cadena (se puede volver sin publicar), así que va aparte. Cada paso lleva el %
 * sobre los registrados y sobre el paso anterior; el paso con la caída más grande se marca para mirarlo primero.
 */
export function funnelRows(steps: GrowthFunnel['steps']) {
  const chain = steps.filter(s => s.key !== 'came_back')
  const base = chain.find(s => s.key === 'signed_up')?.users ?? 0
  const rows = chain.map((s, i) => ({
    ...s,
    ofSignups: s.key === 'signup_started' ? null : pct(s.users, base),
    ofPrevious: i === 0 ? null : pct(s.users, chain[i - 1].users),
    worst: false,
  }))
  let worst = -1
  let worstRate = Infinity
  rows.forEach((r, i) => {
    if (i > 1 && r.ofPrevious !== null && r.ofPrevious < worstRate) { worstRate = r.ofPrevious; worst = i }
  })
  if (worst >= 0) rows[worst].worst = true
  return rows
}

/** CSV para planillas (BOM, fórmulas neutralizadas) */
export function toCsv(header: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [header.map(h => csvCell(h)).join(',')]
  for (const r of rows) lines.push(r.map(v => csvCell(v === null || v === undefined ? '' : String(v))).join(','))
  return String.fromCharCode(0xfeff) + lines.join('\r\n') + '\r\n'
}

/** Continente/zona de una zona horaria IANA ("America/Argentina/Buenos_Aires" → "America") */
export const REGIONS = ['America', 'Europe', 'Asia', 'Africa', 'Australia', 'Pacific', 'Atlantic', 'Indian', 'Antarctica'] as const
export type Region = typeof REGIONS[number]

/** Nombre corto de una zona horaria para mostrar ("America/Argentina/Buenos_Aires" → "Buenos Aires") */
export function cityOf(tz: string): string {
  const last = tz.split('/').pop() ?? tz
  return last.replace(/_/g, ' ')
}
