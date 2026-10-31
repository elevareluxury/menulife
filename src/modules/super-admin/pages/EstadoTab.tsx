import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { publicRpc } from '@/lib/publicRpc'
import { apiUrl } from '@/lib/platform'
import { useAdminT, type AdminDict } from '@/i18n/app/admin'
import { useAdminFormat } from '../lib/adminFormat'
import { adminRpc, BTN, CARD, INPUT, MUTED, OK_COLOR, TEXT } from '../lib/adminRpc'
import {
  evaluate, overall, selfcheckLevel,
  type Finding, type HealthResult, type Level, type ProfileProbe, type Row, type SystemStatus,
} from '../lib/systemStatus'

// "Estado del sistema" (auditoría del panel, PR 1): un semáforo general y una fila por chequeo. Lo de la base viene
// de admin_system_status / admin_security_selfcheck; lo del navegador y del servidor, de /api/health (con ?deep=1 y
// la sesión del super-admin) y de la página pública de un perfil. Se revisa solo cada minuto con la pestaña visible.

const WARN = '#F5B544'
const BAD = '#F87171'
const LEVEL_COLOR: Record<Level, string> = { ok: OK_COLOR, warn: WARN, bad: BAD, unknown: MUTED }
const REFRESH_MS = 60_000
const PANEL_RELEASE = (import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA as string | undefined)?.slice(0, 7) ?? null
const INCIDENTS_URL = 'https://github.com/elevareluxury/menulife/blob/main/docs/lanzamiento/incidentes.md'
const PROVIDERS = [
  { name: 'Supabase', url: 'https://status.supabase.com' },
  { name: 'Vercel', url: 'https://www.vercel-status.com' },
  { name: 'Resend', url: 'https://resend-status.com' },
  { name: 'Cloudflare', url: 'https://www.cloudflarestatus.com' },
]

interface Snapshot {
  status: SystemStatus | null
  findings: Finding[] | null
  health: HealthResult | null
  profile: ProfileProbe | null
  at: number
}

async function fetchHealth(deep: string | null): Promise<HealthResult | null> {
  try {
    const headers: Record<string, string> = {}
    if (deep !== null) {
      const { data } = await supabase.auth.getSession()
      if (data.session) headers.authorization = `Bearer ${data.session.access_token}`
    }
    const q = deep === null ? '' : `?deep=1${deep ? `&u=${encodeURIComponent(deep)}` : ''}`
    const started = performance.now()
    const res = await fetch(apiUrl(`/api/health${q}`), { headers, cache: 'no-store' })
    const ms = performance.now() - started
    if (!(res.headers.get('content-type') ?? '').includes('json')) return null
    const body = await res.json() as Omit<HealthResult, 'ms'>
    return { ...body, ms }
  } catch {
    return null
  }
}

async function probeProfile(username: string | null): Promise<ProfileProbe | null> {
  if (!username) return null
  const started = performance.now()
  const { data, error } = await publicRpc('get_public_profile', { p_username: username })
  return { ok: !error && !!data, ms: performance.now() - started }
}

async function snapshot(): Promise<Snapshot> {
  const [st, sc, plain] = await Promise.all([
    Promise.resolve(adminRpc('admin_system_status')),
    Promise.resolve(adminRpc('admin_security_selfcheck')),
    fetchHealth(null),
  ])
  const status = st.error ? null : st.data as SystemStatus
  const probe = status?.probe_username ?? null
  const [deep, profile] = await Promise.all([fetchHealth(probe ?? ''), probeProfile(probe)])
  const health = plain ? { ...plain, checks: deep?.checks } : null
  return {
    status,
    findings: sc.error ? null : (sc.data as { findings: Finding[] }).findings,
    health,
    profile,
    at: Date.now(),
  }
}

