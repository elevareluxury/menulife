// "Estado del sistema" (panel del equipo): reglas puras que convierten lo medido en un semáforo por fila.
// La pantalla (EstadoTab) pone los textos; acá sólo hay números y umbrales (tests en tests/unit/systemStatus.test.ts).

export type Level = 'ok' | 'warn' | 'bad' | 'unknown'

export type DeepCheckId = 'og' | 'og_image' | 'sitemap' | 'youtube_latest' | 'media_cover' | 'calendar'
export interface DeepCheck { id: DeepCheckId; ok: boolean; status: number; ms: number; count?: number }

/** Lo que devuelve /api/health (con ?deep=1, `checks`); `ms` = ida y vuelta medida en el navegador */
export interface HealthResult { ok: boolean; db: string; release: string | null; ms: number; checks?: DeepCheck[] }

/** Prueba del perfil público (get_public_profile sin sesión) */
export interface ProfileProbe { ok: boolean; ms: number }

export interface CronJob { name: string; schedule: string; active: boolean; last_start: string | null; last_status: string | null; failed_24h: number }

export interface SystemStatus {
  checked_at: string
  settings: Partial<Record<'probe_username' | 'backup_checked_at' | 'db_limit_mb' | 'storage_limit_mb', string>>
  probe_username: string | null
  db: { bytes: number; connections: number; max_connections: number }
  tables: { name: string; bytes: number; rows: number }[]
  storage: { bucket: string; files: number; bytes: number }[] | null
  cron: CronJob[] | null
  net: { ok: number; client: number; server: number; failed: number } | null
  slow_queries: { query: string; calls: number; mean_ms: number; total_ms: number }[] | null
  errors_by_day: { day: string; people: number }[]
  new_errors: { id: string; message: string; area: string; release: string | null; first_seen: string; people: number }[]
  signups: { started_1h: number; completed_1h: number; started_24h: number; completed_24h: number }
  push_shown_1h: number
  sitemap_paths: number
}

export type FindingRule = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j'
export interface Finding { rule: FindingRule; level: 'red' | 'yellow' | 'info'; object: string }

export type RowId =
  | 'database' | 'release' | 'profile' | 'preview' | 'sitemap' | 'media' | 'calendar' | 'reminders'
  | 'errors' | 'signups' | 'size' | 'slow' | 'storage' | 'backup'

export interface Row { id: RowId; level: Level; facts: Record<string, number | string | null> }

/** Supabase Pro (docs/lanzamiento/salida-web.md): 8 GB de base y 100 GB de archivos; se cambian en los ajustes */
export const DEFAULT_DB_LIMIT_MB = 8 * 1024
export const DEFAULT_STORAGE_LIMIT_MB = 100 * 1024
const MB = 1024 * 1024
const DAY = 86_400_000

const byLatency = (ms: number, warnAt: number, badAt = Infinity): Level => (ms >= badAt ? 'bad' : ms >= warnAt ? 'warn' : 'ok')
const byShare = (share: number): Level => (share > 0.9 ? 'bad' : share > 0.7 ? 'warn' : 'ok')
const worst = (levels: Level[]): Level =>
  levels.includes('bad') ? 'bad' : levels.includes('warn') ? 'warn' : levels.every(l => l === 'unknown') ? 'unknown' : 'ok'

