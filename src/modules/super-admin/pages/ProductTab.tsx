import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// Métricas de producto propias (V1 · etapa 14): si la V1 cumple su propósito (ROADMAP, "Métricas de éxito").
// Todo sale de product_events por la RPC admin_product_metrics (sólo super-admins). Sin terceros ni datos personales:
// los eventos no guardan contenido.

type Rpc = { rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }> }
const rpc = (fn: string, args?: Record<string, unknown>) => (supabase as unknown as Rpc).rpc(fn, args)

interface Cohort { week: string; users: number; d1: number | null; d7: number | null; d30: number | null }
export interface ProductMetrics {
  days: number
  events_total: number
  signups: number
  published: number
  publish_median_seconds: number | null
  retention: Cohort[]
  week_life_users: number
  habit4_users: number
  period_life_users: number
  returned_users: number
  return_median_days: number | null
  referral_signups: number
  referrals: Array<{ ref: string; signups: number }>
}

const PERIODS = [30, 90, 365] as const

const TEXT = '#F5F7FA'
const MUTED = '#98A2B3'
const CARD: React.CSSProperties = {
  background: '#0A0D12', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '18px 20px',
}
const BTN: React.CSSProperties = {
  padding: '9px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)',
  color: TEXT, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', minHeight: 40,
}
const TH: React.CSSProperties = { textAlign: 'start', padding: '8px 10px', color: MUTED, fontSize: 12, fontWeight: 700 }
const TD: React.CSSProperties = { padding: '8px 10px', color: TEXT, fontSize: 13.5, borderTop: '1px solid rgba(255,255,255,0.06)' }

const pct = (n: number, d: number) => (d > 0 ? `${Math.round((n / d) * 100)} %` : '—')
function duration(seconds: number | null): string {
  if (seconds == null) return '—'
  if (seconds < 90) return `${Math.round(seconds)} s`
  if (seconds < 5400) return `${Math.round(seconds / 60)} min`
  if (seconds < 172800) return `${(seconds / 3600).toFixed(1)} h`
  return `${(seconds / 86400).toFixed(1)} días`
}
const cell = (n: number | null, users: number) => (n == null ? '…' : pct(n, users))

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div style={CARD}>
      <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color: TEXT }}>{value}</p>
      <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 600, color: TEXT }}>{label}</p>
      <p style={{ margin: '2px 0 0', fontSize: 12, color: MUTED }}>{sub}</p>
    </div>
  )
}

export function ProductTab() {
  const [days, setDays] = useState<(typeof PERIODS)[number]>(90)
  const [result, setResult] = useState<{ days: number; data: ProductMetrics | null; failed: boolean } | null>(null)

  useEffect(() => {
    let cancelled = false
    rpc('admin_product_metrics', { p_days: days }).then(r => {
      if (!cancelled) setResult({ days, data: r.error ? null : r.data as ProductMetrics, failed: !!r.error })
    })
    return () => { cancelled = true }
  }, [days])

  const loading = !result || result.days !== days
  const m = result?.data

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1100 }}>
      <header>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: TEXT }}>Producto</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13.5, color: MUTED }}>
          Métricas propias de la V1 (sin terceros). Los eventos no guardan contenido de tareas, hábitos ni mensajes.
        </p>
      </header>

      <div role="radiogroup" aria-label="Período" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {PERIODS.map(p => (
          <button key={p} type="button" role="radio" aria-checked={days === p} onClick={() => setDays(p)}
            style={{ ...BTN, ...(days === p ? { background: TEXT, color: '#0A0D12' } : {}) }}>
            Últimos {p} días
          </button>
        ))}
      </div>

      {loading ? <p style={{ color: MUTED }} role="status">Cargando…</p>
        : result?.failed || !m ? <p style={{ color: '#FCA5A5' }} role="alert">No se pudieron cargar las métricas. Revisá que la migración de la etapa 14 esté aplicada.</p>
          : (
            <>
              <section aria-label="Identity" style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                <Kpi label="Tiempo hasta publicar" value={duration(m.publish_median_seconds)} sub="Mediana, desde el registro" />
                <Kpi label="Cuentas publicadas" value={pct(m.published, m.signups)} sub={`${m.published} de ${m.signups} registros del período`} />
                <Kpi label="Registros por referido" value={pct(m.referral_signups, m.signups)} sub={`${m.referral_signups} llegaron desde un perfil`} />
                <Kpi label="Eventos" value={m.events_total.toLocaleString('es-AR')} sub="En el período" />
              </section>

              <section aria-label="Life OS" style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                <Kpi label="Hábito 4+ días por semana" value={pct(m.habit4_users, m.week_life_users)}
                  sub={`${m.habit4_users} de ${m.week_life_users} activos en Life OS (últimos 7 días)`} />
                <Kpi label="Tasa de regreso" value={pct(m.returned_users, m.period_life_users)}
                  sub={`Volvieron tras 3+ días · mediana ${m.return_median_days == null ? '—' : `${m.return_median_days} días`}`} />
              </section>

              <section style={CARD} aria-labelledby="pt-retention">
                <h2 id="pt-retention" style={{ margin: '0 0 4px', fontSize: 16, color: TEXT }}>Retención de Life OS por cohorte semanal</h2>
                <p style={{ margin: '0 0 10px', fontSize: 12.5, color: MUTED }}>
                  Cohorte = semana del primer uso. Día 1 = volvió al día siguiente; semana 1 = días 7 a 13; mes 1 = días 30 a 36.
                  "…" = la cohorte todavía no llegó a ese día.
                </p>
                {m.retention.length === 0 ? <p style={{ color: MUTED, fontSize: 13.5, margin: 0 }}>Todavía no hay uso de Life OS.</p> : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr><th style={TH}>Semana</th><th style={TH}>Personas</th><th style={TH}>Día 1</th><th style={TH}>Semana 1</th><th style={TH}>Mes 1</th></tr></thead>
                    <tbody>
                      {m.retention.map(c => (
                        <tr key={c.week}>
                          <td style={TD}>{new Date(`${c.week}T12:00:00`).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                          <td style={TD}>{c.users}</td>
                          <td style={TD}>{cell(c.d1, c.users)}</td>
                          <td style={TD}>{cell(c.d7, c.users)}</td>
                          <td style={TD}>{cell(c.d30, c.users)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>

              <section style={CARD} aria-labelledby="pt-refs">
                <h2 id="pt-refs" style={{ margin: '0 0 10px', fontSize: 16, color: TEXT }}>Registros por referido</h2>
                {m.referrals.length === 0 ? <p style={{ color: MUTED, fontSize: 13.5, margin: 0 }}>Nadie llegó desde un perfil en este período.</p> : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr><th style={TH}>Perfil</th><th style={TH}>Registros</th></tr></thead>
                    <tbody>
                      {m.referrals.map(r => <tr key={r.ref}><td style={TD}>/{r.ref}</td><td style={TD}>{r.signups}</td></tr>)}
                    </tbody>
                  </table>
                )}
              </section>
            </>
          )}
    </div>
  )
}
