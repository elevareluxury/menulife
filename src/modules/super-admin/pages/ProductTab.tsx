import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAdminT, type AdminDict } from '@/i18n/app/admin'
import { useAdminFormat } from '../lib/adminFormat'

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
function duration(seconds: number | null, tp: AdminDict['product'], num: (n: number, digits?: number) => string): string {
  if (seconds == null) return '—'
  if (seconds < 90) return tp.seconds(Math.round(seconds))
  if (seconds < 5400) return tp.minutes(Math.round(seconds / 60))
  if (seconds < 172800) return tp.hours(num(Math.round(seconds / 360) / 10, 1))
  return tp.days(num(Math.round(seconds / 8640) / 10, 1))
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
  const t = useAdminT()
  const tp = t.product
  const { date, number } = useAdminFormat()
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
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: TEXT }}>{tp.title}</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13.5, color: MUTED }}>
          {tp.intro}
        </p>
      </header>

      <div role="radiogroup" aria-label={tp.period} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {PERIODS.map(p => (
          <button key={p} type="button" role="radio" aria-checked={days === p} onClick={() => setDays(p)}
            style={{ ...BTN, ...(days === p ? { background: TEXT, color: '#0A0D12' } : {}) }}>
            {tp.lastDays(p)}
          </button>
        ))}
      </div>

      {loading ? <p style={{ color: MUTED }} role="status">{t.common.loading}</p>
        : result?.failed || !m ? <p style={{ color: '#FCA5A5' }} role="alert">{tp.loadFailed}</p>
          : (
            <>
              <section aria-label="Identity" style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                <Kpi label={tp.timeToPublish} value={duration(m.publish_median_seconds, tp, number)} sub={tp.medianSinceSignup} />
                <Kpi label={tp.published} value={pct(m.published, m.signups)} sub={tp.publishedSub(m.published, m.signups)} />
                <Kpi label={tp.referralSignups} value={pct(m.referral_signups, m.signups)} sub={tp.referralSub(m.referral_signups)} />
                <Kpi label={tp.events} value={number(m.events_total)} sub={tp.inPeriod} />
              </section>

              <section aria-label="Life OS" style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                <Kpi label={tp.habit4} value={pct(m.habit4_users, m.week_life_users)}
                  sub={tp.habit4Sub(m.habit4_users, m.week_life_users)} />
                <Kpi label={tp.returnRate} value={pct(m.returned_users, m.period_life_users)}
                  sub={tp.returnSub(m.return_median_days == null ? '—' : tp.days(number(m.return_median_days, 1)))} />
              </section>

              <section style={CARD} aria-labelledby="pt-retention">
                <h2 id="pt-retention" style={{ margin: '0 0 4px', fontSize: 16, color: TEXT }}>{tp.retentionTitle}</h2>
                <p style={{ margin: '0 0 10px', fontSize: 12.5, color: MUTED }}>
                  {tp.retentionHelp}
                </p>
                {m.retention.length === 0 ? <p style={{ color: MUTED, fontSize: 13.5, margin: 0 }}>{tp.noLifeUse}</p> : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr><th style={TH}>{tp.week}</th><th style={TH}>{tp.people}</th><th style={TH}>{tp.day1}</th><th style={TH}>{tp.week1}</th><th style={TH}>{tp.month1}</th></tr></thead>
                    <tbody>
                      {m.retention.map(c => (
                        <tr key={c.week}>
                          <td style={TD}>{date(`${c.week}T12:00:00`)}</td>
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
                <h2 id="pt-refs" style={{ margin: '0 0 10px', fontSize: 16, color: TEXT }}>{tp.referralsTitle}</h2>
                {m.referrals.length === 0 ? <p style={{ color: MUTED, fontSize: 13.5, margin: 0 }}>{tp.noReferrals}</p> : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr><th style={TH}>{tp.profile}</th><th style={TH}>{tp.signups}</th></tr></thead>
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
