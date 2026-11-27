// Fotos del panel calculadas cada hora (20261207000001): qué foto usa cada pantalla y de cuándo es la más vieja.

export interface SnapshotKey { name: string; days: number }
export interface SnapshotInfo {
  name: string; days: number; computed_at: string | null; duration_ms: number | null; error: string | null; error_at: string | null
}

/** Las fotos de cada pantalla (los mismos períodos que pide y que la base precalcula en mycen_admin_snapshot_plan) */
export const SNAPSHOTS = {
  home: [{ name: 'overview', days: 30 }],
  growth: (days: number): SnapshotKey[] => [
    { name: 'growth_overview', days }, { name: 'growth_retention', days: 0 },
    { name: 'growth_funnel', days: Math.min(days, 90) }, { name: 'growth_adoption', days: Math.min(days, 90) },
  ],
  product: (days: number): SnapshotKey[] => [{ name: 'product_metrics', days }, { name: 'signup_sources', days }],
  status: [{ name: 'status_heavy', days: 0 }],
} as const

/**
 * Minutos desde la foto más vieja de las pedidas (null si alguna todavía no se calculó: la pantalla la calculó en vivo)
 * y si alguna tiene un error más nuevo que su foto.
 */
export function freshnessOf(info: SnapshotInfo[], keys: readonly SnapshotKey[], now: number): { minutes: number | null; error: boolean } {
  const rows = keys.map(k => info.find(i => i.name === k.name && i.days === k.days))
  if (!rows.length || rows.some(r => !r?.computed_at)) {
    return { minutes: null, error: rows.some(r => !!r?.error) }
  }
  const oldest = Math.min(...rows.map(r => Date.parse(r!.computed_at!)))
  const error = rows.some(r => !!r!.error && !!r!.error_at && Date.parse(r!.error_at) > Date.parse(r!.computed_at!))
  return { minutes: Math.max(0, Math.floor((now - oldest) / 60_000)), error }
}
