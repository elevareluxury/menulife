// Módulos programados (Identity Fase 7): config.show_from / config.show_until en ISO 8601.
// Misma regla que mycen_module_live en la base: fechas inválidas se ignoran; sin fechas = siempre.

export type ScheduleState = 'always' | 'upcoming' | 'live' | 'ended'

export interface ModuleSchedule {
  from: Date | null
  until: Date | null
}

function parse(v: unknown): Date | null {
  if (typeof v !== 'string' || !v.trim()) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

export function moduleSchedule(config: Record<string, unknown> | null | undefined): ModuleSchedule {
  return { from: parse(config?.show_from), until: parse(config?.show_until) }
}

export function scheduleState(config: Record<string, unknown> | null | undefined, now = Date.now()): ScheduleState {
  const { from, until } = moduleSchedule(config)
  if (!from && !until) return 'always'
  if (from && from.getTime() > now) return 'upcoming'
  if (until && until.getTime() <= now) return 'ended'
  return 'live'
}

/** ¿Lo ve un visitante ahora? */
export function isModuleLive(config: Record<string, unknown> | null | undefined, now = Date.now()): boolean {
  const s = scheduleState(config, now)
  return s === 'always' || s === 'live'
}