export function EstadoTab() {
  const t = useAdminT()
  const s = t.status
  const { dateTime, number } = useAdminFormat()
  const [snap, setSnap] = useState<Snapshot | null>(null)
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)

  const run = useCallback(async () => {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    const next = await snapshot()
    busyRef.current = false
    setBusy(false)
    setSnap(next)
  }, [])

  useEffect(() => {
    void run()
    const id = window.setInterval(() => { if (document.visibilityState === 'visible') void run() }, REFRESH_MS)
    return () => window.clearInterval(id)
  }, [run])

  const rows = snap ? evaluate({ status: snap.status, health: snap.health, profile: snap.profile, panelRelease: PANEL_RELEASE, now: snap.at }) : []
  const security = selfcheckLevel(snap?.findings ?? null)
  const general = snap ? overall(rows, security) : 'unknown'
  const n = (v: unknown) => (typeof v === 'number' ? number(v) : String(v ?? '—'))

  return (
    <div style={{ maxWidth: 1000 }}>
      <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 800, color: TEXT }}>{s.title}</h1>
      <p style={{ margin: '0 0 14px', fontSize: 13.5, color: MUTED }}>{s.intro}</p>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <button type="button" style={BTN} onClick={() => void run()} disabled={busy} aria-busy={busy}>
          {busy ? s.checking : s.refresh}
        </button>
        {snap && <span style={{ fontSize: 13, color: MUTED }}>{s.lastCheck(dateTime(new Date(snap.at).toISOString()))}</span>}
        <a href={INCIDENTS_URL} target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 13.5, color: TEXT, textDecoration: 'underline', minHeight: 44, display: 'inline-flex', alignItems: 'center' }}>
          {s.incidents}
        </a>
      </div>

      <section style={{ ...CARD, display: 'flex', alignItems: 'center', gap: 14 }} aria-live="polite" data-testid="status-overall" data-level={general}>
        <Dot level={general} size={18} />
        <p style={{ margin: 0, fontSize: 19, fontWeight: 800, color: TEXT }}>{snap ? s.overall[general] : t.common.loading}</p>
      </section>

      {snap && !snap.status && <p role="alert" style={{ color: BAD, fontSize: 14 }}>{s.loadFailed}</p>}
      {snap?.health && !snap.health.checks && <p role="status" style={{ color: WARN, fontSize: 13.5 }}>{s.deepUnavailable}</p>}

      {snap && (
        <ul aria-label={s.title} style={{ ...CARD, listStyle: 'none', padding: '6px 20px' }}>
          {rows.map(r => (
            <li key={r.id} data-testid={`status-row-${r.id}`} data-level={r.level}
              style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <Dot level={r.level} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, display: 'flex', flexWrap: 'wrap', gap: '4px 10px', alignItems: 'baseline' }}>
                  <strong style={{ color: TEXT, fontSize: 14.5 }}>{s.rows[r.id].title}</strong>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: LEVEL_COLOR[r.level] }}>{s.level[r.level]}</span>
                </p>
                {describe(r, s, n).map((line, i) => (
                  <p key={i} style={{ margin: '3px 0 0', fontSize: 13.5, color: MUTED, overflowWrap: 'anywhere' }}>{line}</p>
                ))}
                {r.id === 'backup' && snap.status && <BackupMark s={s} onDone={run} />}
              </div>
            </li>
          ))}
        </ul>
      )}

      {snap?.status && <Details status={snap.status} s={s} n={n} dateTime={dateTime} />}

      <section style={CARD} aria-labelledby="sec-title" data-testid="status-security" data-level={security}>
        <h2 id="sec-title" style={{ margin: '0 0 4px', fontSize: 16, color: TEXT, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Dot level={security} />{s.security.title}
        </h2>
        <p style={{ margin: '0 0 10px', fontSize: 13, color: MUTED }}>{s.security.intro}</p>
        {!snap ? null : !snap.findings ? <p role="alert" style={{ color: BAD, fontSize: 14 }}>{s.loadFailed}</p> : (
          <Findings findings={snap.findings} s={s} />
        )}
      </section>

      <section style={CARD} aria-labelledby="prov-title">
        <h2 id="prov-title" style={{ margin: '0 0 4px', fontSize: 16, color: TEXT }}>{s.providers.title}</h2>
        <p style={{ margin: '0 0 8px', fontSize: 13, color: MUTED }}>{s.providers.intro}</p>
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: '0 18px' }}>
          {PROVIDERS.map(p => (
            <li key={p.name}>
              <a href={p.url} target="_blank" rel="noopener noreferrer"
                style={{ color: TEXT, fontSize: 14, textDecoration: 'underline', minHeight: 44, display: 'inline-flex', alignItems: 'center' }}>{p.name}</a>
            </li>
          ))}
        </ul>
      </section>

      {snap?.status && <Settings status={snap.status} s={s} onSaved={run} />}
    </div>
  )
}