export function median(values: number[]): number {
  if (!values.length) return 0
  const s = [...values].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

export interface Inputs {
  status: SystemStatus | null
  health: HealthResult | null
  profile: ProfileProbe | null
  /** Versión con la que se armó este panel (VITE_VERCEL_GIT_COMMIT_SHA, 7 caracteres) */
  panelRelease: string | null
  now: number
}

export function evaluate({ status: s, health: h, profile, panelRelease, now }: Inputs): Row[] {
  const check = (id: DeepCheckId) => h?.checks?.find(c => c.id === id) ?? null
  const rows: Row[] = []

  // E1 — Base de datos (de punta a punta, desde el navegador)
  rows.push({
    id: 'database',
    level: !h || h.db !== 'ok' ? 'bad' : byLatency(h.ms, 800, 3000),
    facts: { ms: h ? Math.round(h.ms) : null, up: h?.db === 'ok' ? 'yes' : 'no' },
  })

  // E2 — Versión publicada contra la de este panel
  rows.push({
    id: 'release',
    level: !h?.release || !panelRelease ? 'unknown' : h.release === panelRelease ? 'ok' : 'warn',
    facts: { live: h?.release ?? null, panel: panelRelease },
  })

  // E3 — Un perfil público, como lo pide un visitante
  rows.push({
    id: 'profile',
    level: !s?.probe_username || !profile ? 'unknown' : !profile.ok ? 'bad' : byLatency(profile.ms, 1000),
    facts: { username: s?.probe_username ?? null, ms: profile ? Math.round(profile.ms) : null },
  })

  // E4 — Vista previa al compartir (HTML para WhatsApp y su imagen)
  const og = check('og'), ogImg = check('og_image')
  rows.push({
    id: 'preview',
    level: !og || !ogImg ? 'unknown' : !og.ok || !ogImg.ok ? 'bad' : byLatency(Math.max(og.ms, ogImg.ms), 2000),
    facts: { ms: og && ogImg ? Math.max(og.ms, ogImg.ms) : null, status: og && !og.ok ? og.status : ogImg && !ogImg.ok ? ogImg.status : null },
  })

  // E5 — Sitemap: responde y tiene al menos lo que la base dice que es público
  const sm = check('sitemap')
  rows.push({
    id: 'sitemap',
    level: !sm ? 'unknown' : !sm.ok ? 'bad' : s && (sm.count ?? 0) < s.sitemap_paths ? 'warn' : 'ok',
    facts: { urls: sm?.count ?? null, expected: s?.sitemap_paths ?? null },
  })

  // E6 — "Último video" y portadas automáticas (dependen de YouTube y compañía)
  const yt = check('youtube_latest'), cover = check('media_cover')
  rows.push({
    id: 'media',
    level: !yt || !cover ? 'unknown' : !yt.ok || !cover.ok ? 'bad' : byLatency(Math.max(yt.ms, cover.ms), 4000),
    facts: { latest: yt ? (yt.ok ? 'ok' : yt.status) : null, cover: cover ? (cover.ok ? 'ok' : cover.status) : null },
  })

  // E7 — Calendario de tareas (.ics)
  const cal = check('calendar')
  rows.push({ id: 'calendar', level: !cal ? 'unknown' : cal.ok ? 'ok' : 'bad', facts: { status: cal?.status ?? null } })

  // E8 — Recordatorios push: la tarea programada que corre cada minuto
  const job = s?.cron?.find(j => /remind/i.test(j.name)) ?? null
  const minutesAgo = job?.last_start ? Math.round((now - Date.parse(job.last_start)) / 60_000) : null
  let reminders: Level = 'unknown'
  if (job) {
    if (!job.active) reminders = 'warn'
    else if (job.last_status === 'failed' || minutesAgo === null || minutesAgo > 15) reminders = 'bad'
    else if (minutesAgo > 3 || (s?.net?.server ?? 0) > 0 || job.failed_24h > 0) reminders = 'warn'
    else reminders = 'ok'
  }
  rows.push({
    id: 'reminders',
    level: reminders,
    facts: {
      state: !s?.cron ? 'noCron' : !job ? 'notScheduled' : !job.active ? 'paused' : 'scheduled',
      minutes: minutesAgo, failed: job?.failed_24h ?? null, push: s?.push_shown_1h ?? null, serverErrors: s?.net?.server ?? null,
    },
  })

  // E9 — Errores de la app: hoy contra la mediana de los 7 días anteriores; errores nuevos con muchas personas
  if (s) {
    const days = s.errors_by_day
    const today = days[days.length - 1]?.people ?? 0
    const base = Math.max(1, median(days.slice(-8, -1).map(d => d.people)))
    const topNew = Math.max(0, ...s.new_errors.map(e => e.people))
    const level: Level = today > 5 * base || topNew >= 50 ? 'bad' : today > 2 * base || topNew >= 10 ? 'warn' : 'ok'
    rows.push({ id: 'errors', level, facts: { today, base, fresh: s.new_errors.length, topNew } })
  } else rows.push({ id: 'errors', level: 'unknown', facts: {} })

  // E11 — Registros: si se empiezan y no se terminan, algo se rompió (CAPTCHA, Auth, mails)
  if (s) {
    const g = s.signups
    const level: Level =
      (g.started_1h >= 10 && g.completed_1h === 0) || (g.started_24h >= 20 && g.completed_24h === 0) ? 'bad'
        : g.started_24h >= 20 && g.completed_24h / g.started_24h < 0.2 ? 'warn' : 'ok'
    rows.push({ id: 'signups', level, facts: { ...g } })
  } else rows.push({ id: 'signups', level: 'unknown', facts: {} })

  // E12 — Tamaño de la base y conexiones
  if (s) {
    const limit = Number(s.settings.db_limit_mb) || DEFAULT_DB_LIMIT_MB
    const share = s.db.bytes / (limit * MB)
    const conn = s.db.max_connections ? s.db.connections / s.db.max_connections : 0
    rows.push({
      id: 'size', level: worst([byShare(share), byShare(conn)]),
      facts: { mb: Math.round(s.db.bytes / MB), limitMb: limit, pct: Math.round(share * 100), connections: s.db.connections, max: s.db.max_connections },
    })
  } else rows.push({ id: 'size', level: 'unknown', facts: {} })

  // E13 — Consultas lentas (promedio)
  const slowest = s?.slow_queries?.length ? Math.max(...s.slow_queries.map(q => q.mean_ms)) : s?.slow_queries ? 0 : null
  rows.push({
    id: 'slow',
    level: slowest === null ? 'unknown' : byLatency(slowest, 500, 2000),
    facts: { ms: slowest === null ? null : Math.round(slowest) },
  })

  // E14 — Archivos (Storage)
  if (s?.storage) {
    const limit = Number(s.settings.storage_limit_mb) || DEFAULT_STORAGE_LIMIT_MB
    const bytes = s.storage.reduce((n, b) => n + b.bytes, 0)
    const share = bytes / (limit * MB)
    rows.push({ id: 'storage', level: byShare(share), facts: { mb: Math.round(bytes / MB), limitMb: limit, pct: Math.round(share * 100) } })
  } else rows.push({ id: 'storage', level: 'unknown', facts: {} })

  // E16 — Copias de seguridad: cuándo se revisó por última vez (no se puede consultar por SQL)
  const checkedAt = s?.settings.backup_checked_at ?? null
  const backupDays = checkedAt ? Math.floor((now - Date.parse(checkedAt)) / DAY) : null
  rows.push({
    id: 'backup',
    level: !s ? 'unknown' : backupDays === null ? 'warn' : backupDays > 90 ? 'bad' : backupDays > 30 ? 'warn' : 'ok',
    facts: { days: backupDays, at: checkedAt },
  })

  return rows
}

/** Semáforo de las reglas del autochequeo: rojo = algo expuesto; amarillo = a mejorar; info no cambia el color */
export function selfcheckLevel(findings: Finding[] | null): Level {
  if (!findings) return 'unknown'
  if (findings.some(f => f.level === 'red')) return 'bad'
  if (findings.some(f => f.level === 'yellow')) return 'warn'
  return 'ok'
}

export function overall(rows: Row[], security: Level): Level {
  return worst([...rows.map(r => r.level), security])
}