type S = AdminDict['status']
type Num = (v: unknown) => string

function Dot({ level, size = 12 }: { level: Level; size?: number }) {
  return <span aria-hidden="true" style={{ flexShrink: 0, width: size, height: size, marginTop: size < 16 ? 4 : 0, borderRadius: 999, background: LEVEL_COLOR[level] }} />
}

/** Las líneas de texto de cada fila, con los números en el idioma del panel */
function describe(r: Row, s: S, n: Num): string[] {
  const f = r.facts
  const rows = s.rows
  switch (r.id) {
    case 'database': return [f.up === 'yes' ? rows.database.ok(n(f.ms)) : rows.database.down]
    case 'release':
      return [r.level === 'unknown' ? rows.release.unknown : r.level === 'ok' ? rows.release.same(String(f.live)) : rows.release.differ(String(f.live), String(f.panel))]
    case 'profile':
      return [!f.username ? rows.profile.none : r.level === 'bad' ? rows.profile.failed(String(f.username)) : f.ms === null ? '' : rows.profile.ok(String(f.username), n(f.ms))].filter(Boolean)
    case 'preview':
      return r.level === 'unknown' ? [] : [r.level === 'bad' ? rows.preview.failed(String(f.status ?? 0)) : rows.preview.ok(n(f.ms))]
    case 'sitemap':
      return r.level === 'unknown' ? [] : [r.level === 'bad' ? rows.sitemap.failed : r.level === 'warn' ? rows.sitemap.short(n(f.urls), n(f.expected)) : rows.sitemap.ok(n(f.urls))]
    case 'media': return r.level === 'unknown' ? [] : [r.level === 'bad' ? rows.media.failed : rows.media.ok]
    case 'calendar': return r.level === 'unknown' ? [] : [r.level === 'bad' ? rows.calendar.failed(String(f.status ?? 0)) : rows.calendar.ok]
    case 'reminders': {
      if (f.state === 'noCron') return [rows.reminders.noCron]
      if (f.state === 'notScheduled') return [rows.reminders.notScheduled]
      if (f.state === 'paused') return [rows.reminders.paused]
      const out = [r.level === 'bad' && f.minutes !== null && Number(f.minutes) <= 15 ? rows.reminders.failed
        : r.level === 'ok' ? rows.reminders.ok(n(f.minutes), n(f.push)) : rows.reminders.late(n(f.minutes))]
      if (Number(f.failed) > 0) out.push(rows.reminders.failures(n(f.failed)))
      if (Number(f.serverErrors) > 0) out.push(rows.reminders.serverErrors(n(f.serverErrors)))
      return out
    }
    case 'errors':
      if (r.level === 'unknown') return []
      return [rows.errors.today(n(f.today), n(f.base)), ...(Number(f.fresh) > 0 ? [rows.errors.fresh(n(f.fresh), n(f.topNew))] : [])]
    case 'signups':
      if (r.level === 'unknown') return []
      return [rows.signups.summary(n(f.started_1h), n(f.completed_1h)), rows.signups.day(n(f.started_24h), n(f.completed_24h))]
    case 'size':
      if (r.level === 'unknown') return []
      return [rows.size.summary(n(f.mb), n(f.limitMb), n(f.pct)), rows.size.connections(n(f.connections), n(f.max))]
    case 'slow': return [r.level === 'unknown' ? rows.slow.none : rows.slow.summary(n(f.ms))]
    case 'storage': return [r.level === 'unknown' ? rows.storage.none : rows.storage.summary(n(f.mb), n(f.limitMb), n(f.pct))]
    case 'backup': return [f.days === null ? rows.backup.never : rows.backup.ok(n(f.days)), rows.backup.help]
  }
}

function BackupMark({ s, onDone }: { s: S; onDone: () => void }) {
  const [busy, setBusy] = useState(false)
  return (
    <button type="button" style={{ ...BTN, marginTop: 8 }} disabled={busy} onClick={async () => {
      setBusy(true)
      await adminRpc('admin_set_status_setting', { p_key: 'backup_checked_at', p_value: 'now' })
      setBusy(false)
      onDone()
    }}>{s.rows.backup.mark}</button>
  )
}

const TD: React.CSSProperties = { color: TEXT, fontSize: 13, padding: '6px 8px', verticalAlign: 'top', overflowWrap: 'anywhere' }

function Details({ status, s, n, dateTime }: { status: SystemStatus; s: S; n: Num; dateTime: (iso: string) => string }) {
  const mb = (bytes: number) => `${n(Math.round((bytes / 1024 / 1024) * 10) / 10)} MB`
  const block = (title: string, children: React.ReactNode) => (
    <div style={{ marginTop: 12 }}>
      <h3 style={{ margin: '0 0 6px', fontSize: 14, color: TEXT }}>{title}</h3>
      {children}
    </div>
  )
  return (
    <details style={CARD}>
      <summary style={{ cursor: 'pointer', color: TEXT, fontWeight: 700, fontSize: 14.5, minHeight: 44, display: 'flex', alignItems: 'center' }}>{s.details}</summary>
      {block(s.tablesTitle, (
        <ul style={{ margin: 0, paddingInlineStart: 18 }}>
          {status.tables.map(x => <li key={x.name} style={TD}>{x.name} · {mb(x.bytes)} · {s.approxRows(n(x.rows))}</li>)}
        </ul>
      ))}
      {status.storage && block(s.bucketsTitle, (
        <ul style={{ margin: 0, paddingInlineStart: 18 }}>
          {status.storage.map(b => <li key={b.bucket} style={TD}>{b.bucket} · {mb(b.bytes)} · {s.files(n(b.files))}</li>)}
        </ul>
      ))}
      {status.cron && status.cron.length > 0 && block(s.cronTitle, (
        <ul style={{ margin: 0, paddingInlineStart: 18 }}>
          {status.cron.map(j => (
            <li key={j.name} style={TD}>
              {j.name} · <code>{j.schedule}</code> · {!j.active ? s.paused
                : s.cronState[(j.last_status ?? 'none') as keyof S['cronState']] ?? j.last_status}
              {j.last_start ? ` · ${dateTime(j.last_start)}` : ''}
            </li>
          ))}
        </ul>
      ))}
      {status.slow_queries && status.slow_queries.length > 0 && block(s.slowTitle, (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <tbody>
              {status.slow_queries.map((q, i) => (
                <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ ...TD, fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>{q.query}</td>
                  <td style={{ ...TD, whiteSpace: 'nowrap' }}>{n(q.mean_ms)} ms</td>
                  <td style={{ ...TD, whiteSpace: 'nowrap', color: MUTED }}>{s.calls(n(q.calls))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      {status.new_errors.length > 0 && block(s.newErrorsTitle, (
        <ul style={{ margin: 0, paddingInlineStart: 18 }}>
          {status.new_errors.map(e => (
            <li key={e.id} style={TD}>{e.message} <span style={{ color: MUTED }}>· {e.area} · {s.people(n(e.people))}</span></li>
          ))}
        </ul>
      ))}
    </details>
  )
}

function Findings({ findings, s }: { findings: Finding[]; s: S }) {
  const problems = findings.filter(f => f.level !== 'info')
  const info = findings.filter(f => f.level === 'info')
  const group = (list: Finding[]) => {
    const rules = [...new Set(list.map(f => f.rule))]
    return (
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 10 }}>
        {rules.map(rule => {
          const items = list.filter(f => f.rule === rule)
          const level: Level = items[0].level === 'red' ? 'bad' : items[0].level === 'yellow' ? 'warn' : 'unknown'
          return (
            <li key={rule} data-testid={`finding-${rule}`}>
              <p style={{ margin: 0, display: 'flex', gap: 10, fontSize: 13.5, color: TEXT }}>
                <Dot level={level} /><span>{s.security.rules[rule]}</span>
              </p>
              <p style={{ margin: '4px 0 0', paddingInlineStart: 22, fontSize: 12.5, color: MUTED, fontFamily: 'ui-monospace, monospace', overflowWrap: 'anywhere' }}>
                {items.map(i => i.object).join(' · ')}
              </p>
            </li>
          )
        })}
      </ul>
    )
  }
  return (
    <>
      {problems.length === 0 ? <p style={{ margin: 0, color: OK_COLOR, fontSize: 14 }}>{s.security.allGood}</p> : group(problems)}
      {info.length > 0 && (
        <details style={{ marginTop: 12 }}>
          <summary style={{ cursor: 'pointer', color: MUTED, fontSize: 13.5, minHeight: 44, display: 'flex', alignItems: 'center' }}>
            {s.security.infoTitle} ({info.length})
          </summary>
          {group(info)}
        </details>
      )}
    </>
  )
}

function Settings({ status, s, onSaved }: { status: SystemStatus; s: S; onSaved: () => void }) {
  const [values, setValues] = useState({
    probe_username: status.settings.probe_username ?? '',
    db_limit_mb: status.settings.db_limit_mb ?? '',
    storage_limit_mb: status.settings.storage_limit_mb ?? '',
  })
  const [msg, setMsg] = useState<'saved' | 'invalid' | null>(null)
  const [busy, setBusy] = useState(false)
  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    for (const [key, value] of Object.entries(values)) {
      if ((status.settings[key as keyof typeof values] ?? '') === value) continue
      const { error } = await adminRpc('admin_set_status_setting', { p_key: key, p_value: value })
      if (error) { setBusy(false); setMsg('invalid'); return }
    }
    setBusy(false)
    setMsg('saved')
    onSaved()
  }
  const field = (key: keyof typeof values, label: string, help: string, numeric = false) => (
    <label style={{ display: 'grid', gap: 4, fontSize: 13, color: MUTED }}>
      <span style={{ color: TEXT, fontWeight: 600 }}>{label}</span>
      <input style={INPUT} value={values[key]} inputMode={numeric ? 'numeric' : undefined} autoCapitalize="off" spellCheck={false}
        onChange={e => setValues(v => ({ ...v, [key]: e.target.value }))} />
      <span>{help}</span>
    </label>
  )
  return (
    <form style={CARD} onSubmit={save} aria-labelledby="set-title">
      <h2 id="set-title" style={{ margin: '0 0 10px', fontSize: 16, color: TEXT }}>{s.settings.title}</h2>
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {field('probe_username', s.settings.probe, s.settings.probeHelp)}
        {field('db_limit_mb', s.settings.dbLimit, s.settings.limitHelp, true)}
        {field('storage_limit_mb', s.settings.storageLimit, s.settings.limitHelp, true)}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
        <button type="submit" style={BTN} disabled={busy}>{s.settings.save}</button>
        <span role="status" style={{ fontSize: 13, color: msg === 'invalid' ? BAD : OK_COLOR }}>
          {msg === 'saved' ? s.settings.saved : msg === 'invalid' ? s.settings.invalid : ''}
        </span>
      </div>
    </form>
  )
}
